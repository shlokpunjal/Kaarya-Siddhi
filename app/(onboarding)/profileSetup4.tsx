import { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { wp, hp, moderateScale } from "../../utils/responsive";

const { colors } = lightTheme;

export default function ProfileSetup3() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => router.back();

  const handleLetsGo = async () => {
    try {
      setSubmitting(true);

      const savedEmail = await AsyncStorage.getItem('userEmail');
      if (savedEmail) {
        const { error } = await supabase
          .from('users')
          .update({ is_profile_setup: true })
          .eq('email', savedEmail);

        if (error) throw error;
      }

      if (role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(employee)");
      }
    } catch (error) {
      console.log('Could not finalize profile setup:', error);
      // Still let the user in even if this write fails, so they're not stuck
      if (role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(employee)");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
            <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
    </View>

      <View style={styles.container}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={[styles.title, typography.heading3]}>You are all set!</Text>

        <View style={styles.card}>
          <Text style={[styles.desc, typography.body]}>Your workspace is ready.</Text>
          <TouchableOpacity style={styles.goBtn} onPress={handleLetsGo} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.goBtnText, typography.subheading]}>Let's go!</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={goBack} style={styles.back}>
            <Text style={[styles.back, typography.label]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.dotsWrap}>
          <ProgressDots total={4} current={4} />
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
  paddingHorizontal: wp(5.3),
  height: moderateScale(72),
  flexDirection: "row",
  alignItems: "center",
},
  headerText: { color: "#fff" },
  backBtn: { padding: 6, marginRight: 4 },
  container: { flex: 1, paddingHorizontal: wp(8), paddingTop: hp(7.4), alignItems: "center",marginTop:hp(6.2) },
  logo: { width:moderateScale( 100), height: moderateScale(100), borderRadius: 35, marginBottom: 10 },
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
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
   
  },
  goBtnText: { color: "#fff" },
  dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
  back:{ textDecorationLine: "underline", color: colors.text.primary,marginTop:5,marginLeft:-100}
});