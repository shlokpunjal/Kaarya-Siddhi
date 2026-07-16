import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { typography } from "../../theme/theme";
import FadeIn from "../../components/FadeIn";
import BackButton from "../../components/backButton";
import { authFetch } from "../../utils/authFetch";
import ValidatedInput from "../../components/ValidatedInput";
import { isValidEmail } from "../../constants/validators";
import useLoading from "../../hooks/useLoading";

export default function RequestAdmin() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { showLoading, hideLoading } = useLoading();

  const sendRequest = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!adminEmail.trim()) {
      setError("Please enter your admin's email");
      return;
    }

    if (!emailRegex.test(adminEmail)) {
      setError("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      showLoading("Connecting to workspace...");

      const trimmedAdminEmail = adminEmail.trim();

      const { data: adminRow, error: adminLookupError } = await supabase
        .from("users")
        .select("email")
        .eq("email", trimmedAdminEmail)
        .maybeSingle();

      if (adminLookupError) throw adminLookupError;

      if (!adminRow) {
        setError("No admin found with that email");
        hideLoading();
        return;
      }

      const response = await authFetch("/connect-request", {
        method: "POST",
        body: JSON.stringify({
          employee_email: email,
          admin_email: trimmedAdminEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to send request");
        hideLoading();
        return;
      }

      setSuccessMessage("Request sent successfully.");
      hideLoading();

      router.replace({
        pathname: "/(auth)/WaitingApproval",
        params: {
          employee_email: email,
          admin_email: trimmedAdminEmail,
        },
      });
    } catch (err: any) {
      hideLoading();
      console.log(err);
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => router.replace("/(employee)");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerText, typography.heading]}>
          Connect to Admin
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainStyle}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Enter your Admin's Email</Text>

              <View style={{ width: "100%", alignItems: "center" }}>
                <ValidatedInput
                  value={adminEmail}
                  placeholder="Admin Email"
                  onChangeText={(text) => {
                    setAdminEmail(text);
                    if (error) setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  validator={isValidEmail}
                  errorMessage="Please enter a valid email"
                  externalError={error}
                />
              </View>

              <FadeIn visible={!!successMessage}>
                <Text style={styles.successText}>{successMessage}</Text>
              </FadeIn>

              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={sendRequest}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={handleSkip} style={styles.skipContainer}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";
const SUCCESS = "#2E7D32";

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    alignItems: "center",
  },

  mainStyle: {
    alignItems: "center",
    width: "100%",
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
    alignItems: "center",
    width: "85%",
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },

  title: {
    textAlign: "center",
    fontSize: 18,
    // fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },

  successText: {
    color: SUCCESS,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
    marginLeft: 4,
    alignSelf: "flex-start",
  },

  button: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,

    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },

  buttonDisabled: {
    backgroundColor: "#6B7280",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    // fontWeight: "700",
    fontFamily: "Poppins_400Regular",
    letterSpacing: 0.3,
  },

  skipContainer: {
    width: "85%",
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