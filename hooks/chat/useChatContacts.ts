import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { fetchChatContacts } from "../../services/chatApi";
import { getFreshChannel } from "../../lib/supabase";
import type { ChatContact } from "../../types/chat";

export function useChatContacts() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingConversationIds, setTypingConversationIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchChatContacts();
      setContacts(data);
    } catch (err: any) {
      setError(err?.message || "Could not load your chats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Listen for typing broadcasts on every contact's conversation channel
  // (same channel topic used by useConversation.ts). Read-only — never
  // calls .track(), so it won't affect the online-presence feature.
  useEffect(() => {
    const conversationIds = contacts.map((c) => c.conversation_id).filter((id): id is string => !!id);
    if (conversationIds.length === 0) return;

    const channels = conversationIds.map((id) =>
      getFreshChannel(`chat_conversation_${id}`)
        .on("broadcast", { event: "typing" }, (payload) => {
          const { isTyping } = payload.payload as { userId: string; isTyping: boolean };
          setTypingConversationIds((prev) => {
            const next = new Set(prev);
            if (isTyping) next.add(id);
            else next.delete(id);
            return next;
          });
        })
        .subscribe(),
    );

    return () => {
      channels.forEach((ch) => ch.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.map((c) => c.conversation_id).join(",")]);

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return {
    contacts,
    loading,
    refreshing,
    error,
    totalUnread,
    typingConversationIds,
    refresh: () => load(true),
    reload: () => load(false),
  };
}