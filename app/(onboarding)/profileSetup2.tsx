import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";

const { colors } = lightTheme;

export default function ProfileSetup2() {
  const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();

  const goNext = () =>
    router.push({ pathname: "/(onboarding)/profileSetup3", params: { role, name } });

  const goBack = () => router.back();

  const handleAllow = async () => {
    await Notifications.requestPermissionsAsync();
    goNext();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.bellCircle}>
          <Ionicons name="notifications" size={48} color={colors.brand.accent} />
        </View>
        <Text style={[styles.title, typography.heading3]}>Allow Kaarya Siddhi to Notify</Text>

        <View style={styles.card}>
          <Text style={[styles.desc, typography.body]}>
            Get notified about task deadlines and updates instantly.
          </Text>
          <TouchableOpacity style={styles.allowBtn} onPress={handleAllow}>
            <Text style={[styles.allowBtnText, typography.heading3]}>Allow</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goNext} style={styles.skipWrap}>
          <Text style={[styles.skip, typography.label]}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.dotsWrap}>
          <ProgressDots total={3} current={2} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base.background },
  header: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 6, marginRight: 4 },
  headerText: { color: "#fff" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60, alignItems: "center" },
  bellCircle: { marginBottom: 12 },
  title: { color: colors.text.primary, marginBottom: 24, textAlign: "center" },
  card: {
    backgroundColor: colors.base.surfaceL1,
    borderRadius: 12,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.base.border,
  },
  desc: { textAlign: "center", color: colors.text.secondary, marginBottom: 18 },
  allowBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  allowBtnText: { color: "#fff" },
  skipWrap: { alignSelf: "flex-end", marginTop: 14 },
  skip: { textDecorationLine: "underline", color: colors.text.primary },
  dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
});