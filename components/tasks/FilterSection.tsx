import { ReactNode } from "react";
import { View, Text } from "react-native";
import { typography } from "../../theme/theme";
import { taskListStyles } from "../../styles/taskListStyles";

type ThemeColors = any;

type Props = {
  colors: ThemeColors;
  label?: string; // omit for the top ungrouped row (All / sort options)
  children: ReactNode; // FilterChip elements
};

export default function FilterSection({ colors, label, children }: Props) {
  return (
    <>
      {label && (
        <Text style={[typography.label, taskListStyles.sectionLabel, { color: colors.text.secondary }]}>
          {label}
        </Text>
      )}
      <View style={taskListStyles.chipRow}>{children}</View>
    </>
  );
}