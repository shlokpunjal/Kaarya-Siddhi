import React, { useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getToken, getStoredProfile } from "../../lib/secureSession";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";

export default function LoginChoice() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { role } = await getStoredProfile();

      if (role === "admin") {
        router.replace("/(admin)");
      } else if (role === "employee") {
        router.replace("/(employee)");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, typography.heading]}>Kaarya Siddhi</Text>
      </View>

      {/* Logo */}
      <View style={styles.imagestyle}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.imageStyling}
        />
      </View>
      <Text style={styles.welcome}>Welcome to Kaarya Siddhi</Text>

      {/* Buttons */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.button, styles.adminButton]}
            onPress={() => router.push("/(auth)/AdminLogin")}
          >
            <Text style={styles.buttonText}>Admin Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardText}>
            Create workspaces and manage employees
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.button, styles.employeeButton]}
            onPress={() => router.push("/(auth)/EmployeeLogin")}
          >
            <Text style={styles.buttonText}>Employee Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardText}>
            View assigned tasks and update progress
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  header: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  welcome: {
    marginTop: 35,
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: PRIMARY,
    alignSelf: "center",
  },

  subtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
    lineHeight: 22,
    paddingHorizontal: 30,
  },

  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginTop: 0,
    paddingBottom: 135,
  },

  card: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,

    alignItems: "center",
  },

  button: {
    width: "100%",
    height: moderateScale(55),
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  adminButton: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  employeeButton: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
  },

  cardText: {
    marginTop: 14,
    textAlign: "center",
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
  },
  imagestyle: {
    justifyContent: "center",
    alignItems: "center",
    height: moderateScale(120),
    width: moderateScale(120),
    marginTop: 50,
    borderRadius: moderateScale(120),
    backgroundColor: "#E8870A",
    alignSelf: "center",
  },
  imageStyling: {
    height: moderateScale(116),
    width: moderateScale(116),
    borderRadius: moderateScale(120),
    bottom: 0,
  },
});