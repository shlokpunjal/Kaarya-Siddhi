import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";

export default function EmployeeSignup() {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  async function createAccount() {
    if (
      !name ||
      !employeeId ||
      !department ||
      !phone ||
      !email
    ) {
      Alert.alert("Missing Information", "Please fill all the fields.");
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid Phone", "Enter a valid phone number.");
      return;
    }

    try {
      setLoading(true);

      const signupResponse = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          role: "employee",
          employee_id: employeeId,
          department,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        Alert.alert("Signup Failed", signupData.detail);
        return;
      }

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
        Alert.alert("OTP Error", otpData.detail);
        return;
      }

      Alert.alert("Success", "OTP sent successfully.");

      router.push({
        pathname: "/(auth)/OtpVerify",
        params: {
          email,
          role: "employee",
          mode: "signup",
        },
      });
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Employee Signup</Text>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.jpeg")}
          style={styles.logo}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Create Employee Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Employee ID"
          value={employeeId}
          onChangeText={setEmployeeId}
        />

        <TextInput
          style={styles.input}
          placeholder="Department"
          value={department}
          onChangeText={setDepartment}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={createAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/EmployeeLogin")}
      >
        <Text style={styles.bottomText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
    alignItems: "center",
  },

  header: {
    width: "100%",
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  headerText: {
    color: "white",
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  logoContainer: {
    marginTop: 35,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  card: {
    marginTop: 30,
    width: "88%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },

  title: {
    textAlign: "center",
    fontSize: 22,
    color: PRIMARY,
    marginBottom: 20,
    fontFamily: "Poppins_600SemiBold",
  },

  input: {
    height: 55,
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    paddingHorizontal: 18,
    marginBottom: 16,
    fontFamily: "Poppins_400Regular",
  },

  button: {
    backgroundColor: ACCENT,
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  bottomText: {
    marginTop: 25,
    color: PRIMARY,
    fontFamily: "Poppins_500Medium",
  },
});