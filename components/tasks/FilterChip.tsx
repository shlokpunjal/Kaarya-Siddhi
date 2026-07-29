import { Pressable, Text } from "react-native";
import { typography } from "../../theme/theme";
import { taskListStyles } from "../../styles/taskListStyles";

type ThemeColors = any;

type Props = {
  colors: ThemeColors;
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Deliberately decoupled from FilterType: it just renders a selectable pill.
// The parent decides what "selected" and "onPress" mean for its own filter type.
export default function FilterChip({ colors, label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        taskListStyles.chip,
        {
          backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
          borderColor: selected ? colors.brand.accent : colors.base.border,
        },
      ]}
    >
      <Text style={[typography.label, { color: selected ? "#FFFFFF" : colors.text.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}