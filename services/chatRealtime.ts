import type { RealtimeChannel } from "@supabase/supabase-js";
import { getFreshChannel } from "../lib/supabase";

export function subscribeToConversation(
  conversationId: string,
  ownUserId: string,
  onInsert: (row: any) => void,
  onUpdate: (row: any) => void,
  onTyping?: (payload: { userId: string; isTyping: boolean }) => void,
  onPresenceChange?: (onlineUserIds: string[]) => void,
): RealtimeChannel {
  const channel = getFreshChannel(`chat_conversation_${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        try {
          if (payload?.new) onInsert(payload.new);
        } catch (error) {
          console.error("[chatRealtime] Insert handler failed:", error);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        try {
          if (payload?.new) onUpdate(payload.new);
        } catch (error) {
          console.error("[chatRealtime] Update handler failed:", error);
        }
      },
    );

  if (onTyping) {
    channel.on("broadcast", { event: "typing" }, (payload) => {
      try {
        onTyping(payload.payload as { userId: string; isTyping: boolean });
      } catch (error) {
        console.error("[chatRealtime] Typing handler failed:", error);
      }
    });
  }

  if (onPresenceChange) {
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onPresenceChange(Object.keys(state));
    });
  }

  return channel.subscribe(async (status) => {
    console.log(`[chatRealtime] conversation ${conversationId}:`, status);
    if (status === "SUBSCRIBED" && onPresenceChange) {
      await channel.track({ user_id: ownUserId, online_at: new Date().toISOString() });
    }
  });
}