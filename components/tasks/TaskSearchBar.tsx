import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { taskListStyles } from "../../styles/taskListStyles";

type ThemeColors = any;

type Props = {
  colors: ThemeColors;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export default function TaskSearchBar({ colors, value, onChangeText, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={taskListStyles.searchRow}>
      <View
        style={[
          taskListStyles.searchBar,
          {
            backgroundColor: colors.base.surfaceL1,
            borderColor: focused ? colors.brand.accent : colors.base.border,
            borderWidth: focused ? 1.5 : 1,
          },
          focused && taskListStyles.searchBarFocused,
        ]}
      >
        <Ionicons
          name="search"
          size={18}
          color={focused ? colors.brand.accent : colors.text.secondary}
          style={taskListStyles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          style={[typography.body, taskListStyles.searchInput, { color: colors.text.primary }]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} hitSlop={10} style={taskListStyles.clearButton}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}