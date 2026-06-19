import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { router } from "expo-router";
// import { PhoneAuthProvider } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useRef } from "react";
// import { auth } from "../firebaseConfig";
import { auth, app } from "../firebaseConfig";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";

const AdminLogin = () => {
  const [ph, setPh] = useState("");
  const [pass, setPass] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);

  const recaptchaVerifier = useRef<any>(null);

  const verifyOTP = async () => {
    console.log("verificationId:", verificationId);
    console.log("otp entered:", otp);
    try {
      if (!pass || pass.length !== 6) {
        Alert.alert("Error", "Please enter a valid 6-digit OTP");
        return;
      }

      const credential = PhoneAuthProvider.credential(verificationId!, otp);
      await signInWithCredential(auth, credential);

      Alert.alert("Success", "Login Successful");
      router.replace("/profile");
    } catch (error: any) {
      console.log(error);
      Alert.alert("Error", error?.message || "Invalid OTP");
    }
  };

  const sendOTP = async () => {
    try {
      if (!ph || ph.length !== 10) {
        Alert.alert("Error", "Please enter a valid 15-digit phone number");
        return;
      }

      const provider = new PhoneAuthProvider(auth);

      const verificationId = await provider.verifyPhoneNumber(
        `+91${ph}`,
        recaptchaVerifier.current,
      );

      setVerificationId(verificationId);

      Alert.alert("Success", "OTP Sent Successfully");
    } catch (error: any) {
      console.log(error);
      Alert.alert("Error", error?.message || "Failed to send OTP");
    }
  };
  return (
    <SafeAreaView>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
      />
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
              maxLength={15}
            />
          </View>
          <View>
            <TextInput
              style={styles.input}
              value={pass}
              placeholder="Enter OTP"
              onChangeText={setPass}
              keyboardType="phone-pad"
              maxLength={6}
            />
          </View>

          {/* <View style={styles.formatForgot}>
            <Text style={styles.forgot}>Forgot Password</Text>
          </View> */}
          <View>
            <TouchableOpacity
              style={styles.LoginStyle}
              onPress={verificationId ? verifyOTP : sendOTP}
            >
              <Text style={styles.LoginText}>
                {verificationId ? "Verify OTP" : "Send OTP"}
              </Text>
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
    height: 310,
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
