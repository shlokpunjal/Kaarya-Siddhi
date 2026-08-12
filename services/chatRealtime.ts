import type { RealtimeChannel } from "@supabase/supabase-js";
import { getFreshChannel } from "../lib/supabase";

/**
 * One channel per open conversation. Listens for:
 *   - INSERT on messages  -> a new message arrived (from either side)
 *   - UPDATE on messages  -> delivered/read ticks changed, a message was
 *     soft-deleted, OR a reaction changed (the backend bumps `updated_at`
 *     on every reaction add/remove — see chat_schema.sql) — the caller
 *     re-fetches that single message via GET /chat/messages/{id} to pick
 *     up the new reactions rather than us trying to diff them here.
 *
 * Filtered on conversation_id, matching the workspace_id/user_id-filtered
 * channels already used elsewhere in the app (extension_requests,
 * notifications) — safe without table-level RLS because Realtime applies
 * the filter server-side before broadcasting, not just client-side.
 */
export function subscribeToConversation(
  conversationId: string,
  onInsert: (row: any) => void,
  onUpdate: (row: any) => void,
): RealtimeChannel {
  return getFreshChannel(`chat_conversation_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
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
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        try {
          if (payload?.new) onUpdate(payload.new);
        } catch (error) {
          console.error("[chatRealtime] Update handler failed:", error);
        }
      },
    )
    .subscribe((status) => {
      console.log(`[chatRealtime] conversation ${conversationId}:`, status);
    });
}