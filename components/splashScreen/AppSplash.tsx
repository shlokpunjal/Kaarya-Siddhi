// components/AppSplash.tsx
//
// This screen must stay pixel-identical to the native splash configured
// in app.json (same backgroundColor, same logo, same position) so the
// handoff from native splash -> this component is invisible to the user.
// Do not change SPLASH_BG without also updating the "backgroundColor"
// in the expo-splash-screen plugin config in app.json.

import { View, Text, Image, StyleSheet } from "react-native";

export const SPLASH_BG = "#192744";

export default function AppSplash() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/splash-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Kaarya Siddhi</Text>
      <Text style={styles.titleHindi}>कार्य सिद्धि</Text>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Developed By</Text>
        <Text style={styles.footerValue}>DRM SUR, Central Railways</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 190,
    height: 190,
  },
  title: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: "700",
    color: "#F2E9DC",
    letterSpacing: 0.5,
  },
  titleHindi: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
    color: "#F5A623",
  },
  footer: {
    position: "absolute",
    bottom: 56,
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 14,
    color: "#8B93A7",
  },
  footerValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: "#F2E9DC",
  },
});