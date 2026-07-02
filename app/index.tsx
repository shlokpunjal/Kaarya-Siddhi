
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export default function Index() {
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // This app uses a custom OTP login (see hooks/useAuth.ts), not
      // Supabase Auth, so the session lives in AsyncStorage — not
      // supabase.auth.getSession(), which will always be empty here.
      const token = await AsyncStorage.getItem("token");
      const email = await AsyncStorage.getItem("userEmail");
      const savedRole = await AsyncStorage.getItem("userRole");

      // No saved session → show Login Choice
      if (!token || !email) {
        router.replace("/(auth)/LoginChoice");
        return;
      }

      // Fast path: role already known from login, skip the DB round-trip
      if (savedRole === "admin") {
        router.replace("/(admin)");
        return;
      }
      if (savedRole === "employee") {
        router.replace("/(employee)");
        return;
      }

      // Fallback for older sessions saved before role was persisted
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.log(error);
        router.replace("/(auth)/LoginChoice");
        return;
      }

      if (data.role === "admin") {
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