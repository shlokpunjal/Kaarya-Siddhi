import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function sendLoginNotification(name: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Logged in successfully",
      body: `Welcome back, ${name}!`,
      sound: true,
    },
    trigger: null,
  });
}