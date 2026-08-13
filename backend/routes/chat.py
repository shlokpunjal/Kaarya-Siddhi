# routes/chat.py
#
# Admin <-> Employee 1:1 chat only. Same enforcement model as the rest
# of the backend: the service-role Supabase client bypasses RLS, so
# every access check happens here in Python, not in Postgres policies.
#
# The core invariant every endpoint leans on: two users are allowed to
# talk to each other iff they have different roles (one admin, one
# employee) AND share the same workspace_id (i.e. the employee's
# connection request to that admin was accepted — see
# routes/connections.py). That's re-checked on every write, not just
# on conversation creation, since workspace_id can change later
# (disconnect-admin clears it).

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from supabase_client import supabase, run_db
from auth_utils import get_current_user
from services import normalize_email
from notify_utils import push_only
from schemas import SendMessageRequest, ReactToMessageRequest, ClearChatRequest

router = APIRouter()

MESSAGE_PAGE_SIZE = 30


# ---------------------------------------------------------------- helpers

async def _get_own_row(email: str) -> dict:
    result = await run_db(
        supabase.table("users")
        .select("id, name, email, role, workspace_id, profile_pic_url, last_seen_at")
        .eq("email", email)
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return result.data[0]


async def _get_other_party(own_row: dict, other_email: str) -> dict:
    """Resolves `other_email` to a user row and enforces the
    admin<->employee-in-same-workspace rule. Raises 403/404 otherwise."""
    other_email = normalize_email(other_email)

    other = await run_db(
        supabase.table("users")
        .select("id, name, email, role, workspace_id, profile_pic_url, last_seen_at")
        .eq("email", other_email)
    )
    if not other.data:
        raise HTTPException(status_code=404, detail="User not found.")
    other_row = other.data[0]

    if own_row["role"] == other_row["role"]:
        raise HTTPException(status_code=403, detail="You can only chat with a connected admin/employee.")

    if not own_row.get("workspace_id") or own_row["workspace_id"] != other_row.get("workspace_id"):
        raise HTTPException(status_code=403, detail="You're not connected with this user.")

    return other_row


def _admin_employee_ids(own_row: dict, other_row: dict) -> tuple[str, str]:
    """Returns (admin_id, employee_id) regardless of which side `own_row` is."""
    if own_row["role"] == "admin":
        return own_row["id"], other_row["id"]
    return other_row["id"], own_row["id"]


async def _get_or_create_conversation(workspace_id: str, admin_id: str, employee_id: str) -> dict:
    existing = await run_db(
        supabase.table("conversations")
        .select("*")
        .eq("admin_id", admin_id)
        .eq("employee_id", employee_id)
    )
    if existing.data:
        return existing.data[0]

    created = await run_db(
        supabase.table("conversations").insert({
            "workspace_id": workspace_id,
            "admin_id": admin_id,
            "employee_id": employee_id,
        })
    )
    return created.data[0]


async def _get_conversation_or_404(conversation_id: str, own_id: str) -> dict:
    result = await run_db(
        supabase.table("conversations").select("*").eq("id", conversation_id)
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    convo = result.data[0]
    if own_id not in (convo["admin_id"], convo["employee_id"]):
        raise HTTPException(status_code=403, detail="Not your conversation.")
    return convo


def _message_status(msg: dict) -> str:
    if msg.get("read_at"):
        return "read"
    if msg.get("delivered_at"):
        return "delivered"
    return "sent"


async def _attach_files_and_reactions(messages: list[dict]) -> list[dict]:
    if not messages:
        return messages

    ids = [m["id"] for m in messages]

    files_res, reactions_res = await run_db(
        supabase.table("message_files").select("*").in_("message_id", ids)
    ), await run_db(
        supabase.table("message_reactions").select("*").in_("message_id", ids)
    )

    files_by_msg: dict[str, list] = {}
    for f in files_res.data or []:
        files_by_msg.setdefault(f["message_id"], []).append(f)

    reactions_by_msg: dict[str, list] = {}
    for r in reactions_res.data or []:
        reactions_by_msg.setdefault(r["message_id"], []).append(
            {"user_id": r["user_id"], "emoji": r["emoji"]}
        )

    for m in messages:
        m["files"] = files_by_msg.get(m["id"], [])
        m["reactions"] = reactions_by_msg.get(m["id"], [])
        m["status"] = _message_status(m)

    return messages


# ---------------------------------------------------------------- contacts

@router.get("/chat/contacts")
async def get_chat_contacts(current_user: dict = Depends(get_current_user)):
    """The list shown behind the floating chat icon: for an admin, every
    connected employee in their workspace; for an employee, just their
    admin. Each entry carries a last-message preview + unread count so
    the list can render like a normal chat app's conversation list."""
    own_row = await _get_own_row(current_user["sub"])

    if not own_row.get("workspace_id"):
        return []

    if own_row["role"] == "admin":
        contacts_res = await run_db(
            supabase.table("users")
            .select("id, name, email, profile_pic_url, department, designation")
            .eq("role", "employee")
            .eq("workspace_id", own_row["workspace_id"])
            .order("name")
        )
    else:
        contacts_res = await run_db(
            supabase.table("users")
            .select("id, name, email, profile_pic_url, department, designation")
            .eq("role", "admin")
            .eq("workspace_id", own_row["workspace_id"])
        )

    contacts = contacts_res.data or []
    if not contacts:
        return []

    other_ids = [c["id"] for c in contacts]

    # Fetch every conversation this user is part of in one query, then
    # match rows up to contacts in Python — avoids N+1 round trips for
    # what could be a workspace with dozens of employees.
    if own_row["role"] == "admin":
        convos_res = await run_db(
            supabase.table("conversations")
            .select("*")
            .eq("admin_id", own_row["id"])
            .in_("employee_id", other_ids)
        )
    else:
        convos_res = await run_db(
            supabase.table("conversations")
            .select("*")
            .eq("employee_id", own_row["id"])
            .in_("admin_id", other_ids)
        )
    convos = convos_res.data or []
    convo_by_other_id = {
        (c["employee_id"] if own_row["role"] == "admin" else c["admin_id"]): c
        for c in convos
    }

    convo_ids = [c["id"] for c in convos]

    clears_res = await run_db(
        supabase.table("conversation_clears")
        .select("conversation_id, cleared_at")
        .eq("user_id", own_row["id"])
        .in_("conversation_id", convo_ids)
    ) if convo_ids else None
    cleared_at_by_convo = {
        c["conversation_id"]: c["cleared_at"] for c in (clears_res.data if clears_res else [])
    }

    result = []
    for contact in contacts:
        convo = convo_by_other_id.get(contact["id"])
        entry = {
            **contact,
            "conversation_id": convo["id"] if convo else None,
            "last_message": None,
            "last_message_type": None,
            "last_message_at": None,
            "unread_count": 0,
        }

        if convo:
            cleared_at = cleared_at_by_convo.get(convo["id"])

            last_msg_q = (
                supabase.table("messages")
                .select("content, message_type, created_at, sender_id, is_deleted")
                .eq("conversation_id", convo["id"])
            )
            if cleared_at:
                last_msg_q = last_msg_q.gt("created_at", cleared_at)
            last_msg_res = await run_db(
                last_msg_q.order("created_at", desc=True).limit(1)
            )
            if last_msg_res.data:
                last = last_msg_res.data[0]
                entry["last_message"] = "This message was deleted" if last["is_deleted"] else last["content"]
                entry["last_message_type"] = last["message_type"]
                entry["last_message_at"] = last["created_at"]

            unread_q = (
                supabase.table("messages")
                .select("id", count="exact")
                .eq("conversation_id", convo["id"])
                .neq("sender_id", own_row["id"])
                .is_("read_at", "null")
            )
            if cleared_at:
                unread_q = unread_q.gt("created_at", cleared_at)
            unread_res = await run_db(unread_q)
            entry["unread_count"] = unread_res.count or 0

        result.append(entry)

    result.sort(key=lambda e: e["last_message_at"] or "", reverse=True)
    return result


# ---------------------------------------------------------------- conversation

@router.get("/chat/conversation/{other_email}")
async def get_conversation(
    other_email: str,
    before: str | None = Query(default=None, description="ISO timestamp cursor; returns messages older than this"),
    limit: int = Query(default=MESSAGE_PAGE_SIZE, le=100),
    current_user: dict = Depends(get_current_user),
):
    own_row = await _get_own_row(current_user["sub"])
    other_row = await _get_other_party(own_row, other_email)
    admin_id, employee_id = _admin_employee_ids(own_row, other_row)

    convo = await _get_or_create_conversation(own_row["workspace_id"], admin_id, employee_id)

    clear_res = await run_db(
        supabase.table("conversation_clears")
        .select("cleared_at")
        .eq("conversation_id", convo["id"])
        .eq("user_id", own_row["id"])
    )
    cleared_at = clear_res.data[0]["cleared_at"] if clear_res.data else None

    query = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", convo["id"])
    )
    if cleared_at:
        query = query.gt("created_at", cleared_at)
    if before:
        query = query.lt("created_at", before)

    msgs_res = await run_db(query.order("created_at", desc=True).limit(limit))
    messages = msgs_res.data or []
    messages = await _attach_files_and_reactions(messages)
    messages.reverse()  # oldest first for rendering

    # Opening the thread = the messages reached this device. Mark
    # anything from the other party that isn't delivered yet.
    await run_db(
        supabase.table("messages")
        .update({"delivered_at": datetime.now(timezone.utc).isoformat()})
        .eq("conversation_id", convo["id"])
        .eq("sender_id", other_row["id"])
        .is_("delivered_at", "null")
    )

    return {
        "conversation_id": convo["id"],
        "other_user": other_row,
        "messages": messages,
        "has_more": len(messages) == limit,
    }


@router.post("/chat/conversation/{other_email}/read")
async def mark_conversation_read(other_email: str, current_user: dict = Depends(get_current_user)):
    """Called when the chat screen is actually focused/visible — separate
    from GET /chat/conversation (which only marks delivered) so 'read'
    genuinely reflects the recipient having seen the messages, not just
    having fetched them in the background."""
    own_row = await _get_own_row(current_user["sub"])
    await run_db(
        supabase.table("users")
        .update({"last_seen_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", own_row["id"])
    )
    other_row = await _get_other_party(own_row, other_email)
    admin_id, employee_id = _admin_employee_ids(own_row, other_row)

    convo = await _get_or_create_conversation(own_row["workspace_id"], admin_id, employee_id)

    now = datetime.now(timezone.utc).isoformat()
    await run_db(
        supabase.table("messages")
        .update({"read_at": now, "delivered_at": now})
        .eq("conversation_id", convo["id"])
        .eq("sender_id", other_row["id"])
        .is_("read_at", "null")
    )

    return {"success": True}


# ---------------------------------------------------------------- send

@router.post("/chat/send")
async def send_message(data: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    own_row = await _get_own_row(current_user["sub"])
    other_row = await _get_other_party(own_row, data.other_email)
    admin_id, employee_id = _admin_employee_ids(own_row, other_row)

    if not data.content and not data.files:
        raise HTTPException(status_code=400, detail="Message must have text or an attachment.")

    convo = await _get_or_create_conversation(own_row["workspace_id"], admin_id, employee_id)

    if data.reply_to_id:
        reply_res = await run_db(
            supabase.table("messages").select("id, conversation_id").eq("id", data.reply_to_id)
        )
        if not reply_res.data or reply_res.data[0]["conversation_id"] != convo["id"]:
            raise HTTPException(status_code=400, detail="Cannot reply to a message outside this conversation.")

    msg_res = await run_db(
        supabase.table("messages").insert({
            "id": str(uuid.uuid4()),
            "conversation_id": convo["id"],
            "sender_id": own_row["id"],
            "content": data.content,
            "message_type": data.message_type,
            "reply_to_id": data.reply_to_id,
        })
    )
    message = msg_res.data[0]

    if data.files:
        await run_db(
            supabase.table("message_files").insert([
                {
                    "message_id": message["id"],
                    "file_url": f.file_url,
                    "file_name": f.file_name,
                    "file_type": f.file_type,
                    "file_size": f.file_size,
                    "thumbnail_url": f.thumbnail_url,
                    "storage_service": "cloudinary",
                }
                for f in data.files
            ])
        )

    await run_db(
        supabase.table("conversations")
        .update({"last_message_at": message["created_at"]})
        .eq("id", convo["id"])
    )

    [message] = await _attach_files_and_reactions([message])

    preview = data.content or ("Sent an attachment" if data.files else "")
    push_only(
        other_row["id"],
        title=own_row["name"],
        body=preview[:120],
        data={"type": "chat_message", "conversation_id": convo["id"], "from_email": own_row["email"]},
    )

    return {"conversation_id": convo["id"], "message": message}


# ---------------------------------------------------------------- reactions

@router.post("/chat/messages/{message_id}/react")
async def react_to_message(
    message_id: str,
    data: ReactToMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    own_row = await _get_own_row(current_user["sub"])

    msg_res = await run_db(supabase.table("messages").select("conversation_id").eq("id", message_id))
    if not msg_res.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    await _get_conversation_or_404(msg_res.data[0]["conversation_id"], own_row["id"])

    existing = await run_db(
        supabase.table("message_reactions")
        .select("*")
        .eq("message_id", message_id)
        .eq("user_id", own_row["id"])
    )

    if existing.data and existing.data[0]["emoji"] == data.emoji:
        # Tapping the same emoji again removes it — matches WhatsApp.
        await run_db(
            supabase.table("message_reactions")
            .delete()
            .eq("message_id", message_id)
            .eq("user_id", own_row["id"])
        )
    elif existing.data:
        await run_db(
            supabase.table("message_reactions")
            .update({"emoji": data.emoji})
            .eq("message_id", message_id)
            .eq("user_id", own_row["id"])
        )
    else:
        await run_db(
            supabase.table("message_reactions").insert({
                "message_id": message_id,
                "user_id": own_row["id"],
                "emoji": data.emoji,
            })
        )

    reactions_res = await run_db(
        supabase.table("message_reactions").select("user_id, emoji").eq("message_id", message_id)
    )
    return {"reactions": reactions_res.data or []}


# ---------------------------------------------------------------- delete / clear

@router.delete("/chat/messages/{message_id}")
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Delete for everyone — only the sender can do this. Content is
    cleared but the row stays (so `reply_to_id` references elsewhere
    still resolve, and the UI can render the WhatsApp-style 'This
    message was deleted' placeholder). Attached Cloudinary files are
    left in place — only the DB reference/visibility is removed."""
    own_row = await _get_own_row(current_user["sub"])

    msg_res = await run_db(supabase.table("messages").select("*").eq("id", message_id))
    if not msg_res.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    message = msg_res.data[0]

    if message["sender_id"] != own_row["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own messages.")

    await run_db(
        supabase.table("messages")
        .update({
            "is_deleted": True,
            "content": None,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", message_id)
    )
    await run_db(supabase.table("message_files").delete().eq("message_id", message_id))

    return {"success": True}


@router.post("/chat/clear")
async def clear_chat(data: ClearChatRequest, current_user: dict = Depends(get_current_user)):
    """Clear for me only — sets a per-user 'cleared_at' watermark on the
    conversation rather than touching any message rows. See
    conversation_clears in database/chat_schema.sql for why."""
    own_row = await _get_own_row(current_user["sub"])
    other_row = await _get_other_party(own_row, data.other_email)
    admin_id, employee_id = _admin_employee_ids(own_row, other_row)

    convo = await _get_or_create_conversation(own_row["workspace_id"], admin_id, employee_id)
    now = datetime.now(timezone.utc).isoformat()

    existing = await run_db(
        supabase.table("conversation_clears")
        .select("id")
        .eq("conversation_id", convo["id"])
        .eq("user_id", own_row["id"])
    )
    if existing.data:
        await run_db(
            supabase.table("conversation_clears")
            .update({"cleared_at": now})
            .eq("conversation_id", convo["id"])
            .eq("user_id", own_row["id"])
        )
    else:
        await run_db(
            supabase.table("conversation_clears").insert({
                "conversation_id": convo["id"],
                "user_id": own_row["id"],
                "cleared_at": now,
            })
        )

    return {"success": True}