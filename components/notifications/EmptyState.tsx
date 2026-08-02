import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
  /** Vertical nudge, matches the ad-hoc offsets each screen had. Default -35 (admin.tsx's value). */
  offsetY?: number;
};

/**
 * Was near-identical in admin.tsx (used marginTop: -35, commented
 * "adjust if needed") and employee.tsx (used transform translateY: -40).
 * Unified on the transform approach — pass offsetY to match either.
 */
export default function EmptyState({
  icon = "notifications-outline",
  title = "You're all caught up",
  subtitle = "New notifications will show up here.",
  offsetY = -35,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        transform: [{ translateY: offsetY }],
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(0, 0, 0, 0.08)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={32} color={colors.text.secondary} />
      </View>

      <Text
        style={{
          ...typography.subheading,
          color: colors.text.primary,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        {title}
      </Text>

      <Text style={{ ...typography.body, color: colors.text.secondary, textAlign: "center" }}>
        {subtitle}
      </Text>
    </View>
  );
}