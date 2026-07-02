import React, { useEffect, useState } from "react";
import {
  View,
 Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../constants/api";

export default function WaitingApproval() {
  const { employee_email, admin_email } =
    useLocalSearchParams<{
      employee_email: string;
      admin_email: string;
    }>();

  const [status, setStatus] = useState("pending");

  useEffect(() => {
    checkStatus();

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/connection-status/${employee_email}/${admin_email}`
      );

      const data = await response.json();

      setStatus(data.status);

      if (data.status === "accepted") {
        Alert.alert(
          "Approved",
          "Your admin has accepted your request."
        );

        router.replace("/(employee)");
      }

      if (data.status === "rejected") {
        Alert.alert(
          "Rejected",
          "Your request was rejected."
        );

        router.replace({
          pathname: "/(auth)/RequestAdmin",
          params: {
            email: employee_email,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Waiting for Approval
        </Text>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.jpeg")}
          style={styles.logo}
        />
      </View>

      <View style={styles.card}>
        <ActivityIndicator
          size="large"
          color="#E8870A"
        />

        <Text style={styles.title}>
          Connection Request Sent
        </Text>

        <Text style={styles.message}>
          Your request has been sent to your administrator.
        </Text>

        <Text style={styles.message}>
          This page automatically checks every 5 seconds.
        </Text>

        <Text style={styles.status}>
          Status : {status}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    alignItems: "center",
  },

  header: {
    width: "100%",
    backgroundColor: PRIMARY,
    padding: 20,
  },

  headerText: {
    color: "white",
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  logoContainer: {
    marginTop: 40,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  card: {
    marginTop: 35,
    width: "88%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 5,
  },

  title: {
    marginTop: 20,
    fontSize: 22,
    color: PRIMARY,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },

  message: {
    marginTop: 15,
    textAlign: "center",
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
    lineHeight: 22,
  },

  status: {
    marginTop: 25,
    color: "#E8870A",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
});