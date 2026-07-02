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
import React, { useState, useRef } from "react";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";

const AdminLogin = () => {
  const [ph, setPh] = useState("");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSending, setIsSending] = useState(false); // ADD THIS

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

  const sendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Enter your email");
      return;
    }

    try {
      setIsSending(true);

      // Check account exists
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
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

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        Alert.alert("Account Not Found", loginData.detail);
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
          phone: ph,
          role: "admin",
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        Alert.alert("Error", otpData.detail);
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
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setIsSending(false);
    }
  };

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.maintext}>AdminLogin</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>

        {/* Card — grows taller during cooldown */}
        <View style={[styles.divi, isOnCooldown && styles.diviExpanded]}>
          <Text style={styles.divtext}>Login to your workspace</Text>
          <View>
            <TextInput
              style={styles.input}
              value={ph}
              placeholder="Enter Phone Number"
              onChangeText={setPh}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <TextInput
              style={styles.input}
              value={email}
              placeholder="Enter Email"
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
          <View>
            <TouchableOpacity
              style={[
                styles.LoginStyle,
                (isOnCooldown || isSending) && styles.LoginDisabled, // add isSending
              ]}
              onPress={sendOTP}
              disabled={isOnCooldown || isSending} // add isSending
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
    marginTop: 70,
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
    marginTop: 110,
  },
  diviExpanded: {
    height: 360,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontFamily: "Poppins_400Regular",
  },
});
