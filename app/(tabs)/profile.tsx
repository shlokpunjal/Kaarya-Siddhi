import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function ModalScreen() {
  const logout = async () => {
  await AsyncStorage.removeItem("token");
  router.replace("../index");
};
  return (
    <SafeAreaView>
      <View style={styles.mainbar}>
        <Text style={styles.mainText}>Profile</Text>
      </View>
      <View style={styles.pfpView}>
        <View style={styles.pfppic}>
          <Image
            style={styles.pfpImage}
            source={require("../../assets/images/pic.jpg")}
          />
          <Text style={styles.pfpText}>Gareeb Villager</Text>
          <Text style={styles.des}>Farmer</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardElements}>Account</Text>
          <Text style={styles.line}>
            ___________________________________________________
          </Text>
          <Text style={styles.cardElements}>Privacy</Text>
          <Text style={styles.line}>
            ___________________________________________________
          </Text>
          <Text style={styles.cardElements}>Notifications</Text>
          <Text style={styles.line}>
            ___________________________________________________
          </Text>
          <Text style={styles.cardElements}>App Customization</Text>
          <Text style={styles.line}>
            ___________________________________________________
          </Text>
          <Text style={styles.cardElements}>Help and Feedback</Text>
          <Text style={styles.line}>
            ___________________________________________________
          </Text>
        </View>
        <View>
          <TouchableOpacity style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  button: {
    height: 50,
    width: 200,
    backgroundColor: "#E8870A",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    elevation:5
  },
  line: {
    left: 20,
    marginTop: 30,
    fontWeight: "700",
  },
  cardElements: {
    fontSize: 20,
    fontWeight: "500",
    left: 30,
    top: 30,
  },
  card: {
    backgroundColor: "#E5E7EB",
    height: 420,
    width: "90%",
    borderRadius: 20,
    margin: 20,
    elevation:4,
    borderColor:"#E0E0E0",
    borderBottomWidth:1
  },
  des: {
    marginLeft: 140,
    bottom: 55,
    fontSize: 15,
    fontWeight: "500",
  },
  pfpText: {
    marginLeft: 140,
    bottom: 55,
    fontSize: 25,
    fontWeight: "700",
  },
  pfppic: {
    backgroundColor: "#E5E7EB",
    height: 150,
    width: "90%",
    borderRadius: 20,
    elevation:4
  },
  pfpImage: {
    height: 100,
    width: 100,
    borderRadius: 100,
    top: 20,
    left: 20,
    elevation:10,
  },
  pfpView: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  mainbar: {
    backgroundColor: "#1A2744",
    padding: 20,
  },
  mainText: {
    color: "white",
    fontSize: 20,
  },
});

// import { View, Text } from "react-native";

// export default function ProfileScreen() {
//   return (
//     <View>
//       <Text>Profile</Text>
//     </View>
//   );
// }
