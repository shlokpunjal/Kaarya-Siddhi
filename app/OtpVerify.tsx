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
import React, { useState } from "react";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AdminLogin = () => {
  const [otp, setOtp] = useState("");
  const { email } = useLocalSearchParams();

  const verifyOTP = async () => {
  try {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Enter valid OTP");
      return;
    }

    const response = await fetch(
      "http://192.168.137.1:8000/verify-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      await AsyncStorage.setItem(
        "token",
        data.token
      );

      Alert.alert(
        "Success",
        "Login Successful"
      );

      router.replace("/Dashboard");
    } else {
      Alert.alert(
        "Error",
        data.message
      );
    }
  } catch (error) {
    console.log(error);
    Alert.alert(
      "Error",
      "Verification failed"
    );
  }
};
  
  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.maintext}>AdminLogin</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>
        <View style={styles.divi}>
          <Text style={styles.divtext}>Login to your workspace</Text>
          <View>
            <TextInput
              style={styles.input}
              value={otp}
              placeholder="Enter OTP"
              onChangeText={setOtp}
              keyboardType="phone-pad"
              maxLength={6}
            />
          </View>
          {/* 4155420.210.5663. */}

          {/* <View style={styles.formatForgot}>
            <Text style={styles.forgot}>Forgot Password</Text>
          </View> */}
          <View>
            <TouchableOpacity style={styles.LoginStyle} onPress={verifyOTP}>
              <Text style={styles.LoginText}>Verify OTP</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={styles.LoginStyle}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.LoginText}>Login</Text>
            </TouchableOpacity> */}
          </View>
        </View>
        <View>
          <Text style={styles.createStyle}>Create new Account?</Text>
        </View>
        <View style={styles.SetStyle}>
          <Text onPress={() => router.back()} style={styles.setText}>
            Set Up Admin Account
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
    top: 30,
  },
  formatForgot: {
    top: 5,
  },
  forgot: {
    fontSize: 11,
    color: "red",
    textDecorationLine: "underline",
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
    // justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    height: 230,
    width: "75%",
    borderRadius: 25,
    top: 80,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontWeight: "700",
  },
});
