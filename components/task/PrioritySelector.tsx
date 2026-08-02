import { View, Text, TouchableOpacity } from "react-native";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";
import type { Priority } from "../../hooks/task/useTaskForm";

export const PRIORITIES: {
  label: string;
  value: Priority;
  color: string;
  bg: string;
}[] = [
  { label: "Low", value: "low", color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Medium", value: "medium", color: "#E65100", bg: "#FFF3E0" },
  { label: "High", value: "high", color: "#B71C1C", bg: "#FFEBEE" },
];

type Props = {
  value: Priority | null;
  onChange: (p: Priority) => void;
};

export function PrioritySelector({ value, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {PRIORITIES.map((p) => {
        const isSelected = value === p.value;
        return (
          <TouchableOpacity
            key={p.value}
            onPress={() => onChange(p.value)}
            style={{
              flex: 1,
              height: moderateScale(44),
              borderRadius: 12,
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? p.color : colors.base.border,
              backgroundColor: isSelected ? p.bg : colors.base.surfaceL2,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <View
              style={{
                width: moderateScale(8),
                height: moderateScale(8),
                borderRadius: moderateScale(4),
                backgroundColor: isSelected ? p.color : colors.text.secondary,
              }}
            />
            <Text
              style={{
                ...typography.body,
                fontSize: moderateScale(14),
                fontWeight: isSelected ? "600" : "400",
                color: isSelected ? p.color : colors.text.secondary,
              }}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}