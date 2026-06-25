import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function Newtask() {
  const router = useRouter();
  return (
    <SafeAreaView>
      <View
        style={{
          backgroundColor: "rgb(17, 55, 110)",
          height: 70,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 30,
            fontWeight: "semibold",
            // textAlign:"center"
          }}
        >
          Task Assignment
        </Text>
      </View>
      <View
        style={{
          height: 520,
          width: 300,
          boxShadow: "0px 0px 10px gray",
          margin: 42,
          marginTop: 60,
          borderRadius: 13,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextInput
            placeholder="Task Name"
            style={{
              backgroundColor: "rgb(237, 237, 237)",
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: "rgb(197, 197, 197)",
              borderWidth: 1,
              paddingLeft: 15,
            }}
          />

          <TextInput
            placeholder="Assign to"
            style={{
              backgroundColor: "rgb(237, 237, 237)",
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: "rgb(197, 197, 197)",
              borderWidth: 1,
              paddingLeft: 15,
            }}
          />

          <TextInput
            placeholder="Deadline"
            style={{
              backgroundColor: "rgb(237, 237, 237)",
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: "rgb(197, 197, 197)",
              borderWidth: 1,
              paddingLeft: 15,
            }}
          />

          <TextInput
            placeholder="Add Description"
            style={{
              backgroundColor: "rgb(237, 237, 237)",
              marginTop: 20,
              height: 100,
              width: 250,
              borderRadius: 15,
              borderColor: "rgb(197, 197, 197)",
              borderWidth: 1,
              paddingLeft: 15,
              paddingTop: 0,
            }}
          />

          <TextInput
            placeholder="Add file"
            style={{
              backgroundColor: "rgb(237, 237, 237)",
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: "rgb(197, 197, 197)",
              borderWidth: 1,
              paddingLeft: 15,
            }}
          />

          <TouchableOpacity
            onPress={() => router.push("/taskadd")}
            style={{
              backgroundColor: "rgb(255, 153, 0)",
              height: 60,
              width: 200,
              borderRadius: 20,
              margin: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 25,
                fontWeight: "bold",
              }}
            >
              Add task
            </Text>
          </TouchableOpacity>
        </View>

        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={30}
          color="white"
          style={{
            margin: 20,
            marginTop: 120,
            marginLeft: -5,
            backgroundColor: "rgb(17, 55, 110)",
            borderRadius: 20,
            width: 40,
            alignItems: "center",
            textAlign: "center",
          }}
        />
      </View>
    </SafeAreaView>
  );
}
