import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";
import type { EmployeeProfile } from "../../hooks/task/useEmployeeAutocomplete";

type Props = {
  searchText: string;
  onChangeText: (text: string) => void;
  onSelect: (emp: EmployeeProfile) => void;
  onRemove: (id: string) => void;
  selected: EmployeeProfile[];
  filteredEmployees: EmployeeProfile[];
  showDropdown: boolean;
  inputStyle: object;
};

/**
 * "Assign to" field for Team mode. Lets the admin search and add several
 * employees, shown as chips underneath — each chip is individually
 * removable, so the team list stays fully editable right up to submit.
 */
export function TeamAssigneesInput({
  searchText,
  onChangeText,
  onSelect,
  onRemove,
  selected,
  filteredEmployees,
  showDropdown,
  inputStyle,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ zIndex: 10 }}>
      <TextInput
        placeholder="Add employees to team (type a name...)"
        placeholderTextColor={colors.text.secondary}
        value={searchText}
        onChangeText={onChangeText}
        style={inputStyle}
      />

      {showDropdown && filteredEmployees.length > 0 && (
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 12,
            marginTop: 4,
            maxHeight: moderateScale(180),
            overflow: "hidden",
          }}
        >
          {filteredEmployees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              onPress={() => onSelect(emp)}
              style={{
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.base.border,
                backgroundColor: colors.base.surfaceL2,
              }}
            >
              <Text style={{ ...typography.body, color: colors.text.primary }}>
                {emp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selected.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 12,
            gap: 8,
          }}
        >
          {selected.map((emp) => (
            <View
              key={emp.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.base.surfaceL2,
                borderColor: colors.brand.accent,
                borderWidth: 1,
                borderRadius: 20,
                paddingVertical: 6,
                paddingLeft: 12,
                paddingRight: 6,
              }}
            >
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.primary,
                  fontSize: moderateScale(13),
                  marginRight: 6,
                }}
              >
                {emp.name}
              </Text>
              <TouchableOpacity
                onPress={() => onRemove(emp.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {selected.length === 0 && (
        <Text
          style={{
            ...typography.body,
            fontSize: moderateScale(12),
            color: colors.text.secondary,
            marginTop: 8,
            paddingLeft: 4,
          }}
        >
          No employees added yet — search above to build the team.
        </Text>
      )}
    </View>
  );
}