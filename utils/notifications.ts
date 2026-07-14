// import * as Notifications from "expo-notifications";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowBanner: true,
//     shouldShowList: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

// export async function sendLoginNotification(name: string) {
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "Logged in successfully",
//       body: `Welcome back, ${name}!`,
//       sound: true,
//     },
//     trigger: null,
//   });
// }

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

export async function sendLoginNotification(name: string) {
  // Don't try notification APIs that aren't supported in Expo Go
  if (Constants.appOwnership === "expo") {
    console.log("Running in Expo Go");
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "OTP verified",
      body: `Welcome, ${name}!`,
      sound: true,
    },
    trigger: null,
  });
}