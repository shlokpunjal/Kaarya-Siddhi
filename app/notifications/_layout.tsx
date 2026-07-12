// app/notifications/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../context/ThemeContext";

export default function NotificationsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.base.background },
      }}
    >
      <Stack.Screen name="employee" />
      <Stack.Screen name="employee-request-detail" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-request-review" />

      <Stack.Screen
        name="admin-requests-list"
        options={{
          presentation: "transparentModal",
          animation: "none",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}