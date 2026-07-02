import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
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

  const sendRequest = async () => {
    if (!adminEmail.trim()) {
      Alert.alert("Error", "Enter Admin Email");
      return;
    }

    try {
      setLoading(true);

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
        Alert.alert("Error", data.detail);
        return;
      }

      Alert.alert(
        "Success",
        "Request sent successfully."
      );

      router.replace({
        pathname: "/(auth)/WaitingApproval",
        params: {
          employee_email: email,
          admin_email: adminEmail,
        },
      });

    } catch (error) {
      console.log(error);
      Alert.alert(
        "Error",
        "Unable to connect to server."
      );
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
          style={styles.input}
          placeholder="Admin Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={adminEmail}
          onChangeText={setAdminEmail}
        />

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
    marginBottom:20,
    fontFamily:"Poppins_400Regular"
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