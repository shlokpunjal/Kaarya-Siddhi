import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";
import type { EmployeeProfile } from "../../hooks/useEmployeeAutocomplete";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (emp: EmployeeProfile) => void;
  selectedEmployeeId: string | null;
  filteredEmployees: EmployeeProfile[];
  showDropdown: boolean;
  inputStyle: object;
};

/** The "Assign to" search field + filtered dropdown from newtask.tsx. */
export function EmployeeAutocompleteInput({
  value,
  onChangeText,
  onSelect,
  selectedEmployeeId,
  filteredEmployees,
  showDropdown,
  inputStyle,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ zIndex: 10 }}>
      <TextInput
        placeholder="Assign to (Type employee name...)"
        placeholderTextColor={colors.text.secondary}
        value={value}
        onChangeText={onChangeText}
        style={[
          inputStyle,
          selectedEmployeeId
            ? { borderColor: colors.brand.accent, borderWidth: 1.5 }
            : {},
        ]}
      />
      {selectedEmployeeId && (
        <View style={{ position: "absolute", right: 12, top: 26 }}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.brand.accent}
          />
        </View>
      )}
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
    </View>
  );
}