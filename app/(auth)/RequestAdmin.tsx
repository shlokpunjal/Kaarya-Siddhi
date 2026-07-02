import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../constants/api";

export default function RequestAdmin() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sendRequest = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!adminEmail.trim()) {
      setError("Please enter your admin's email");
      return;
    }

    if (!emailRegex.test(adminEmail)) {
      setError("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/connect-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_email: email,
            admin_email: adminEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to send request");
        return;
      }

      setSuccessMessage("Request sent successfully.");

      router.replace({
        pathname: "/(auth)/WaitingApproval",
        params: {
          employee_email: email,
          admin_email: adminEmail,
        },
      });

    } catch (error) {
      console.log(error);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerText}>
          Connect to Admin
        </Text>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.jpeg")}
          style={styles.logo}
        />
      </View>

      <View style={styles.card}>

        <Text style={styles.title}>
          Enter your Admin's Email
        </Text>

        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Admin Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={adminEmail}
          onChangeText={(text) => {
            setAdminEmail(text);
            if (error) setError("");
          }}
        />
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        {successMessage ? (
          <Text style={styles.successText}>{successMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={sendRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              Send Request
            </Text>
          )}
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";
const ERROR = "#D32F2F";
const SUCCESS = "#2E7D32";

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F7F8FC",
    alignItems:"center"
  },

  header:{
    width:"100%",
    backgroundColor:PRIMARY,
    padding:20
  },

  headerText:{
    color:"white",
    fontSize:22,
    fontFamily:"Poppins_600SemiBold"
  },

  logoContainer:{
    marginTop:40
  },

  logo:{
    width:120,
    height:120,
    borderRadius:60
  },

  card:{
    marginTop:35,
    width:"88%",
    backgroundColor:"white",
    borderRadius:20,
    padding:20,
    elevation:5
  },

  title:{
    textAlign:"center",
    fontSize:20,
    color:PRIMARY,
    marginBottom:20,
    fontFamily:"Poppins_600SemiBold"
  },

  input:{
    backgroundColor:"#EEF2F7",
    height:55,
    borderRadius:12,
    paddingHorizontal:18,
    marginBottom:6,
    fontFamily:"Poppins_400Regular",
    borderWidth:1,
    borderColor:"transparent"
  },

  inputError:{
    borderColor:ERROR,
    backgroundColor:"#FDECEC"
  },

  errorText:{
    color:ERROR,
    fontSize:12,
    fontFamily:"Poppins_400Regular",
    marginBottom:14,
    marginLeft:4
  },

  successText:{
    color:SUCCESS,
    fontSize:12,
    fontFamily:"Poppins_400Regular",
    marginBottom:14,
    marginLeft:4
  },

  button:{
    backgroundColor:ACCENT,
    height:55,
    borderRadius:12,
    justifyContent:"center",
    alignItems:"center"
  },

  buttonText:{
    color:"white",
    fontSize:16,
    fontFamily:"Poppins_600SemiBold"
  }

});