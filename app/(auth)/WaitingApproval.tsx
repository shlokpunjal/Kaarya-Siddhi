import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';
import BackButton from "../../components/backButton";



export default function WaitingApproval() {
  const { employee_email, admin_email, name } =
    useLocalSearchParams<{
      employee_email: string;
      admin_email: string;
      name?: string;
    }>();

  const [status, setStatus] = useState("pending");
  const [statusMessage, setStatusMessage] = useState("");

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
        setStatusMessage("Your admin has accepted your request.");

        setTimeout(() => {
          router.replace({
            pathname: "/(onboarding)/profileSetup1",
            params: { role: "employee", name },
          });
        }, 1500);
      }

      if (data.status === "rejected") {
        setStatusMessage("Your request was rejected.");

        setTimeout(() => {
          router.replace({
            pathname: "/(auth)/RequestAdmin",
            params: {
              email: employee_email,
              name,
            },
          });
        }, 1500);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleSkip = () => {
    router.replace("/(employee)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerText, typography.heading]}>
          Waiting for Approval
        </Text>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
      </View>

      <View style={styles.card}>
        {status === "pending" ? (
          <ActivityIndicator
            size="large"
            color="#E8870A"
          />
        ) : null}

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

        {statusMessage ? (
          <Text
            style={[
              styles.statusMessage,
              status === "accepted"
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {statusMessage}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={handleSkip} style={styles.skipContainer}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";
const ERROR = "#D32F2F";
const SUCCESS = "#2E7D32";

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
    alignSelf: "center",
  },

  logoContainer: {
    marginTop: 40,
    justifyContent: "center",
    alignItems: "center",
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: ACCENT,
  },

  logo: {
    width: 115,
    height: 115,
    borderRadius: 60,
  },

  card: {
    marginTop: 35,
    width: "88%",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },

  title: {
    marginTop: 20,
    fontSize: 20,
    // fontWeight: "700",
    color: PRIMARY,
    fontFamily: "Poppins_400Regular",
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

  statusMessage: {
    marginTop: 15,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  errorText: {
    color: ERROR,
  },

  successText: {
    color: SUCCESS,
  },
  skipContainer: {
    width: "88%",
    alignItems: "flex-end",
    marginTop: 20,
  },

  skipText: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    textDecorationLine: "underline",
  },
});