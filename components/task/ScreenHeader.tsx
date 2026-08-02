import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

type Props = {
  title: string;
  /** Icon shown on the right (e.g. "trash-outline"). Omit for no action. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightDisabled?: boolean;
  rightLoading?: boolean;
};

/**
 * The brand-colored header bar repeated across newtask.tsx, task-detail.tsx
 * and taskDetailAdmin.tsx: back arrow, centered title, optional right icon
 * (delete, in these screens).
 */
export function ScreenHeader({
  title,
  rightIcon,
  onRightPress,
  rightDisabled,
  rightLoading,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: colors.brand.primary,
        height: moderateScale(70),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
      }}
    >
      <Ionicons
        onPress={() => router.back()}
        name="arrow-back"
        size={moderateScale(28)}
        color={colors.brand.onPrimary}
      />
      <Text
        style={{
          ...typography.heading,
          color: colors.brand.onPrimary,
          flex: 1,
          textAlign: "center",
          marginRight: rightIcon ? 0 : moderateScale(28),
        }}
      >
        {title}
      </Text>

      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} disabled={rightDisabled}>
          {rightLoading ? (
            <ActivityIndicator size="small" color={colors.brand.onPrimary} />
          ) : (
            <Ionicons
              name={rightIcon}
              size={moderateScale(22)}
              color={colors.brand.onPrimary}
            />
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: moderateScale(22) }} />
      )}
    </View>
  );
}