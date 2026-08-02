import { supabase } from "../../lib/supabase";

// Removes any stale channel with the same topic before creating a fresh one,
// so re-subscribing (e.g. on user change) doesn't leak duplicate listeners.
export function getFreshChannel(name: string) {
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}