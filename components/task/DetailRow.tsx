import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
};

/**
 * "🗓 Deadline: 12 Aug 2026" / "👤 Assigned By: Jane" — the same row
 * shape used repeatedly in both task-detail.tsx and taskDetailAdmin.tsx.
 */
export function DetailRow({ icon, label, value, valueColor }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={colors.text.secondary}
        style={{ marginRight: 8 }}
      />
      <Text style={{ ...typography.heading3, color: colors.text.primary }}>
        {label}:{" "}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          ...typography.body,
          color: valueColor ?? colors.text.secondary,
          flex: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}