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
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "@/constants/api";

const RequestAdmin = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { email } = useLocalSearchParams();

  const requestAdmin = async () => {
    if (!adminEmail) {
      Alert.alert("Error", "Enter admin's email");
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch(`${API_BASE_URL}/connect-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_email: email,
          admin_email: adminEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.detail || "Something went wrong");
        return;
      }

      if (data.success) {
        router.push({
          pathname: "/WaitingApproval",
          params: { employeeEmail: email, adminEmail },
        });
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not send request. Check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.maintext}>Connect to Admin</Text>
      </View>
      <View style={styles.mainStyle}>
        <View style={styles.imagestyle}>
          <Image
            source={require("../assets/images/logo.jpeg")}
            style={styles.imageStyling}
          />
        </View>

        <View style={styles.divi}>
          <Text style={styles.divtext}>Enter your admin's email</Text>
          <Text style={styles.subText}>
            Your admin will receive a request to approve your access
          </Text>
          <TextInput
            style={styles.input}
            value={adminEmail}
            placeholder="Enter Admin Email"
            onChangeText={setAdminEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.LoginStyle, isSending && styles.LoginDisabled]}
            onPress={requestAdmin}
            disabled={isSending}
          >
            <Text style={styles.LoginText}>
              {isSending ? "Sending..." : "Request Admin"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RequestAdmin;

const styles = StyleSheet.create({
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
    height: 280,
    width: "80%",
    borderRadius: 25,
    marginTop: 110,
  },
  divtext: {
    fontSize: 20,
    color: "#8B95A1",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  subText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Poppins_400Regular",
  },
});