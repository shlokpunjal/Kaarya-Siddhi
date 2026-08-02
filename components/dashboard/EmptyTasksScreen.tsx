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
};

export default function EmptyTasksScreen({
  badgeCount = 0,
  illustration,
  notificationsRoute,
  newTaskRoute,
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
            style={[styles.bellButton, { backgroundColor: colors.base.surfaceL2 }]}
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

        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 10 }]}>
          You completed all tasks.
        </Text>
        <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 4 }]}>
          You have no tasks.
        </Text>

        <TouchableOpacity
          onPress={() => router.push(newTaskRoute)}
          style={[styles.newTaskButton, { backgroundColor: colors.brand.accent }]}
        >
          <Ionicons name="add" size={22} color={colors.base.surfaceL1} />
          <Text style={[typography.subheading, { color: colors.base.surfaceL1, fontSize: 18 }]}>
            New Task
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: moderateScale(56),
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
    boxShadow: "0px 0px 5px gray",
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
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 36,
  },
});