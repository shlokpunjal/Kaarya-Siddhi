import { authFetch } from "../utils/authFetch";
import type { ChatContact, ConversationResponse, ChatMessage, PendingAttachment, MessageType } from "../types/chat";

async function parseOrThrow(res: Response, fallback: string) {
  if (!res.ok) {
    let detail = fallback;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // response wasn't JSON — stick with the fallback message
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchChatContacts(): Promise<ChatContact[]> {
  const res = await authFetch("/chat/contacts");
  return parseOrThrow(res, "Could not load your chats.");
}

export async function fetchConversation(
  otherEmail: string,
  opts: { before?: string; limit?: number } = {},
): Promise<ConversationResponse> {
  const params = new URLSearchParams();
  if (opts.before) params.set("before", opts.before);
  if (opts.limit) params.set("limit", String(opts.limit));
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await authFetch(`/chat/conversation/${encodeURIComponent(otherEmail)}${query}`);
  return parseOrThrow(res, "Could not load this conversation.");
}

export async function markConversationRead(otherEmail: string): Promise<void> {
  const res = await authFetch(`/chat/conversation/${encodeURIComponent(otherEmail)}/read`, {
    method: "POST",
  });
  await parseOrThrow(res, "Could not update read status.");
}

export async function fetchMessage(messageId: string): Promise<ChatMessage> {
  const res = await authFetch(`/chat/messages/${messageId}`);
  return parseOrThrow(res, "Could not refresh this message.");
}

export async function sendChatMessage(params: {
  otherEmail: string;
  content?: string | null;
  messageType?: MessageType;
  replyToId?: string | null;
  files?: PendingAttachment[];
}): Promise<{ conversation_id: string; message: ChatMessage }> {
  const res = await authFetch("/chat/send", {
    method: "POST",
    body: JSON.stringify({
      other_email: params.otherEmail,
      content: params.content ?? null,
      message_type: params.messageType ?? "text",
      reply_to_id: params.replyToId ?? null,
      files: params.files ?? [],
    }),
  });
  return parseOrThrow(res, "Message could not be sent.");
}

export async function reactToMessage(messageId: string, emoji: string) {
  const res = await authFetch(`/chat/messages/${messageId}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
  return parseOrThrow(res, "Could not react to this message.");
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const res = await authFetch(`/chat/messages/${messageId}`, { method: "DELETE" });
  await parseOrThrow(res, "Could not delete this message.");
}

export async function clearChat(otherEmail: string): Promise<void> {
  const res = await authFetch("/chat/clear", {
    method: "POST",
    body: JSON.stringify({ other_email: otherEmail }),
  });
  await parseOrThrow(res, "Could not clear this chat.");
}