import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { supabase } from "../../lib/supabase";
import {
  fetchConversation,
  markConversationRead,
  sendChatMessage,
  reactToMessage,
  deleteChatMessage,
  deleteChatMessageForMe,
  clearChat,
  fetchMessage,
} from "../../services/chatApi";
import { subscribeToConversation } from "../../services/chatRealtime";
import type { ChatMessage, MessageType, PendingAttachment } from "../../types/chat";

function generateLocalId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
const conversationCache = new Map<
  string,
  { conversationId: string; otherUser: ConversationResponseOtherUser; messages: ChatMessage[]; hasMore: boolean }
>();
/** Merges a raw postgres_changes row (snake_case DB columns only, no
 * files/reactions) into an existing message we already have loaded. */
function mergeDbFields(existing: ChatMessage, row: any): ChatMessage {
  return {
    ...existing,
    content: row.content,
    message_type: row.message_type,
    is_deleted: row.is_deleted,
    deleted_at: row.deleted_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    status: row.read_at ? "read" : row.delivered_at ? "delivered" : "sent",
  };
}

export function useConversation(otherEmail: string, ownUserId: string | null) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ConversationResponseOtherUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof subscribeToConversation> | null>(null);
  const isFocusedRef = useRef(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const load = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") setLoading(true);
      setError(null);
      try {
        const data = await fetchConversation(otherEmail);
        setConversationId(data.conversation_id);
        setOtherUser(data.other_user);
        setMessages(data.messages);
        setHasMore(data.has_more);
        conversationCache.set(otherEmail, {
          conversationId: data.conversation_id,
          otherUser: data.other_user,
          messages: data.messages,
          hasMore: data.has_more,
        });
      } catch (err: any) {
        if (mode === "initial") setError(err?.message || "Could not load this conversation.");
      } finally {
        setLoading(false);
      }
    },
    [otherEmail],
  );

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const data = await fetchConversation(otherEmail, { before: oldest.created_at });
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.has_more);
    } catch (err: any) {
      // Non-fatal — the user can just scroll and retry; don't blow away
      // the thread they're already reading over a pagination hiccup.
      console.error("[useConversation] loadOlder failed:", err?.message || err);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, messages, otherEmail]);

  const markRead = useCallback(async () => {
    try {
      await markConversationRead(otherEmail);
    } catch (err) {
      // Best-effort — a failed read receipt shouldn't interrupt reading.
      console.error("[useConversation] markRead failed:", err);
    }
  }, [otherEmail]);

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initial load + realtime subscription lifecycle, tied to the
  // conversation identity (otherEmail), not to screen focus.
  useEffect(() => {
    const cached = conversationCache.get(otherEmail);
    if (cached) {
      setConversationId(cached.conversationId);
      setOtherUser(cached.otherUser);
      setMessages(cached.messages);
      setHasMore(cached.hasMore);
      setLoading(false);
      load("silent");
    } else {
      load("initial");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherEmail]);
  useEffect(() => {
    if (!conversationId || !ownUserId) return;

    const handleInsert = (row: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        // Reconcile against our own optimistic pending message with the
        // same sender+content, if one is still sitting there.
        if (row.sender_id === ownUserId) {
          const pendingIdx = prev.findIndex((m) => m._pending && m.content === row.content);
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = { ...row, files: [], reactions: [], status: "sent" };
            return next;
          }
        }
        return [...prev, { ...row, files: [], reactions: [], status: "sent" }];
      });

      if (row.sender_id !== ownUserId && isFocusedRef.current) {
        markRead();
      }
    };

    const handleUpdate = async (row: any) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = mergeDbFields(next[idx], row);
        return next;
      });

      // The row from postgres_changes doesn't include the joined
      // files/reactions — refetch just this message to pick those up
      // (covers the "someone reacted" case; see chat_schema.sql).
      try {
        const full = await fetchMessage(row.id);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === row.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...full, status: full.read_at ? "read" : full.delivered_at ? "delivered" : "sent" };
          return next;
        });
      } catch (err) {
        console.error("[useConversation] refetch on update failed:", err);
      }
    };

    channelRef.current = subscribeToConversation(
      conversationId,
      ownUserId,
      handleInsert,
      handleUpdate,
      (payload) => {
        if (payload.userId === ownUserId) return;
        setOtherTyping(payload.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (payload.isTyping) {
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 4000);
        }
      },
      (onlineUserIds) => {
        setOtherOnline(onlineUserIds.some((id) => id !== ownUserId));
      },
    );

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, ownUserId, markRead]);

  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      if (!isFocusedRef.current) return;
      try {
        const latest = messagesRef.current[messagesRef.current.length - 1];
        const data = await fetchConversation(otherEmail, latest ? { before: undefined } : {});
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh];
        });
      } catch {
        // silent — this is just a safety net, the pull-to-refresh and
        // realtime path are the primary mechanisms
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [conversationId, otherEmail]);

  // Mark read whenever the chat screen is actually focused, and again
  // whenever the app comes back to the foreground while it's focused.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      markRead();

      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active" && isFocusedRef.current) markRead();
      });

      return () => {
        isFocusedRef.current = false;
        sub.remove();
      };
    }, [markRead]),
  );

  const sendMessage = useCallback(
    async (params: {
      content?: string;
      messageType?: MessageType;
      replyToId?: string | null;
      files?: PendingAttachment[];
    }) => {
      if (!ownUserId) return;
      const localId = generateLocalId();
      const optimistic: ChatMessage = {
        id: localId,
        conversation_id: conversationId || "",
        sender_id: ownUserId,
        content: params.content ?? null,
        message_type: params.messageType ?? "text",
        reply_to_id: params.replyToId ?? null,
        is_deleted: false,
        deleted_at: null,
        delivered_at: null,
        read_at: null,
        created_at: new Date().toISOString(),
        files: (params.files || []).map((f, i) => ({
          id: `${localId}-file-${i}`,
          message_id: localId,
          file_url: f.file_url,
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
          thumbnail_url: f.thumbnail_url,
          storage_service: "cloudinary",
          uploaded_at: new Date().toISOString(),
        })),
        reactions: [],
        status: "sent",
        _pending: true,
        _localId: localId,
      };

      setMessages((prev) => [...prev, optimistic]);

      try {
        const { conversation_id, message } = await sendChatMessage({
          otherEmail,
          content: params.content,
          messageType: params.messageType,
          replyToId: params.replyToId,
          files: params.files,
        });
        setConversationId(conversation_id);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m._localId === localId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = message;
          return next;
        });
      } catch (err) {
        console.error("[useConversation] send failed:", err);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m._localId === localId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], _pending: false, _failed: true };
          return next;
        });
      }
    },
    [conversationId, ownUserId, otherEmail],
  );

  const react = useCallback(async (messageId: string, emoji: string) => {
    if (!ownUserId) return;
    // Optimistic toggle so the tap feels instant.
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const already = m.reactions.find((r) => r.user_id === ownUserId);
        let reactions;
        if (already && already.emoji === emoji) {
          reactions = m.reactions.filter((r) => r.user_id !== ownUserId);
        } else if (already) {
          reactions = m.reactions.map((r) => (r.user_id === ownUserId ? { ...r, emoji } : r));
        } else {
          reactions = [...m.reactions, { user_id: ownUserId, emoji }];
        }
        return { ...m, reactions };
      }),
    );

    try {
      const { reactions } = await reactToMessage(messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    } catch (err) {
      console.error("[useConversation] react failed:", err);
      // Not worth a full reload for a failed reaction — next realtime
      // update or screen refocus will reconcile the true state.
    }
  }, [ownUserId]);

  const removeMessage = useCallback(async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true, content: null, files: [] } : m)),
    );
    try {
      await deleteChatMessage(messageId);
    } catch (err: any) {
      console.error("[useConversation] delete failed:", err);
      throw err;
    }
  }, []);

  const removeMessageForMe = useCallback(async (messageId: string) => {
    // Optimistic — just drop it from local state, same as a real refetch would.
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteChatMessageForMe(messageId);
    } catch (err) {
      console.error("[useConversation] delete-for-me failed:", err);
      // Reconcile with the server rather than silently leaving a message
      // missing if the request actually failed — "silent" so this
      // doesn't flash the full skeleton over an otherwise-fine screen.
      load("silent");
      throw err;
    }
  }, [load]);

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !ownUserId) return;
      channelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: ownUserId, isTyping } });
    },
    [ownUserId],
  );
  // For messages that never made it to the server at all — still
  // `_pending` (in flight) or `_failed` (errored out). These only have
  // a local fake id, so the normal delete/react/reply endpoints would
  // 404 against them. This just drops it from local state; nothing to
  // tell the backend since no row was ever created there.
  const discardLocalMessage = useCallback((localId: string) => {
    setMessages((prev) => prev.filter((m) => m._localId !== localId));
  }, []);
  const clear = useCallback(async () => {
    await clearChat(otherEmail);
    setMessages([]);
    setHasMore(false);
  }, [otherEmail]);

  return {
    conversationId,
    otherUser,
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    otherOnline,
    otherTyping,
    loadOlder,
    sendMessage,
    react,
    removeMessage,
    removeMessageForMe,
    discardLocalMessage,
    clear,
    reload: load,
    notifyTyping,
  };
}

type ConversationResponseOtherUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  workspace_id: string | null;
  profile_pic_url: string | null;
  last_seen_at: string | null;
}; 