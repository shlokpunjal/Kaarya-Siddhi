import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";

type EmptyTasksScreenProps = {
  badgeCount?: number;
  illustration: ImageSourcePropType;
  notificationsRoute: string;
  newTaskRoute: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
};

export default function EmptyTasksScreen({
  badgeCount = 0,
  illustration,
  notificationsRoute,
  newTaskRoute,
  title = "No tasks right now",
  subtitle = "You're all caught up. Rest or Initiate.",
  ctaLabel = "New Task",
}: EmptyTasksScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: colors.brand.primary }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: colors.brand.onPrimary, fontSize: 22 }]}>
            Kaarya Siddhi
          </Text>

          <TouchableOpacity
            onPress={() => router.push(notificationsRoute)}
            style={[styles.bellButton, { backgroundColor: colors.brand.primary, borderWidth: 1, borderColor: colors.brand.accent }]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.brand.accent} />
            {badgeCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.status.pending }]} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Main content ── */}
      <View style={styles.content}>
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />

        <Text
          style={[
            typography.heading,
            { color: colors.text.primary, marginTop: 24, textAlign: "center" },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.text.secondary,
              marginTop: 6,
              textAlign: "center",
              maxWidth: wp(70),
            },
          ]}
        >
          {subtitle}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(newTaskRoute)}
          style={[styles.newTaskButton, { backgroundColor: colors.brand.accent }]}
        >
          <Ionicons name="add" size={28} color={colors.base.surfaceL1} style={{ marginRight: 10 }} />
          <Text style={[typography.subheading, { color: colors.base.surfaceL1, textAlign: "center" }]}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: moderateScale(64),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(6.4),
  },
  bellButton: {
    position: "relative",
    height: moderateScale(40),
    width: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    height: moderateScale(9),
    width: moderateScale(9),
    borderRadius: moderateScale(4.5),
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  illustration: {
    width: moderateScale(200),
    height: moderateScale(200),
  },
  newTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: moderateScale(56),
    paddingHorizontal: 40,
    borderRadius: 32,
    marginTop: 36,
  },
});