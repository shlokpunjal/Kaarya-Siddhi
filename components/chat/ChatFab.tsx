import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import { useChatContacts } from "../../hooks/chat/useChatContacts";

/**
 * Absolutely-positioned floating button, meant to be dropped inside a
 * `<View style={{ flex: 1 }}>` wrapper around a Home tab screen (see
 * app/(employee)/index.tsx / app/(admin)/index.tsx) — sits on top
 * regardless of whether that screen is showing the skeleton, the empty
 * state, or the full dashboard underneath.
 */
export function ChatFab() {
  const { colors } = useTheme();
  const router = useRouter();
  const { totalUnread } = useChatContacts();

  const size = moderateScale(58);

  return (
    <TouchableOpacity
      onPress={() => router.push("/(chat)/contacts")}
      activeOpacity={0.85}
      style={{
        position: "absolute",
        right: moderateScale(20),
        bottom: moderateScale(24),
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brand.accent,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
        elevation: 6,
      }}
    >
      <Ionicons name="chatbubble-ellipses" size={moderateScale(26)} color="#FFFFFF" />
      {totalUnread > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: moderateScale(20),
            height: moderateScale(20),
            paddingHorizontal: 4,
            borderRadius: moderateScale(10),
            backgroundColor: colors.status.overdue,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: colors.base.background,
          }}
        >
          <Text style={{ ...typography.label, color: "#FFFFFF", fontSize: 11 }}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}