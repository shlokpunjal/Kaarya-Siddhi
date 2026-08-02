import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

type Props = {
  date: Date | null;
  onChangeDate: (event: any, selected?: Date) => void;
  onClear: () => void;
  showPicker: boolean;
  onOpen: () => void;
};

export function DeadlinePicker({
  date,
  onChangeDate,
  onClear,
  showPicker,
  onOpen,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          ...typography.body,
          color: colors.text.secondary,
          marginBottom: 6,
          paddingLeft: 4,
        }}
      >
        Deadline
      </Text>

      <TouchableOpacity
        onPress={onOpen}
        style={{
          backgroundColor: colors.base.surfaceL2,
          height: moderateScale(50),
          borderRadius: 12,
          borderColor: date ? colors.brand.accent : colors.base.border,
          borderWidth: date ? 1.5 : 1,
          paddingHorizontal: 15,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            ...typography.body,
            color: date ? colors.text.primary : colors.text.secondary,
          }}
        >
          {date
            ? date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Select deadline date"}
        </Text>
        <Ionicons
          name={date ? "calendar" : "calendar-outline"}
          size={20}
          color={date ? colors.brand.accent : colors.text.secondary}
        />
      </TouchableOpacity>

      {date && (
        <TouchableOpacity
          onPress={onClear}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 6,
            paddingLeft: 4,
          }}
        >
          <Ionicons
            name="close-circle-outline"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={{ ...typography.label, color: colors.text.secondary }}>
            Clear date
          </Text>
        </TouchableOpacity>
      )}

      {showPicker && (
        <DateTimePicker
          value={date ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onChangeDate}
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
}