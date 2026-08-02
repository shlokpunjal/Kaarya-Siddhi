import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";

type Props = {
  title: string;
  /** Defaults to router.back() — pass a custom handler only if a screen needs one. */
  onBack?: () => void;
};

/**
 * Was byte-for-byte identical in admin.tsx, employee.tsx,
 * admin-connection-review.tsx, admin-request-review.tsx, and
 * employee-request-detail.tsx (the last one folded the onPrimary/surfaceL1
 * fallback back into the shared brand.onPrimary color).
 */
export default function ScreenHeader({ title, onBack }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: colors.brand.primary,
        height: moderateScale(60),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
      }}
    >
      <Ionicons
        onPress={onBack ?? (() => router.back())}
        name="arrow-back"
        size={moderateScale(26)}
        color={colors.brand.onPrimary}
      />
      <Text
        style={{
          ...typography.heading,
          color: colors.brand.onPrimary,
          marginLeft: 15,
        }}
      >
        {title}
      </Text>
    </View>
  );
}