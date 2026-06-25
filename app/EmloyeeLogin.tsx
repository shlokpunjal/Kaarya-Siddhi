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

const AdminLogin = () => {
  const [ph, setPh] = useState("");
  const [email, setEmail] = useState("");
  const sendOTP = async () => {
    try {
      if (!ph || ph.length !== 10) {
        Alert.alert("Error", "Enter valid phone number");
        return;
      }

      if (!email) {
        Alert.alert("Error", "Enter email");
        return;
      }

      const response = await fetch("http://10.0.2.2:8000/send-otp", {
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

      if (data.success) {
        Alert.alert("Success", "OTP Sent");

        router.push({
          pathname: "/OtpVerify",
          params: {
            email,
          },
        });
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not send OTP");
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
              value={ph}
              placeholder="Enter Phone Number"
              onChangeText={setPh}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <View>
            <TouchableOpacity style={styles.LoginStyle} onPress={sendOTP}>
              <Text style={styles.LoginText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
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
    width: "50%",
    borderRadius: 10,
    elevation: 4,
    top: 160,
  },
  createStyle: {
    color: "#6B7280",
    top: 150,
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
    // justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    height: 225,
    width: "80%",
    borderRadius: 25,
    marginTop: 110,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontFamily: "Poppins_600SemiBold",
  },
});
