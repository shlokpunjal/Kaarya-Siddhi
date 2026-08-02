import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL is missing from the Expo build environment.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing from the Expo build environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// SINGLE SOURCE OF TRUTH for opening a realtime channel.
//
// Previously this exact function was copy-pasted into 7 different files
// (app/_layout.tsx, app/(admin)/index.tsx, app/(employee)/index.tsx,
// app/notifications/admin.tsx, app/notifications/employee.tsx,
// app/notifications/admin-requests-list.tsx, utils/calendarGrid.ts).
// Every call site should import it from here instead.
//
// Removes any existing channel with the same topic before creating a new
// one -- without this, remounting a screen (e.g. navigating away and back)
// on a fast-refresh or a focus/unfocus cycle can leave a stale subscription
// still attached to the same topic, so the same DB change fires the
// callback twice (once on the old channel, once on the new one).
export function getFreshChannel(name: string) {
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}