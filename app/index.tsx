import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  useEffect(() => {
    const checkSession = async () => {
      const token = await AsyncStorage.getItem("token");
      console.log("Token found:", token);
      if (token) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/LoginChoice");
      }
    };
    checkSession();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A2744" }}>
      <ActivityIndicator size="large" color="#E8870A" />
    </View>
  );
}