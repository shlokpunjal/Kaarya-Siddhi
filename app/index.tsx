import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { authFetch } from "../utils/authFetch";

export default function Index() {
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const token = await SecureStore.getItemAsync("token");
      const savedRole = await AsyncStorage.getItem("userRole");

      // No saved session → show Login Choice
      if (!token) {
        router.replace("/(auth)/LoginChoice");
        return;
      }

      // Validate the token against the backend before trusting it
      const res = await authFetch("/me");

      if (!res.ok) {
        // authFetch already wipes storage + redirects to LoginChoice on a real 401
        return;
      }

      const user = await res.json();

      if (user.role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(employee)");
      }
    } catch (err) {
      console.log(err);
      router.replace("/(auth)/LoginChoice");
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A214F" />
    </View>
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