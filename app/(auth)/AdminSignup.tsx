import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';
import BackButton from "../../components/backButton";
import ValidatedInput from "../../components/ValidatedInput";
import { isValidEmail, isValidPhone, isValidName } from "../../constants/validators";


export default function AdminSignup() {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);


  const [errors, setErrors] = useState({
    name: "",
    department: "",
    phone: "",
    email: "",
  });

  function validate() {
    const newErrors = { name: "", department: "", phone: "", email: "" };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Please enter your name";
      isValid = false;
    } else if (!isValidName(name)) {
      newErrors.name = "Name should only contain letters";
      isValid = false;
    }

    if (!department.trim()) {
      newErrors.department = "Please enter your department";
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = "Please enter a phone number";
      isValid = false;
    } else if (phone.length !== 10) {
      newErrors.phone = "Enter a valid 10-digit phone number";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }
  async function createAccount() {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({ name: "", department: "", phone: "", email: "" });

      // Create Account
      const signupResponse = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          department,
          email,
          phone,
          role: "admin",
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        // Show inline error instead of Alert
        if (
          signupData.detail &&
          signupData.detail.toLowerCase().includes("exist")
        ) {
          setErrors((prev) => ({
            ...prev,
            email: "The user already exists",
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            email: signupData.detail || "Signup failed",
          }));
        }
        return;
      }

      // Send OTP
      const otpResponse = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: "admin",
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        setErrors((prev) => ({
          ...prev,
          email: otpData.detail || "Failed to send OTP",
        }));
        return;
      }

      router.push({
        pathname: "/(auth)/OtpVerify",
        params: {
          email,
          name,
          role: "admin",
          mode: "signup",
        },
      });
    } catch (error) {
      console.log(error);
      setErrors((prev) => ({
        ...prev,
        email: "Something went wrong. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerText, typography.heading]}>Admin Signup</Text>
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
              <Text style={styles.title}>Create Admin Account</Text>

              <View style={{ width: "100%", alignItems: "center" }}>
                <ValidatedInput
                  value={name}
                  placeholder="Full Name"
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  validator={isValidName}
                  errorMessage="Name should only contain letters"
                  externalError={errors.name}
                />

                <ValidatedInput
                  value={department}
                  placeholder="Department"
                  onChangeText={(text) => {
                    setDepartment(text);
                    if (errors.department) setErrors((prev) => ({ ...prev, department: "" }));
                  }}
                  externalError={errors.department}
                />

                <ValidatedInput
                  value={phone}
                  placeholder="Phone Number"
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  validator={isValidPhone}
                  errorMessage="Enter a valid 10-digit phone number"
                  externalError={errors.phone}
                />

                <ValidatedInput
                  value={email}
                  placeholder="Email"
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  validator={isValidEmail}
                  errorMessage="Please enter a valid email"
                  externalError={errors.email}
                />
              </View>

              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={createAccount}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.login}>
              <Text style={styles.bottomText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/AdminLogin")}
              >
                <Text style={styles.loginT}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
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
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  headerText: {
    color: "white",
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    alignSelf: "center",
  },

  logoContainer: {
    marginTop: 35,
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
    marginTop: 30,
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

  bottomText: {
    color: "#6B7280",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginTop: 30,
  },

  login: {
    alignItems: "center",
    justifyContent: "center",
  },

  loginT: {
    color: PRIMARY,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 4,
    textDecorationLine: "underline",
  },
});