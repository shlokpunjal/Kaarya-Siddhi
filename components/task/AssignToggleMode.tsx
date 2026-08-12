import { View, Text, TouchableOpacity } from "react-native";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

export type AssignMode = "person" | "team";

type Props = {
  value: AssignMode;
  onChange: (mode: AssignMode) => void;
  disabled?: boolean;
};

const OPTIONS: { key: AssignMode; label: string }[] = [
  { key: "person", label: "Person" },
  { key: "team", label: "Team" },
];

/**
 * Segmented toggle for choosing whether a task is assigned to a single
 * employee ("Person") or several at once ("Team"). The backend has no
 * multi-assignee concept (`tasks.assigned_to` is a single column), so
 * Team mode is a client-side convenience: it fans out into one identical
 * task per selected employee on submit (see useTaskForm).
 */
export function AssignModeToggle({ value, onChange, disabled }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.base.surfaceL2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.base.border,
        padding: 4,
        marginTop: 14,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            disabled={disabled}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              paddingVertical: moderateScale(10),
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? colors.brand.accent : "transparent",
            }}
          >
            <Text
              style={{
                ...typography.body,
                fontWeight: active ? "600" : "400",
                color: active ? colors.base.surfaceL1 : colors.text.secondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}