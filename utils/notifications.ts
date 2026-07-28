import * as Notifications from "expo-notifications";

// NOTE: Notifications.setNotificationHandler(...) now lives in app/_layout.tsx
// as the single source of truth â€” don't duplicate it here.

// Fires a notification banner on THIS device only, immediately. Not a push â€”
// can't reach another device. Used for self-confirmations (OTP verified,
// "request sent", "you accepted this") and for the realtime DB-watch bridge
// in _layout.tsx that simulates push-like behavior while the app is running.
//
// Never throws â€” this is always a "nice to have" side effect (e.g. a
// simulator has no notification permissions at all, or the user denied
// them), and a failure here must never break whatever screen/flow called it.
export async function sendLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (err) {
    console.error("Failed to show local notification:", err);
  }
}

export async function sendLoginNotification(name: string): Promise<void> {
  await sendLocalNotification("OTP verified", `Welcome, ${name}!`);
}
