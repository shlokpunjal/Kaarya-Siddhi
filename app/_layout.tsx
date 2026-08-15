import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import OfflineScreen from "../components/common/OfflineScreen";
import { useNotificationBridge } from "../hooks/useNotificationBridge";
import { AppReadyProvider, useAppReady } from "../context/AppReadyContext";

// Prevent the native splash screen from disappearing automatically —
// we control exactly when it hides below, instead of it vanishing the
// instant the JS bundle mounts.
SplashScreen.preventAutoHideAsync();

const BRAND_PRIMARY = "#1A2744";

// Minimum time the splash stays up even if the app is ready sooner (so
// it never reads as a flash on a fast connection), and a hard ceiling
// so a stalled network never leaves the splash on screen forever.
const MIN_HOLD_MS = 900;
const MAX_HOLD_MS = 6000;

/**
 * Notification Bridge
 *
 * Keeps the existing notification bridge active.
 * The actual implementation lives inside
 * hooks/useNotificationBridge.ts.
 */
function NotificationBridge() {
  useNotificationBridge();
  return null;
}

export default function RootLayout() {
  return (
    <AppReadyProvider>
      <RootLayoutInner />
    </AppReadyProvider>
  );
}

function RootLayoutInner() {
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
  });

  // Set by app/index.tsx once it has actually decided where to navigate
  // (session check resolved) — this is what the native splash waits on,
  // instead of guessing a fixed duration and risking an early reveal of
  // an unstyled in-between loading state if the backend is slow.
  const { appReady } = useAppReady();

  const [minHoldDone, setMinHoldDone] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const hidStarted = useRef(false);

  useEffect(() => {
    if (!fontsLoaded) return;
    const minTimer = setTimeout(() => setMinHoldDone(true), MIN_HOLD_MS);
    const maxTimer = setTimeout(() => setForceReady(true), MAX_HOLD_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [fontsLoaded]);

  useEffect(() => {
    if (hidStarted.current || !fontsLoaded) return;
    const canHide = forceReady || (minHoldDone && appReady);
    if (!canHide) return;

    hidStarted.current = true;
    SplashScreen.hideAsync();
  }, [fontsLoaded, minHoldDone, appReady, forceReady]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: BRAND_PRIMARY }} />;
  }

  return (
    <AuthProvider>
      {/*
        IMPORTANT PROVIDER ORDER

        ThemeProvider must be above ToastProvider because
        ToastItem uses useTheme().

        ToastProvider must be above Stack because screens such
        as OtpVerify use useToast().
      */}
      <ThemeProvider>
        <ToastProvider>
          {/* Existing notification bridge is preserved */}
          <NotificationBridge />

          <OfflineScreen>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: BRAND_PRIMARY,
                },
              }}
            >
             <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />

              {/* Onboarding */}
              <Stack.Screen name="(onboarding)" />

              {/* Employee */}
              <Stack.Screen name="(employee)" />

              {/* Admin */}
              <Stack.Screen name="(admin)" />

              {/* Tasks */}
              <Stack.Screen name="(task)/task-detail" />
              <Stack.Screen name="(task)/newtask" />
              <Stack.Screen name="(task)/extend-deadline" />

              {/* Chat */}
              <Stack.Screen name="(chat)" />

              {/* Reports */}
              <Stack.Screen name="reports/genExcel" />
              <Stack.Screen name="reports/genPdf" />
              <Stack.Screen name="reports/pdfViewer" />
            </Stack>
          </OfflineScreen>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}