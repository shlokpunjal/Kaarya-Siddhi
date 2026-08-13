import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { fetchChatContacts } from "../../services/chatApi";
import type { ChatContact } from "../../types/chat";

/**
 * Backs the contact list behind the floating chat icon. No dedicated
 * realtime subscription here (see services/chatRealtime.ts comments on
 * why a workspace-wide channel would leak other people's conversation
 * activity) — instead this refetches whenever the screen regains focus,
 * which covers both "just sent/received a message and came back" and
 * "opened the app fresh".
 */
export function useChatContacts() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return {
    contacts,
    loading,
    refreshing,
    error,
    totalUnread,
    refresh: () => load(true),
    reload: () => load(false),
  };
}