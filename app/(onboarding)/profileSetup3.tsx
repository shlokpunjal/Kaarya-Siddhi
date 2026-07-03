import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";
import { Ionicons } from "@expo/vector-icons";
const { colors } = lightTheme;

export default function ProfileSetup3() {
  const { role } = useLocalSearchParams<{ role: string }>();
 const goBack = () => router.back();
  const handleLetsGo = () => {
    // TODO: mark onboarding complete (AsyncStorage / backend flag)
    if (role === "admin") {
      router.replace("/(admin)");
    } else {
      router.replace("/(employee)");
    }
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
        <Image
          source={require("../../assets/images/logo.jpeg")}
          style={styles.logo}
        />
        <Text style={[styles.title, typography.heading3]}>You are all set!</Text>

        <View style={styles.card}>
          <Text style={[styles.desc, typography.body]}>Your workspace is ready.</Text>
          <TouchableOpacity style={styles.goBtn} onPress={handleLetsGo}>
            <Text style={[styles.goBtnText, typography.heading3]}>Let's go!</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dotsWrap}>
          <ProgressDots total={3} current={3} />
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
  paddingHorizontal: 20,
  height: 72,
  flexDirection: "row",      // ← add this
  alignItems: "center",      // ← and this
},
  headerText: { color: "#fff" },
  backBtn: { padding: 6, marginRight: 4 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60, alignItems: "center" },
  logo: { width: 70, height: 70, borderRadius: 35, marginBottom: 10 },
  title: { color: colors.text.primary, marginBottom: 24 },
  card: {
    backgroundColor: colors.base.surfaceL1,
    borderRadius: 12,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.base.border,
  },
  desc: { color: colors.text.secondary, marginBottom: 18 },
  goBtn: {
    backgroundColor: colors.brand.accent,
    borderRadius: 8,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  goBtnText: { color: "#fff" },
  dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
});