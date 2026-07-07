import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';
import BackButton from "../../components/backButton";


// import { sendLoginNotification } from "../../utils/notifications";
import { sendLoginNotification } from "../../utils/notifications";

const OtpVerify = () => {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(30); // starts at 30 immediately
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { email, ph, role, mode, name } = useLocalSearchParams<{
    email: string;
    ph?: string;
    role: string;
    mode: string;
    name?: string;
  }>();
  const { saveSession } = useAuth();

  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  // Auto-start the 30s cooldown when page loads
  useEffect(() => {
    startCooldown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setOtpError("");

      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.detail || "Invalid OTP");
        return;
      }

      await saveSession(data.token, ph?.toString() ?? "", data.email, data.role, data.workspace_id);
      const SecureStore = require("expo-secure-store");

      console.log(
        "Access Token After Save:",
        await SecureStore.getItemAsync("accessToken")
      );

      console.log(
        "Refresh Token After Save:",
        await SecureStore.getItemAsync("refreshToken")
      );
      // ---------- SIGNUP FLOW → go through onboarding first ----------
      if (mode === "signup") {
        if (data.role === "admin") {
          router.replace({
            pathname: "/(onboarding)/profileSetup1",
            params: { role: "admin", name },
          });
          return;
        }

        if (data.role === "employee") {
          router.replace({
            pathname: "/(auth)/RequestAdmin",
            params: { email: data.email, name },   // ← add name
          });
          return;
        }
      }

      // ---------- LOGIN FLOW ----------
      sendLoginNotification(data.email).catch((err) =>
        console.log("Login notification failed:", err)
      );

      if (data.role === "admin") {
        router.replace("/(admin)");
        return;
      }

      if (data.role === "employee" && !data.workspace_id) {
        router.replace({
          pathname: "/(auth)/RequestAdmin",
          params: { email: data.email },
        });
        return;
      }

      router.replace("/(employee)");
    } catch (error) {
      console.log(error);
      setOtpError("Verification failed. Please try again.");
    }
  };
  const resendOTP = async () => {
    try {
      setOtpError("");
      setResendMessage("");

      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.detail || "Unable to resend OTP");
        return;
      }

      setResendMessage("OTP sent successfully");
      startCooldown();
    } catch (error) {
      console.log(error);
      setOtpError("Unable to resend OTP.");
    }
  };
  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <BackButton />
        <Text style={[styles.maintext, typography.heading]}>OTP Verification</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.imageStyling}
          />
        </View>

        {/* Card — grows when cooldown or messages are active */}
        <View
          style={[
            styles.divi,
            (isOnCooldown || otpError || resendMessage) &&
            styles.diviExpanded,
          ]}
        >
          <Text style={styles.divtext}>Login to your workspace</Text>
          <View>
            <TextInput
              style={[styles.input, otpError ? styles.inputError : null]}
              value={otp}
              placeholder="6-digit OTP "
              onChangeText={(text) => {
                setOtp(text);
                if (otpError) setOtpError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
            />
            {otpError ? (
              <Text style={styles.errorText}>{otpError}</Text>
            ) : null}
            {resendMessage ? (
              <Text style={styles.successText}>{resendMessage}</Text>
            ) : null}
          </View>

          {/* Verify OTP button */}
          <View>
            <TouchableOpacity style={styles.LoginStyle} onPress={verifyOTP}>
              <Text style={styles.LoginText}>Verify OTP</Text>
            </TouchableOpacity>
          </View>

          {/* Countdown text — visible during cooldown */}
          {isOnCooldown && (
            <Text style={styles.resendText}>Resend in : {cooldown}</Text>
          )}

          {/* Resend button — appears only after cooldown ends */}
          {!isOnCooldown && (
            <TouchableOpacity style={styles.resendButton} onPress={resendOTP}>
              <Text style={styles.LoginText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* <View>
          <Text style={styles.createStyle}>Create new Account?</Text>
        </View>
        <View style={styles.SetStyle}>
          <Text onPress={() => router.back()} style={styles.setText}>
            Set Up Admin Account
          </Text>
        </View> */}
      </View>
    </SafeAreaView>
  );
};

export default OtpVerify;

const ERROR = "#D32F2F";
const SUCCESS = "#2E7D32";

const styles = StyleSheet.create({
  setText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  SetStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8870A",
    height: 50,
    width: "50%",
    borderRadius: 10,
    elevation: 4,
    top: 160,
  },
  createStyle: {
    color: "#6B7280",
    top: 150,
    fontWeight: "700",
    fontSize: 18,
  },
  LoginText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  LoginStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 50,
    width: 300,
    borderRadius: 10,
    elevation: 4,
    top: 15,
  },
  resendButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 50,
    width: 300,
    borderRadius: 10,
    elevation: 4,
    top: 30,
  },
  resendText: {
    marginTop: 30,
    color: "#E8870A",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  input: {
    backgroundColor: "#E5E7EB",
    height: 50,
    width: 300,
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
    marginTop: 6,
    marginLeft: 4,
  },
  successText: {
    color: SUCCESS,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 6,
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
    height: 280,
    width: "85%",
    borderRadius: 25,
    top: 80,
  },
  diviExpanded: {
    height: 300,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontWeight: "700",
  },
});