import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { API_BASE_URL } from "../constants/api";

async function wipeAndRedirect(sessionAtStart: string | null) {
  // A newer login may have started (and finished) while this request's
  // refresh was still in flight. If the session has already moved on,
  // this failure belongs to a dead session — don't wipe the live one
  // out from under whoever is now logged in.
  const sessionNow = await SecureStore.getItemAsync("sessionId");
  if (sessionNow !== sessionAtStart) return;

  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("refreshToken");
  await SecureStore.deleteItemAsync("sessionId");
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
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      await SecureStore.setItemAsync("token", data.token);
      // Backend returns snake_case (refresh_token) — must match, or the
      // rotated token never gets saved and the next silent refresh reuses
      // the now-revoked old one, triggering the reuse-detection path that
      // kills every session for the user.
      if (data.refresh_token) await SecureStore.setItemAsync("refreshToken", data.refresh_token);
      return data.token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const sessionAtStart = await SecureStore.getItemAsync("sessionId");
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
        headers: buildHeaders(refreshed),
      });

      if (response.status !== 401) return response;
    }

    // Refresh failed, returned no session, or the retry still 401'd — force
    // logout, but only if this is still the session that started the call.
    await wipeAndRedirect(sessionAtStart);
  }

  return response;
}