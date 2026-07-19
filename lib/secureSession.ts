// lib/secureSession.ts
//
// Secrets (token, refreshToken) live in SecureStore — Keychain/Keystore
// backed. Everything else (phone/email/role/workspaceId) is plain
// profile data, not a secret, so it stays in AsyncStorage — no reason
// to pay SecureStore's cost for it. This file is the single place that
// split happens; AuthContext.tsx and any screen that needs to read the
// cached session (e.g. LoginChoice.tsx) both import from here so
// there's exactly one key scheme to keep straight.

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const PHONE_KEY = "userPhone";
const EMAIL_KEY = "userEmail";
const ROLE_KEY = "userRole";
const WORKSPACE_KEY = "workspaceId";

export type StoredProfile = {
  phone: string | null;
  email: string | null;
  role: string | null;
  workspaceId: string | null;
};

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredProfile(): Promise<StoredProfile> {
  const [phone, email, role, workspaceId] = await Promise.all([
    AsyncStorage.getItem(PHONE_KEY),
    AsyncStorage.getItem(EMAIL_KEY),
    AsyncStorage.getItem(ROLE_KEY),
    AsyncStorage.getItem(WORKSPACE_KEY),
  ]);
  return { phone, email, role, workspaceId };
}

export async function saveSessionData(params: {
  token: string;
  refreshToken?: string | null;
  phone: string;
  email: string;
  role?: string | null;
  workspaceId?: string | null;
}): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, params.token);
  if (params.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, params.refreshToken);
  }

  await AsyncStorage.setItem(PHONE_KEY, params.phone);
  await AsyncStorage.setItem(EMAIL_KEY, params.email);
  if (params.role) await AsyncStorage.setItem(ROLE_KEY, params.role);

  // Explicit set-or-remove, not skip-when-falsy — otherwise a user who
  // disconnects from their admin (workspace_id -> null server-side)
  // keeps a stale cached workspaceId locally forever, since nothing
  // ever overwrites it.
  if (params.workspaceId) {
    await AsyncStorage.setItem(WORKSPACE_KEY, params.workspaceId);
  } else {
    await AsyncStorage.removeItem(WORKSPACE_KEY);
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await AsyncStorage.multiRemove([PHONE_KEY, EMAIL_KEY, ROLE_KEY, WORKSPACE_KEY]);
}