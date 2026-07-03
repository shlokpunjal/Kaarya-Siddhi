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


const EmployeeLogin = () => {
  const [ph, setPh] = useState("");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (isSending || isOnCooldown) return;

    if (!validate()) {
      return;
    }

    try {
      setIsSending(true);
      setErrors({ phone: "", email: "" });

      // STEP 1 : Check account exists
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone: ph,
          role: "employee",
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        // Map backend field errors properly instead of always dumping on email
        const detail = (loginData.detail || "").toLowerCase();
        if (detail.includes("phone")) {
          setErrors((prev) => ({
            ...prev,
            phone: loginData.detail,
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            email: loginData.detail || "Account not found",
          }));
        }
        return;
      }

      // STEP 2 : Send OTP
      const otpResponse = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: "employee",
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

      startCooldown();

      router.push({
        pathname: "/OtpVerify",
        params: {
          email,
          ph,
          role: "employee",
          mode: "login",
        },
      });
    } catch (error) {
      console.log(error);
      setErrors((prev) => ({
        ...prev,
        email: "Could not connect to server",
      }));
    } finally {
      setIsSending(false);
    }
  };

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={[styles.maintext, typography.heading]}>EmployeeLogin</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../../assets/images/logo.jpeg")}
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
          <Text style={styles.divtext}>Login to your workspace</Text>
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

          {isOnCooldown && (
            <Text style={styles.resendText}>
              Resend in : {cooldown}.00 secs
            </Text>
          )}
        </View>

        <View>
          <Text style={styles.createStyle}>Create new Account?</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/EmployeeSignup")}
          style={styles.SetStyle}
        >
          <Text style={styles.setText}>Create Employee Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EmployeeLogin;

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
    marginTop: 50,
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
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
  input: {
    backgroundColor: "#E5E7EB",
    height: 50,
    width: 280,
    justifyContent: "center",
    paddingLeft: 20,
    borderRadius: 10,
    marginTop: 20,
    borderColor: "#6B7280",
    borderWidth: 0.7,
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
    marginTop: 100,
  },
  diviExpanded: {
    height: 340,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontFamily: "Poppins_600SemiBold",
  },
});