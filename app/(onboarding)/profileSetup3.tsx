import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ProgressDots from "../../components/progressDots";

export default function ProfileSetup3() {
  const { role } = useLocalSearchParams<{ role: string }>();

  const handleLetsGo = () => {
    // Mark onboarding complete (AsyncStorage / backend flag) here
    if (role === "admin") {
      router.replace("/(admin)");
    } else {
      router.replace("/(employee)");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile Setup</Text>
      </View>

      <Text style={styles.icon}>🏁</Text>
      <Text style={styles.title}>You are all set!</Text>

      <View style={styles.card}>
        <Text style={styles.desc}>Your workspace is ready.</Text>
        <TouchableOpacity style={styles.goBtn} onPress={handleLetsGo}>
          <Text style={styles.goBtnText}>Let's go!</Text>
        </TouchableOpacity>
      </View>

      <ProgressDots total={4} current={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20, alignItems: "center" },
  header: { backgroundColor: "#0F1F3D", padding: 16, borderRadius: 6, marginBottom: 30, width: "100%" },
  headerText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  icon: { fontSize: 40, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 20, width: "100%", alignItems: "center" },
  desc: { color: "#999", marginBottom: 16 },
  goBtn: { backgroundColor: "#F5A623", borderRadius: 6, paddingVertical: 12, width: "100%", alignItems: "center" },
  goBtnText: { color: "#fff", fontWeight: "700" },
});