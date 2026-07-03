import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import ProgressDots from "../../components/progressDots";

export default function ProfileSetup2() {
  const { role } = useLocalSearchParams<{ role: string }>();

  const handleAllow = async () => {
    await Notifications.requestPermissionsAsync();
    router.push({ pathname: "/(onboarding)/profileSetup3", params: { role } });
  };

  const handleSkip = () => {
    router.push({ pathname: "/(onboarding)/profileSetup3", params: { role } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile Setup</Text>
      </View>

      <Text style={styles.bell}>🔔</Text>
      <Text style={styles.title}>Allow Kaarya Siddhi to Notify</Text>

      <View style={styles.card}>
        <Text style={styles.desc}>Get notified about task deadlines and updates instantly.</Text>
        <TouchableOpacity style={styles.allowBtn} onPress={handleAllow}>
          <Text style={styles.allowBtnText}>Allow</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSkip}>
        <Text style={styles.skip}>Skip</Text>
      </TouchableOpacity>

      <ProgressDots total={4} current={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20, alignItems: "center" },
  header: { backgroundColor: "#0F1F3D", padding: 16, borderRadius: 6, marginBottom: 30, width: "100%" },
  headerText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  bell: { fontSize: 40, color: "#F5A623", marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 20, width: "100%", alignItems: "center" },
  desc: { textAlign: "center", color: "#666", marginBottom: 16 },
  allowBtn: { backgroundColor: "#0F1F3D", borderRadius: 6, paddingVertical: 12, width: "100%", alignItems: "center" },
  allowBtnText: { color: "#fff", fontWeight: "700" },
  skip: { alignSelf: "flex-end", marginTop: 12, textDecorationLine: "underline" },
});