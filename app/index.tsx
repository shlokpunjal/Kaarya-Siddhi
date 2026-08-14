import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { authFetch } from "../utils/authFetch";
import LoadingAssetsScreen from "../components/common/LoadingAssetsScreen"; // adjust path
import { useAppReady } from "../context/AppReadyContext";


export default function Index() {
  const { setAppReady } = useAppReady();

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const token = await SecureStore.getItemAsync("token");
      const savedRole = await AsyncStorage.getItem("userRole");

      if (!token) {
        router.replace("/(auth)/LoginChoice");
        setAppReady();
        return;
      }

      const res = await authFetch("/me");

      if (!res.ok) {
        setAppReady();
        return;
      }

      const user = await res.json();

      if (user.role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(employee)");
      }
      setAppReady();
    } catch (err) {
      router.replace("/(auth)/LoginChoice");
      setAppReady();
    }
  }
  return (
    <LoadingAssetsScreen />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});