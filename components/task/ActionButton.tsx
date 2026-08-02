import { Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Defaults to colors.brand.accent */
  color?: string;
  disabledColor?: string;
  style?: object;
};

/**
 * The full-width pill button repeated for every task action:
 * Mark Complete, Ask to Review, Extend Deadline, Suggest Changes, Submit.
 */
export function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  color,
  disabledColor,
  style,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        height: moderateScale(50),
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: disabled
          ? (disabledColor ?? colors.base.border)
          : (color ?? colors.brand.accent),
        opacity: loading ? 0.7 : 1,
        ...style,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.base.surfaceL1} />
      ) : (
        <Text
          numberOfLines={1}
          style={{ color: colors.brand.onPrimary, ...typography.subheading }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}