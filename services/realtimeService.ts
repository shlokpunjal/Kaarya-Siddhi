import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// All Supabase Realtime channel plumbing lives here — creating channels,
// guarding against duplicate subscriptions on the same topic, and safely
// tearing channels down. Moved out of app/_layout.tsx so that file can
// stay focused on layout/providers/navigation (see hooks/useNotificationBridge.ts
// for the code that actually wires these up to app state).

/**
 * Returns a channel for `name`, first removing any existing channel on
 * the same topic. Supabase's client will happily let you open a second
 * subscription on an identical topic (e.g. if a component remounts
 * before the previous cleanup ran) — that's how you end up with
 * duplicate listeners and duplicate notifications. This guards against
 * that regardless of *why* a stale channel is still registered.
 */
export function getFreshChannel(name: string): RealtimeChannel {
  const existing = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}

/**
 * Removes a channel if it exists, swallowing/logging any error so a
 * failed unsubscribe during cleanup never becomes an unhandled
 * rejection or blocks the rest of a cleanup function from running.
 */
export function safeRemoveChannel(
  channel: RealtimeChannel | null | undefined,
  label: string,
): void {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch (error) {
    console.error(`[realtimeService] Failed removing ${label} channel:`, error);
  }
}

/**
 * Subscribes to new rows in `notifications` for this user. `onInsert`
 * receives the raw inserted row; the caller decides what to do with it
 * (e.g. show a local notification), keeping this module free of any
 * notification-content concerns.
 */
export function subscribeToUserNotifications(
  userId: string,
  onInsert: (row: any) => void | Promise<void>,
): RealtimeChannel {
  return getFreshChannel(`global_notifs_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        try {
          const notification = payload?.new;
          if (!notification) {
            console.warn("[realtimeService] Empty notification payload.");
            return;
          }
          await onInsert(notification);
        } catch (error) {
          console.error("[realtimeService] Notification handler failed:", error);
        }
      },
    )
    .subscribe((status) => {
      console.log("[realtimeService] Notification channel:", status);
    });
}

/**
 * Subscribes to new rows in `extension_requests` for an admin's
 * workspace. Only meaningful for admins — the caller is responsible for
 * checking role/workspace_id before calling this (mirrors the original
 * behavior in app/_layout.tsx).
 */
export function subscribeToWorkspaceExtensionRequests(
  workspaceId: string,
  onInsert: (row: any) => void | Promise<void>,
): RealtimeChannel {
  return getFreshChannel(`global_extensions_${workspaceId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "extension_requests",
        filter: `workspace_id=eq.${workspaceId}`,
      },
      async (payload) => {
        try {
          await onInsert(payload?.new);
        } catch (error) {
          console.error("[realtimeService] Extension request handler failed:", error);
        }
      },
    )
    .subscribe((status) => {
      console.log("[realtimeService] Extension channel:", status);
    });
}