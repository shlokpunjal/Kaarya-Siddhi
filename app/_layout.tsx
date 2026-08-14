import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Image, Text, Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { ThemeProvider } from "../context/ThemeContext";
import { typography } from "../theme/theme";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import OfflineScreen from "../components/common/OfflineScreen";
import { useNotificationBridge } from "../hooks/useNotificationBridge";
import { AppReadyProvider, useAppReady } from "../context/AppReadyContext";

// Prevent the native splash screen from disappearing automatically.
SplashScreen.preventAutoHideAsync();

const BRAND_PRIMARY = "#1A2744";
const BRAND_ACCENT = "#E8870A";
const BRAND_SHADOW = "#815727";
const TEXT_PRIMARY = "#F0EDE6";
const TEXT_SECONDARY = "#8B95A1";
const LOGO_SIZE = 114;

// Minimum time the brand splash stays up even if the app is ready sooner
// (so it never reads as a flash on a fast connection), and a hard ceiling
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
  // (session check resolved) — this is what the splash waits on, instead
  // of guessing a fixed duration and risking a reveal of an unstyled
  // in-between loading state if the backend is slow to respond.
  const { appReady } = useAppReady();

  const [showSplash, setShowSplash] = useState(true);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const fadeStarted = useRef(false);

  /**
   * Hide the native splash the moment fonts are ready, then start the
   * min-hold / max-hold timers that govern when the custom splash fades.
   */
  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();

    const minTimer = setTimeout(() => setMinHoldDone(true), MIN_HOLD_MS);
    const maxTimer = setTimeout(() => setForceReady(true), MAX_HOLD_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [fontsLoaded]);

  /**
   * Fade the custom splash out once either:
   * - the min hold has elapsed AND the app has signalled it's ready, or
   * - the max hold ceiling was hit (safety net for a stalled session check)
   */
  useEffect(() => {
    if (fadeStarted.current || !fontsLoaded) return;
    const canFade = forceReady || (minHoldDone && appReady);
    if (!canFade) return;

    fadeStarted.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start(() => setShowSplash(false));
  }, [fontsLoaded, minHoldDone, appReady, forceReady]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BRAND_PRIMARY,
        }}
      />
    );
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

          {/*
            Custom splash screen.

            It is inside ThemeProvider and ToastProvider,
            but it doesn't use either context, so it won't
            cause any provider problems.
          */}
          {showSplash && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.splash,
                {
                  opacity: splashOpacity,
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>

              <Text style={[typography.heading, styles.title]}>
                Kaarya Siddhi
              </Text>

              <Text style={[typography.heading, styles.subTitle]}>
                कार्य सिद्धि
              </Text>

              <View style={styles.footer}>
                <Text style={[typography.label, styles.credits]}>
                  Developed By
                </Text>

                <Text style={[typography.heading3, styles.subCredits]}>
                  DRM SUR, Central Railways
                </Text>
              </View>
            </Animated.View>
          )}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  title: {
    color: TEXT_PRIMARY,
    textShadowColor: BRAND_SHADOW,
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 0.1,
  },

  subTitle: {
    color: BRAND_ACCENT,
    textShadowColor: BRAND_SHADOW,
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 0.01,
  },

  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },

  credits: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    textAlign: "center",
  },

  subCredits: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    textAlign: "center",
  },
});