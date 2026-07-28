// Registers this device for Expo push notifications and saves the token
// to the backend (users.expo_push_token), reusing the existing
// /save-push-token endpoint that main.py already exposes.
//
// This is the ONLY push-token registration module in the app â€” it used
// to be duplicated in utils/pushToken.ts with slightly different (and
// buggy â€” missing `projectId`, which can make token registration fail
// in standalone/production builds) logic. Every call site should import
// from here.

// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/api";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;

if (!isExpoGo) {
  Notifications = require("expo-notifications");
  Device = require("expo-device");
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || !Notifications || !Device) {
    console.warn("Push notifications are not supported in Expo Go — skipping.");
    return null;
  }

  try {
    if (!Device.isDevice) {
      console.warn("Push notifications require a physical device.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permission not granted.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("No EAS projectId configured — push token registration skipped.");
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data;
  } catch (err) {
    console.error("Failed to register for push notifications:", err);
    return null;
  }
}

export async function registerAndSavePushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    const authToken = await SecureStore.getItemAsync("token");
    if (!authToken) return; // not logged in yet

    const res = await fetch(`${API_BASE_URL}/save-push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: token }),
    });

    if (!res.ok) {
      console.error("Failed to save push token:", res.status);
    }
  } catch (err) {
    console.error("Failed to register push token:", err);
  }
}
