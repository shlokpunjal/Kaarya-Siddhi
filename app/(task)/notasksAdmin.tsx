import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";

type NoTasksAdminProps = {
  pendingRequestCount?: number;
};

export default function NoTasksAdmin({ pendingRequestCount = 0 }: NoTasksAdminProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.base.background}}> 
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: colors.brand.primary,marginTop:25 }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: colors.brand.onPrimary, fontSize: 22 }]}>
            Kaarya Siddhi
          </Text>

          {/* Bell icon — same style, destination, and badge logic as the main dashboard */}
          <TouchableOpacity
            onPress={() => router.push("/notifications/admin")}
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.brand.accent} />
            {pendingRequestCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.status.pending }]} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Main content ── */}
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/notaskImage.png")}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 10 }]}>
          You completed all tasks.
        </Text>
        <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 4 }]}>
          You have no tasks.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/newtaskemp")}
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
    backgroundColor: "rgba(255,255,255,0.15)",
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
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 36,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});