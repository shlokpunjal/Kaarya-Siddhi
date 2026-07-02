import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { API_BASE_URL } from "../../constants/api";
// import { sendLoginNotification } from "../../utils/notifications";

const OtpVerify = () => {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(30); // starts at 30 immediately
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { email, ph, role, mode } = useLocalSearchParams<{
    email: string;
    ph?: string;
    role: string;
    mode: string;
  }>();
  const { saveSession } = useAuth();

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
      Alert.alert("Error", "Enter a valid OTP");
      return;
    }

    try {
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
        Alert.alert("Error", data.detail);
        return;
      }

      await saveSession(data.token, ph?.toString() ?? "", data.email);

      // ---------- ADMIN ----------
      if (data.role === "admin") {
        router.replace("/(admin)");
        return;
      }

      // ---------- EMPLOYEE SIGNUP ----------
      if (data.role === "employee" && mode === "signup") {
        router.replace({
          pathname: "/(auth)/RequestAdmin",
          params: {
            email: data.email,
          },
        });
        return;
      }

      // ---------- EMPLOYEE LOGIN ----------
      if (data.role === "employee" && !data.workspace_id) {
        router.replace({
          pathname: "/(auth)/RequestAdmin",
          params: {
            email: data.email,
          },
        });
        return;
      }

      router.replace("/(employee)");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Verification failed.");
    }
  };

  const resendOTP = async () => {
    try {
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
        Alert.alert("Error", data.detail);
        return;
      }

      Alert.alert("Success", "OTP Sent Successfully");

      startCooldown();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Unable to resend OTP.");
    }
  };
  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.maintext}>OTP Verification</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>

        {/* Card — grows when cooldown is active */}
        <View style={[styles.divi, isOnCooldown && styles.diviExpanded]}>
          <Text style={styles.divtext}>Login to your workspace</Text>
          <View>
            <TextInput
              style={styles.input}
              value={otp}
              placeholder="6-digit OTP "
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
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
    width: 250,
    borderRadius: 10,
    elevation: 4,
    top: 15,
  },
  resendButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 50,
    width: 250,
    borderRadius: 10,
    elevation: 4,
    top: 30,
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
    width: 250,
    justifyContent: "center",
    paddingLeft: 20,
    borderRadius: 10,
    marginTop: 20,
    borderColor: "#6B7280",
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
    height: 280, // default — input + verify button
    width: "75%",
    borderRadius: 25,
    top: 80,
  },
  diviExpanded: {
    height: 250, // taller during cooldown to fit the resend text
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontWeight: "700",
  },
});
