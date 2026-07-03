import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef } from "react";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';


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

      // Check account exists
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

      // Send OTP
      const otpResponse = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          // phone: ph,
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
      } if (!otpResponse.ok) {
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
    <SafeAreaView>
      <View style={styles.mainbar}>
        {/* add a back button */}
        <Text style={[styles.maintext, typography.heading]}>Admin - Login</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>

        {/* Card — grows taller during cooldown or errors */}
        <View
          style={[
            styles.divi,
            (isOnCooldown || errors.phone || errors.email) &&
            styles.diviExpanded,
          ]}
        >
          <Text style={[styles.divtext, typography.subheading]}>Login to your workspace</Text>
          <View>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={ph}
              placeholder="Enter Phone Number"
              onChangeText={(text) => {
                setPh(text);
                if (errors.phone)
                  setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}

            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              placeholder="Enter Email"
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>
          <View>
            <TouchableOpacity
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

          {/* Countdown text */}
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
    </SafeAreaView>
  );
};

export default AdminLogin;

const ERROR = "#D32F2F";

const styles = StyleSheet.create({
  setText: {
    color: "white",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  SetStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8870A",
    height: 50,
    width: "60%",
    borderRadius: 10,
    elevation: 4,
  },
  createStyle: {
    color: "#6B7280",
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
    marginTop: 50,
  },
  LoginText: {
    color: "white",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  LoginStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 50,
    width: 280,
    borderRadius: 10,
    elevation: 4,
    top: 20,
  },
  LoginDisabled: {
    backgroundColor: "#6B7280",
  },
  resendText: {
    marginTop: 30,
    color: "#E8870A",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  formatForgot: {
    top: 5,
  },
  forgot: {
    fontSize: 11,
    color: "red",
    textDecorationLine: "underline",
    fontFamily: "Poppins_400Regular",
  },
  input: {
    backgroundColor: "#E5E7EB",
    height: 50,
    width: 280,
    justifyContent: "center",
    paddingLeft: 20,
    borderRadius: 10,
    marginTop: 20,
    borderColor: "#6B7280",
    borderWidth: 1,
  },
  inputError: {
    borderColor: ERROR,
    backgroundColor: "#FDECEC",
  },
  errorText: {
    color: ERROR,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
    marginLeft: 4,
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
    alignSelf:"center",
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
    backgroundColor: "white",
    padding: 20,
    height: 290,
    width: "80%",
    borderRadius: 25,
    marginTop: 110,
  },
  diviExpanded: {
    height: 340,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontFamily: "Poppins_400Regular",
  },
});