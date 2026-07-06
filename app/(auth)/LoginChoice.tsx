import React, { useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { typography } from "../../theme/theme";

export default function LoginChoice() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");

      if (!token) return;

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
        <Text style={styles.headerTitle}>Kaarya Siddhi</Text>
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
            style={[styles.button, styles.adminButton]}
            onPress={() => router.push("/(auth)/AdminLogin")}
          >
            <Text style={styles.buttonText}>Admin Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardText}>
            Create workspaces and manage employees
          </Text>
        </View>

        <View style={styles.carde}>
          <TouchableOpacity
            style={[styles.button, styles.employeeButton]}
            onPress={() => router.push("/(auth)/EmployeeLogin")}
          >
            <Text style={styles.buttonText}>Employee Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardText}>
            View assigned tasks and update     progress
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

  logoContainer: {
    alignItems: "center",
    marginTop: 50,
  },

  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
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
    marginTop: 0,
  },

  card: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 5,

    alignItems: "center",
  },

  carde: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 170,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 5,

    alignItems: "center",
  },

  button: {
    width: "100%",
    height: 55,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  adminButton: {
    backgroundColor: ACCENT,
  },

  employeeButton: {
    backgroundColor: PRIMARY,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
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
    height: 120,
    width: 120,
    marginTop: 50,
    borderRadius: 120,
    backgroundColor: "#E8870A",
    alignSelf: "center",
  },
  imageStyling: {
    height: 116,
    width: 116,
    borderRadius: 120,
    bottom: 0,
  },
});