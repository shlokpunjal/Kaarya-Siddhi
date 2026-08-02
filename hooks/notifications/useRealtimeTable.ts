import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { subscribeToTableChanges } from "../../services/realtimeService";

/**
 * Was hand-rolled (ref + effect + cleanup) six times across the
 * notifications screens, each identical apart from the channel name,
 * table, filter, and callback:
 *   admin.tsx (x2), admin-requests-list.tsx (x2), employee.tsx,
 *   employee-request-detail.tsx, admin-request-review.tsx.
 *
 * Pass `null`/`undefined` for channelName or filter to skip subscribing
 * (e.g. while a user/workspace id hasn't resolved yet) — mirrors the
 * `if (!adminUserId) return;` guards the original effects had.
 */
export function useRealtimeTable(
  channelName: string | null | undefined,
  table: string,
  filter: string | null | undefined,
  onChange: () => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelName || !filter) return;

    const channel = subscribeToTableChanges(channelName, table, filter, onChange);
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, table, filter, onChange]);
}