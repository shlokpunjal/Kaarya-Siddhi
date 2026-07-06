// app/(onboarding)/_layout.tsx
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,   // hide default header, we use our own custom header per screen
        gestureEnabled: false, // disable swipe-back so users can't skip steps accidentally
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="profileSetup1" />
      <Stack.Screen name="profileSetup2" />
      <Stack.Screen name="profileSetup3" />
    </Stack>
  );
}