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

const EmployeeLogin = () => {
  const [ph, setPh] = useState("");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false); // prevent double tap
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (isSending || isOnCooldown) return; // guard against double tap

    try {
      if (!ph || ph.length !== 10) {
        Alert.alert("Error", "Enter valid phone number");
        return;
      }

      if (!email) {
        Alert.alert("Error", "Enter email");
        return;
      }

      setIsSending(true); // disable immediately

      const response = await fetch("http://192.168.31.88:8000/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: ph,
          email: email,
        }),
      });

      const data = await response.json();

      // handle 429 and other HTTP errors
      if (!response.ok) {
        Alert.alert("Error", data.detail || "Something went wrong");
        return;
      }

      if (data.success) {
        startCooldown();
        Alert.alert("Success", data.message); // shows attempt count e.g. "OTP sent (1/3 attempts used)"
        router.push({
          pathname: "/OtpVerify",
          params: { email, ph }, // pass both so resend works
        });
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not send OTP");
    } finally {
      setIsSending(false); // re-enable after response
    }
  };

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.maintext}>EmployeeLogin</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>

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
                (isOnCooldown || isSending) && styles.LoginDisabled,
              ]}
              onPress={sendOTP}
              disabled={isOnCooldown || isSending}
            >
              <Text style={styles.LoginText}>
                {isSending ? "Sending..." : isOnCooldown ? "OTP Sent" : "Send OTP"}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.SetStyle}>
          <Text style={styles.setText}>Set Up Admin Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EmployeeLogin;

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
    // marginTop:40,
  },
  createStyle: {
    color: "#6B7280",
    marginTop:70,
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
    fontFamily: "Poppins_600SemiBold",
  },
});