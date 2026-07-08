// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { router } from "expo-router";
// import { API_BASE_URL } from "../constants/api";

// export async function authFetch(path: string, options: RequestInit = {}) {
//   const token = await AsyncStorage.getItem("token");

//   const headers = {
//     "Content-Type": "application/json",
//     ...(options.headers || {}),
//     ...(token ? { Authorization: `Bearer ${token}` } : {}),
//   };

//   const response = await fetch(`${API_BASE_URL}${path}`, {
//     ...options,
//     headers,
//   });

//   if (response.status === 401) {
//     await AsyncStorage.multiRemove([
//       "token",
//       "userPhone",
//       "userEmail",
//       "userRole",
//       "workspaceId",
//     ]);
//     router.replace("/(auth)/LoginChoice");
//   }

//   return response;
// }

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

export async function authFetch(path: string, options: RequestInit = {}) {
  let token = await SecureStore.getItemAsync("token");

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
    const refreshToken = await SecureStore.getItemAsync("refreshToken");

    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("refreshToken", data.refresh_token);

        // Retry the original request once with the new access token
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: buildHeaders(data.token),
        });

        if (response.status !== 401) return response;
      }
    }

    // Refresh failed or no refresh token available — force logout
    await wipeAndRedirect();
  }

  return response;
}