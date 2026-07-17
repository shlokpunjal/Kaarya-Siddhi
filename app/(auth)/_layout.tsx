import { Stack } from "expo-router";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { LoadingProvider } from "../../context/LoadingContext";

import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // splash screen is still covering this
  }
  return (
    <LoadingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "flip",
          animationDuration: 300,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: "#fff" },
        }}
      >
        {/* Entry point of the auth flow — no slide-in on cold launch */}
        <Stack.Screen name="LoginChoice" options={{ animation: "none" }} />

        {/* LoginChoice -> AdminLogin / EmployeeLogin: standard forward push */}
        <Stack.Screen
          name="AdminLogin"
          options={{ animation: "flip" }}
        />
        <Stack.Screen
          name="EmployeeLogin"
          options={{ animation: "slide_from_right" }}
        />

        {/* Login -> Signup (same role): also a forward push, feels like "another door" */}
        <Stack.Screen
          name="AdminSignup"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="EmployeeSignup"
          options={{ animation: "slide_from_right" }}
        />

        {/* Signup -> OTP: fade, since it's a step *within* the same signup flow, not a new place */}
        <Stack.Screen
          name="OtpVerify"
          options={{
            animation: "fade",
            animationDuration: 200,
          }}
        />

        {/* Admin connection request flow */}
        <Stack.Screen
          name="RequestAdmin"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="WaitingApproval"
          options={{
            animation: "fade",
            gestureEnabled: false, // don't let them swipe back into the request form mid-approval
          }}
        />
      </Stack>
    </LoadingProvider>
  );
}
