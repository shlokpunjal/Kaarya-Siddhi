import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { API_BASE_URL } from "../constants/api";

async function wipeAndRedirect() {
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("refreshToken");
  await AsyncStorage.multiRemove(["userPhone", "userEmail", "userRole", "workspaceId"]);
  router.replace("/(auth)/LoginChoice");
}

// Shared across every concurrent 401 — without this, N simultaneous
// requests that all expire at once each call /refresh-token with the
// same (soon-to-be-stale) refresh token. The backend rotates refresh
// tokens on every use and revokes the old one, so request #2's refresh
// call arrives after #1 already rotated it, looks exactly like a
// replayed/stolen refresh token, and the backend responds by revoking
// every session for the user — logging them out for simply having two
// screens load data at once. One in-flight refresh, shared by everyone
// waiting on it, fixes that.
let refreshPromise: Promise<{ token: string; refresh_token: string } | null> | null = null;

async function refreshAccessToken(): Promise<{ token: string; refresh_token: string } | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) return null;

    try {
      const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshRes.ok) return null;

      const data = await refreshRes.json();
      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("refreshToken", data.refresh_token);
      return data;
    } catch (error) {
      console.log("Token refresh failed:", error);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    // Clear once settled so the *next* 401 (a genuinely new expiry,
    // not one of this batch) triggers a fresh refresh instead of
    // reusing a resolved promise forever.
    refreshPromise = null;
  }
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync("token");

  const buildHeaders = (t: string | null) => ({
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  });

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry the original request once with the new access token
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders(refreshed.token),
      });

      if (response.status !== 401) return response;
    }

    // Refresh failed, returned no session, or the retry still 401'd — force logout
    await wipeAndRedirect();
  }

  return response;
}