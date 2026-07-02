import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const ROLE_LOOKUP_TIMEOUT_MS = 8000;

type UserRole = "admin" | "employee";

function isUserRole(role: string | null): role is UserRole {
  return role === "admin" || role === "employee";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Role lookup timed out"));
    }, ms);

    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timeout));
  });
}

function routeForRole(role: UserRole) {
  router.replace(role === "admin" ? "/(admin)" : "/(employee)");
}

async function clearSessionAndShowLogin(error?: unknown) {
  if (error) {
    console.log("Startup session check failed:", error);
  }

  await AsyncStorage.multiRemove([
    "token",
    "userPhone",
    "userEmail",
    "userRole",
    "workspaceId",
  ]);

  router.replace("/(auth)/LoginChoice");
}

export default function Index() {
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const token = await AsyncStorage.getItem("token");
        const email = await AsyncStorage.getItem("userEmail");
        const savedRole = await AsyncStorage.getItem("userRole");

        if (!isMounted) {
          return;
        }

        if (!token || !email) {
          await clearSessionAndShowLogin();
          return;
        }

        if (isUserRole(savedRole)) {
          routeForRole(savedRole);
          return;
        }

        const roleQuery = supabase
          .from("users")
          .select("role")
          .eq("email", email)
          .single();

        const { data, error } = await withTimeout(
          Promise.resolve(roleQuery),
          ROLE_LOOKUP_TIMEOUT_MS
        );

        if (!isMounted) {
          return;
        }

        if (error || !isUserRole(data?.role ?? null)) {
          await clearSessionAndShowLogin(error);
          return;
        }

        await AsyncStorage.setItem("userRole", data.role);
        routeForRole(data.role);
      } catch (error) {
        if (isMounted) {
          await clearSessionAndShowLogin(error);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

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
