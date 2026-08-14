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
// This also calls configureNotificationHandler() at import time, so the
// foreground-presentation config (shouldShowBanner/List/Sound) is set up
// as soon as this module loads — no separate setNotificationHandler call
// needed here anymore.
import { useNotificationBridge } from "../hooks/useNotificationBridge";
import { AppReadyProvider, useAppReady } from "../context/AppReadyContext";

// enableScreens(false);
SplashScreen.preventAutoHideAsync();

const BRAND_PRIMARY = "#1A2744";
const BRAND_ACCENT = "#E8870A";
const BRAND_SHADOW = "#815727";
const TEXT_PRIMARY = "#F0EDE6";
const TEXT_SECONDARY = "#8B95A1";
const LOGO_SIZE = 114;
const MIN_HOLD_MS = 900;
const MAX_HOLD_MS = 6000;

// Was: a full second copy of push-token registration + realtime
// subscription + notification-tap routing, inlined here as
// `NotificationBridge` — separate from, and slowly drifting out of
// sync with, hooks/useNotificationBridge.ts (which existed in the repo
// but was never actually mounted anywhere). Replaced with a thin
// wrapper around the one real implementation so there's a single
// source of truth again.
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

  const { appReady } = useAppReady();

  const [showSplash, setShowSplash] = useState(true);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const fadeStarted = useRef(false);

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
    return <View style={{ flex: 1, backgroundColor: BRAND_PRIMARY }} />;
  }

  return (
    <AuthProvider>
      <NotificationBridge />

      <ThemeProvider>
        <ToastProvider>
          <OfflineScreen>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: BRAND_PRIMARY },
              }}
            >
             <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(employee)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(task)/task-detail" />
              <Stack.Screen name="(task)/newtask" />
              <Stack.Screen name="(task)/extend-deadline" />
              <Stack.Screen name="(chat)" />
              <Stack.Screen name="reports/genExcel" />
              <Stack.Screen name="reports/genPdf" />
              <Stack.Screen name="reports/pdfViewer" />
            </Stack>
          </OfflineScreen>
        </ToastProvider>

        {showSplash && (
          <Animated.View
            pointerEvents="none"
            style={[styles.splash, { opacity: splashOpacity }]}
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
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0.1,
  },
  subTitle: {
    color: BRAND_ACCENT,
    textShadowColor: BRAND_SHADOW,
    textShadowOffset: { width: 1, height: 1 },
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
