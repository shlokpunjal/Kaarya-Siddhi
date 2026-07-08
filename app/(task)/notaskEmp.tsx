import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function NoTaskEmp() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF",marginTop:20 }}>
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: "#1A2744" }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Kaarya Siddhi</Text>
        </View>
      </SafeAreaView>

      {/* ── Main content ── */}
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/emp.png")}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={styles.subText}>You completed all tasks.</Text>
        <Text style={styles.mainText}>You have no tasks.</Text>

        <TouchableOpacity
          onPress={() => router.push("/newtaskemp")}
          style={styles.newTaskButton}
        >
          <Ionicons name="add" size={22} color="white" />
          <Text style={styles.newTaskButtonText}>New Task</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom tab bar ── */}
      
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 70,
    justifyContent: "center",
    paddingLeft: 24,

  },
  headerText: {
    color: "white",
    fontSize: 22,
    fontFamily: "Poppins-SemiBold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  subText: {
    fontSize: 15,
    color: "#31363F",
    fontFamily: "Poppins-Regular",
    marginTop: 10,
  },
  mainText: {
    fontSize: 20,
    color: "#1A1A1E",
    fontFamily: "Poppins-SemiBold",
    marginTop: 4,
  },
  newTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FC9700",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 36,
  },
  newTaskButtonText: {
    color: "white",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});