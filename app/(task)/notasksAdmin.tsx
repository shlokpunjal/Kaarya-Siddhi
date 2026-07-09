import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";

export default function NoTasksAdmin() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.base.background}}> 
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: colors.brand.primary,marginTop:25 }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: colors.brand.onPrimary, fontSize: 22,marginTop:-20 }]}>
            Kaarya Siddhi
          </Text>
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
    height: 50,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  illustration: {
    width: 200,
    height: 200,
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