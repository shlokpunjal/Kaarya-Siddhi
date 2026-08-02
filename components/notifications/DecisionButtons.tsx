import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import { cardShadow } from "../../utils/notifications/cardShadow";

type Props = {
  onAccept: () => void;
  onReject: () => void;
  /** Which button is mid-request, if any. Pass null when neither is busy
   *  (e.g. admin-request-review.tsx, where these buttons just open a
   *  confirm modal and never show their own spinner). */
  busy?: "accepted" | "rejected" | null;
  disabled?: boolean;
  acceptLabel?: string;
  rejectLabel?: string;
};

/**
 * Was near-identical in admin-connection-review.tsx and
 * admin-request-review.tsx. One visual note: admin-connection-review.tsx
 * used colors.base.surfaceL1 for icon/text/spinner color while
 * admin-request-review.tsx used colors.brand.onPrimary — standardized on
 * brand.onPrimary here. Flag if you want the connection-review screen to
 * look pixel-identical to before; otherwise this is a harmless (likely
 * unintentional) visual unification.
 */
export default function DecisionButtons({
  onAccept,
  onReject,
  busy = null,
  disabled = false,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || busy !== null;

  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <TouchableOpacity
        onPress={onAccept}
        disabled={isDisabled}
        style={{
          flex: 1,
          height: moderateScale(54),
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: colors.status.completed,
          opacity: isDisabled ? 0.7 : 1,
          ...cardShadow,
        }}
      >
        {busy === "accepted" ? (
          <ActivityIndicator color={colors.brand.onPrimary} />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={colors.brand.onPrimary} />
            <Text style={{ ...typography.subheading, color: colors.brand.onPrimary }}>
              {acceptLabel}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onReject}
        disabled={isDisabled}
        style={{
          flex: 1,
          height: moderateScale(54),
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: colors.status.overdue,
          opacity: isDisabled ? 0.7 : 1,
          ...cardShadow,
        }}
      >
        {busy === "rejected" ? (
          <ActivityIndicator color={colors.brand.onPrimary} />
        ) : (
          <>
            <Ionicons name="close" size={20} color={colors.brand.onPrimary} />
            <Text style={{ ...typography.subheading, color: colors.brand.onPrimary }}>
              {rejectLabel}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}