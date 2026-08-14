import { useEffect } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "../utils/authFetch";
import LoadingAssetsScreen from "../components/common/LoadingAssetsScreen";
import { useAppReady } from "../context/AppReadyContext";

export default function Index() {
  const { setAppReady } = useAppReady();

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // Session token lives in SecureStore (see AuthContext.tsx /
      // secureSession.ts), not AsyncStorage — role is re-validated
      // against the backend on every launch via /me rather than trusted
      // from local storage.
      const token = await SecureStore.getItemAsync("token");
      const savedRole = await AsyncStorage.getItem("userRole");

      // No saved session → show Login Choice
      if (!token) {
        router.replace("/(auth)/LoginChoice");
        setAppReady();
        return;
      }

      // Validate the token against the backend before trusting it
      const res = await authFetch("/me");

      if (!res.ok) {
        // authFetch already wipes storage + redirects to LoginChoice on a real 401
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
      // console.log(err);
      router.replace("/(auth)/LoginChoice");
      setAppReady();
    }
  }

  // Only actually visible if MAX_HOLD_MS in the root layout is hit —
  // the branded splash overlay covers this in the normal case.
  return <LoadingAssetsScreen />;
}