import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
        gestureEnabled: false,
        animation: "slide_from_right",
      }} 
    >
      <Stack.Screen name="profileSetup1" />
      <Stack.Screen name="profileSetup2" />
      <Stack.Screen name="privacyPolicy" />
      <Stack.Screen name="profileSetup3" />
    </Stack>
  );
}