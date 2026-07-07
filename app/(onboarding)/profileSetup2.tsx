// import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { router, useLocalSearchParams } from "expo-router";
// import * as Notifications from "expo-notifications";
// import ProgressDots from "../../components/progressDots";
// import { lightTheme, typography } from "../../theme/theme";
// const { colors } = lightTheme;

// export default function ProfileSetup2() {
//   const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();

//   const goNext = () =>
//     router.push({ pathname: "/(onboarding)/profileSetup3", params: { role, name } });

//   const goBack = () => router.back();

//   const handleAllow = async () => {
//     await Notifications.requestPermissionsAsync();
//     goNext();
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <View style={styles.header}>
//         <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
//       </View>

//       <View style={styles.container}>
//         <View style={styles.bellCircle}>
//           <Image
//                     source={require("../../assets/icons/notification.png")}
//                     style={styles.logo}
//          />
//         </View>
//         <Text style={[styles.title, typography.heading3]}>Allow Kaarya Siddhi to Notify</Text>

//         <View style={styles.card}>
//           <Text style={[styles.desc, typography.body]}>
//             Get notified about task deadlines and updates instantly.
//           </Text>
//           <TouchableOpacity style={styles.allowBtn} onPress={handleAllow}>
//             <Text style={[styles.allowBtnText, typography.subheading]}>Allow</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity onPress={goBack} style={styles.skipWrap}>
//           <Text style={[styles.back, typography.label]}>Back</Text>
//         </TouchableOpacity>
//         <TouchableOpacity onPress={goNext} style={styles.skipWrap}>
//           <Text style={[styles.skip, typography.label]}>Skip</Text>
//         </TouchableOpacity>

//         <View style={styles.dotsWrap}>
//           <ProgressDots total={3} current={2} />
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: colors.base.background },
//   header: {
//     backgroundColor: colors.brand.primary,
//     paddingVertical: 18,
//     paddingHorizontal: 12,
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   backBtn: { padding: 6, marginRight: 4 },
//   headerText: { color: "#fff" },
//   container: { flex: 1, paddingHorizontal: 30, paddingTop: 60, alignItems: "center",marginTop:60 },
//   bellCircle: { marginBottom: 12 },
//   title: { color: colors.text.primary, marginBottom: 24, textAlign: "center" },
//   card: {
//     backgroundColor: colors.base.surfaceL1,
//     borderRadius: 12,
//     padding: 24,
//     width: "100%",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: colors.base.border,
//   },
//   desc: { textAlign: "center", color: colors.text.secondary, marginBottom: 18 },
//   allowBtn: {
//     backgroundColor: colors.brand.primary,
//     borderRadius: 16,
//     paddingVertical: 16,
//     width: "100%",
//     alignItems: "center",
//   },
//   allowBtnText: { color: "#fff" },
//   skipWrap: { alignSelf: "flex-end", marginTop: 14 },
//   skip: { textDecorationLine: "underline", color: colors.text.primary,marginRight:5,marginTop:-28},
//   dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
//   logo:{height:80,width:80},
//   back:{
//     textDecorationLine: "underline", color: colors.text.primary,marginLeft:-320,
//   }
// });

import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const { colors } = lightTheme;

export default function ProfileSetup2() {
  const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();

  const goNext = () =>
    router.push({ pathname: "/(onboarding)/profileSetup3", params: { role, name } });

  const goBack = () => router.back();

  const saveNotificationPref = async (enabled: boolean) => {
    try {
      const savedEmail = await AsyncStorage.getItem('userEmail');
      if (!savedEmail) return;

      await supabase
        .from('users')
        .update({ notifications_enabled: enabled })
        .eq('email', savedEmail);
    } catch (error) {
      console.log('Could not save notification preference:', error);
    }
  };

  const handleAllow = async () => {
    const { granted } = await Notifications.requestPermissionsAsync();
    await saveNotificationPref(granted);
    goNext();
  };

  const handleSkip = async () => {
    await saveNotificationPref(false);
    goNext();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.bellCircle}>
          <Image
                    source={require("../../assets/icons/notification.png")}
                    style={styles.logo}
         />
        </View>
        <Text style={[styles.title, typography.heading3]}>Allow Kaarya Siddhi to Notify</Text>

        <View style={styles.card}>
          <Text style={[styles.desc, typography.body]}>
            Get notified about task deadlines and updates instantly.
          </Text>
          <TouchableOpacity style={styles.allowBtn} onPress={handleAllow}>
            <Text style={[styles.allowBtnText, typography.subheading]}>Allow</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goBack} style={styles.skipWrap}>
          <Text style={[styles.back, typography.label]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} style={styles.skipWrap}>
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
  container: { flex: 1, paddingHorizontal: 30, paddingTop: 60, alignItems: "center",marginTop:60 },
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
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  allowBtnText: { color: "#fff" },
  skipWrap: { alignSelf: "flex-end", marginTop: 14 },
  skip: { textDecorationLine: "underline", color: colors.text.primary,marginRight:5,marginTop:-28},
  dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
  logo:{height:80,width:80},
  back:{
    textDecorationLine: "underline", color: colors.text.primary,marginLeft:-320,
  }
});