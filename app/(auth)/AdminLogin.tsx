import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef } from "react";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';
import BackButton from "../../components/backButton";
import ValidatedInput from "../../components/ValidatedInput";
import { isValidEmail, isValidPhone } from "../../constants/validators";

const AdminLogin = () => {
  const [ph, setPh] = useState("");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [errors, setErrors] = useState({
    phone: "",
    email: "",
  });

  const startCooldown = () => {
    setCooldown(30);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  function validate() {
    const newErrors = { phone: "", email: "" };
    let isValid = true;

    if (!ph.trim()) {
      newErrors.phone = "Please enter your phone number";
      isValid = false;
    } else if (ph.length !== 10) {
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

  const sendOTP = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSending(true);
      setErrors({ phone: "", email: "" });

      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone: ph,
          role: "admin",
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        let message = "Account not found";

        if (typeof loginData.detail === "string") {
          message = loginData.detail;
        } else if (Array.isArray(loginData.detail) && loginData.detail.length > 0) {
          message = loginData.detail[0].msg;
        } else if (loginData.detail?.msg) {
          message = loginData.detail.msg;
        }

        setErrors((prev) => ({
          ...prev,
          email: message,
        }));

        return;
      }

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
        let message = "Failed to send OTP";

        if (typeof otpData.detail === "string") {
          message = otpData.detail;
        } else if (Array.isArray(otpData.detail) && otpData.detail.length > 0) {
          message = otpData.detail[0].msg;
        } else if (otpData.detail?.msg) {
          message = otpData.detail.msg;
        }

        setErrors((prev) => ({
          ...prev,
          email: message,
        }));

        return;
      }

      startCooldown();

      router.push({
        pathname: "/(auth)/OtpVerify",
        params: {
          email,
          ph,
          role: "admin",
          mode: "login",
        },
      });
    } catch (error) {
      console.log(error);
      setErrors((prev) => ({
        ...prev,
        email: "Could not connect to server.",
      }));
    } finally {
      setIsSending(false);
    }
  };

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.mainbar}>
        <BackButton />
        <Text style={[styles.maintext, typography.heading]}>Admin Login</Text>
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
            <View style={styles.imagestyle}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.imageStyling}
              />
            </View>
            <View
              style={[
                styles.divi,
                (isOnCooldown || errors.phone || errors.email) &&
                styles.diviExpanded,
              ]}
            >
              <Text style={[styles.divtext, typography.subheading]}>
                Login to your workspace
              </Text>
              <View style={{ width: "100%", alignItems: "center" }}>
                <ValidatedInput
                  value={ph}
                  placeholder="Enter Phone Number"
                  onChangeText={(text) => {
                    setPh(text);
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
                  placeholder="Enter Email"
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
                  style={[
                    styles.LoginStyle,
                    (isOnCooldown || isSending) && styles.LoginDisabled,
                  ]}
                  onPress={sendOTP}
                  disabled={isOnCooldown || isSending}
                >
                  <Text style={styles.LoginText}>
                    {isSending
                      ? "Sending..."
                      : isOnCooldown
                        ? "OTP Sent"
                        : "Send OTP"}
                  </Text>
                </TouchableOpacity>
              </View>

              {isOnCooldown && (
                <Text style={styles.resendText}>
                  Resend in : {cooldown}.00 secs
                </Text>
              )}
            </View>

            <View>
              <Text style={styles.createStyle}>Create new Account?</Text>
            </View>
            <View style={styles.SetStyle}>
              <Text
                onPress={() => router.push("/(auth)/AdminSignup")}
                style={styles.setText}
              >
                Create Admin Account
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AdminLogin;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  setText: {
    color: "white",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  SetStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8870A",
    height: 48,
    width: "60%",
    borderRadius: 14,
    shadowColor: "#E8870A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  createStyle: {
    color: "#6B7280",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginTop: 60,
  },
  LoginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins_400Regular",
    letterSpacing: 0.3,
  },
  LoginStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 52,
    borderRadius: 16,
    marginTop: 18,
    shadowColor: "#1A2744",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  LoginDisabled: {
    backgroundColor: "#6B7280",
    shadowOpacity: 0,
    elevation: 0,
  },
  resendText: {
    marginTop: 20,
    color: "#E8870A",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  mainStyle: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainbar: {
    backgroundColor: "#1A2744",
    padding: 20,
  },
  maintext: {
    color: "white",
    fontSize: 20,
    fontFamily: "Poppins_400Regular",
    alignSelf: "center",
  },
  imagestyle: {
    justifyContent: "center",
    alignItems: "center",
    height: 120,
    width: 120,
    top: 50,
    borderRadius: 120,
    backgroundColor: "#E8870A",
  },
  imageStyling: {
    height: 115,
    width: 115,
    borderRadius: 120,
    bottom: 0,
  },
  divi: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    width: "85%",
    borderRadius: 24,
    marginTop: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    overflow: "visible",
  },
  diviExpanded: {
    paddingBottom: 28,
  },
  divtext: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2744",
    fontFamily: "Poppins_400Regular",
  },
});