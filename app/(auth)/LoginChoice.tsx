import { Image } from "expo-image";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";


export default function HomeScreen() {
  useEffect(() => {
  const checkLogin = async () => {
    const loggedIn = await AsyncStorage.getItem("loggedIn");

    if (loggedIn === "true") {
      router.replace("/(tabs)/dashboard");
    }
  };

  checkLogin();
}, []);
  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.textContainer}>KaaryaSiddhi</Text>
      </View>
      <View style={styles.imagecontainer}>
        <Image
          source={require("../assets/images/logo.jpeg")}
          style={styles.image}
        />
        <Text style={styles.contain}>Welcome to KaaryaSiddhi</Text>
      </View>
      <View style={styles.screen}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => router.push("/AdminLogin")}
          >
            <Text style={styles.adminText}>Admin Login</Text>
          </TouchableOpacity>
          <Text style={styles.cardtext}>Manage tasks and teams</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.button1Container} onPress={()=> router.push("/EmloyeeLogin")}>
            <Text style={styles.adminText} >Employee Login</Text>
          </TouchableOpacity>
          <Text style={styles.cardtext}>View and update your tasks</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardtext: {},
  button1Container: {
    backgroundColor: "#1A2744",
    width: 270,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    elevation: 4,
  },
  adminText: {
    color: "white",
    fontWeight: "700",
  },
  buttonContainer: {
    backgroundColor: "#E8870A",
    width: 270,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    elevation: 4,
  },
  textContainer: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#1A2744",
    padding: "5%",
  },
  image: {
    position: "absolute",
    resizeMode: "contain",
    width: 150,
    height: 150,
    borderRadius: 100,

    top: 60,
  },
  imagecontainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  contain: {
    top: 220,
    fontWeight: "700",
    fontSize: 16,
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    elevation: 4,
    borderRadius: 12,
    height: 140,
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    boxShadow: "0px 4px 50px 0px rgba(187, 164, 186, 0.5)",
  },
  screen: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginTop: 385,
  },
});

// import AdminLogin from "../AdminLogin";

// export default function HomeScreen() {
//   return <AdminLogin />;
// }
