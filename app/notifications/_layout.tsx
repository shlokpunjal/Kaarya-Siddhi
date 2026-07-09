// app/notifications/_layout.tsx
//
// Stack for the notifications flow. Default screens slide in from the right
// (standard push). The two "requests list" screens are presented as bottom
// sheets — slide up from the bottom, dimmed backdrop, drag-to-dismiss.
//
// NOTE: if you already have a _layout.tsx in this folder with other screens
// registered in it, merge the two <Stack.Screen> blocks below into it instead
// of replacing the whole file.

import React from "react";
import { Stack } from "expo-router";

export default function NotificationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="employee" />
      <Stack.Screen name="employee-request-detail" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-request-review" />

      <Stack.Screen
        name="employee-requests-list"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="admin-requests-list"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
