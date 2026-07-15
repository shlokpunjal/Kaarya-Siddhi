import * as Notifications from "expo-notifications";

// NOTE: Notifications.setNotificationHandler(...) now lives in app/_layout.tsx
// as the single source of truth — don't duplicate it here.

// Fires a notification banner on THIS device only, immediately. Not a push —
// can't reach another device. Used for self-confirmations (OTP verified,
// "request sent", "you accepted this") and for the realtime DB-watch bridge
// in _layout.tsx that simulates push-like behavior while the app is running.
export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function sendLoginNotification(name: string) {
  await sendLocalNotification("OTP verified", `Welcome, ${name}!`);
}