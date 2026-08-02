import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import { getStatusMeta, RequestStatus } from "../../utils/notifications/notificationMeta";

type Props = {
  status: RequestStatus;
  /** e.g. "Decided on 02 Aug 2026" */
  subtitle?: string;
};

/**
 * Was identical in admin-connection-review.tsx and admin-request-review.tsx.
 */
export default function StatusHero({ status, subtitle }: Props) {
  const { colors } = useTheme();
  const meta = getStatusMeta(colors, status, "solid");

  return (
    <View
      style={{
        backgroundColor: meta.color + "18",
        borderRadius: 20,
        padding: 22,
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <View
        style={{
          height: moderateScale(64),
          width: moderateScale(64),
          borderRadius: moderateScale(32),
          backgroundColor: meta.color + "26",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name={meta.icon} size={moderateScale(34)} color={meta.color} />
      </View>
      <Text style={{ ...typography.heading3, color: meta.color }}>{meta.label}</Text>
      {subtitle ? (
        <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}