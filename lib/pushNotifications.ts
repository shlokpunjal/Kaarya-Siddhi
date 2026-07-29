// Registers this device for Expo push notifications and saves the token
// to the backend (users.expo_push_token), reusing the existing
// /save-push-token endpoint that main.py already exposes.
//
// This is the ONLY push-token registration module in the app -- it used
// to be duplicated in utils/pushToken.ts with slightly different (and
// buggy -- missing `projectId`, which can make token registration fail
// in standalone/production builds) logic. Every call site should import
// from here.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/api";
import Constants from "expo-constants";

// Notifications.setNotificationHandler(...) lives in app/_layout.tsx as
// the single source of truth -- don't duplicate it here.

// Machine-readable reasons registration can fail with -- kept in sync
// with backend/schemas.py's SavePushTokenRequest.push_token_status and
// with any UI (e.g. profile/settings) that wants to show the user why
// notifications aren't working for them.
export type PushRegistrationResult =
  | { token: string; status: null }
  | { token: null; status: "not_a_device" | "permission_denied" | "no_project_id" | "unknown_error" };

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  try {
    if (!Device.isDevice) {
      console.warn("Push notifications require a physical device.");
      return { token: null, status: "not_a_device" };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permission not granted.");
      return { token: null, status: "permission_denied" };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      // Without a projectId, getExpoPushTokenAsync can silently fail (or
      // throw) in standalone/production builds -- fail loudly here so
      // it's obvious in logs rather than surfacing as "push just doesn't
      // work" days later.
      console.warn("No EAS projectId configured -- push token registration skipped.");
      return { token: null, status: "no_project_id" };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: tokenResponse.data, status: null };
  } catch (err) {
    console.error("Failed to register for push notifications:", err);
    return { token: null, status: "unknown_error" };
  }
}

export async function registerAndSavePushToken(): Promise<void> {
  try {
    const result = await registerForPushNotificationsAsync();

    const authToken = await SecureStore.getItemAsync("token");
    if (!authToken) return; // not logged in yet

    // Report success OR failure -- either way the backend now knows this
    // user's push state instead of a failure just vanishing into this
    // device's local console.
    const body = result.token
      ? { push_token: result.token }
      : { push_token_status: result.status };

    const res = await fetch(`${API_BASE_URL}/save-push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Failed to save push token:", res.status);
    }
  } catch (err) {
    console.error("Failed to register push token:", err);
  }
}