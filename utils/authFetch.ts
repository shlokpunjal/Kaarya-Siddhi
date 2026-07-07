import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { API_BASE_URL } from "../constants/api";

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await AsyncStorage.multiRemove([
      "token",
      "userPhone",
      "userEmail",
      "userRole",
      "workspaceId",
    ]);
    router.replace("/(auth)/LoginChoice");
  }

  return response;
}