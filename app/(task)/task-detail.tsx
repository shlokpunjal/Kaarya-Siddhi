import { mockTasks } from '../../data/mockTasks';
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";

export default function TaskDetail() {
  const { taskId } = useLocalSearchParams();
  const task = mockTasks.find((t) => t.id === taskId);

  if (!task) return <Text>Task not found</Text>;

  return (
    <SafeAreaView>
      <View
        style={{
          backgroundColor: "#0B1B3D",
          height: 60,
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
          Task Details
        </Text>{" "}
      </View>

      <View
        style={{
          boxShadow: "0px 0px 5px gray",
          borderRadius: 20,
          margin: 40,
          marginLeft: 40,
          marginTop: 80,
          width: 300,
        }}
      >
        <Text
          style={{
            marginLeft: 20,
            fontSize: 25,
            marginTop: 15,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {task.title}
        </Text>

        <View style={{}}>
          <View
            style={{
              marginLeft: 20,
              marginTop: 20,
            }}
          >
            <Text style={{ fontWeight: "bold", lineHeight: 20, fontSize: 17 }}>
              Description:
            </Text>
            :
            <Text
              style={{
                marginTop: 8,
              }}
            >
              {task.label}
            </Text>
          </View>

          <Text
            style={{
              marginLeft: 20,
              marginTop: 25,
            }}
          >
            <Text style={{ fontWeight: "bold", lineHeight: 20, fontSize: 17 }}>
              Status:{" "}
            </Text>

            <Text
              style={{
                color: "rgb(218, 4, 4)",
                fontSize: 17,
                fontWeight: "semibold",
              }}
            >
              {task.status}
            </Text>
          </Text>

          <Text
            style={{
              marginLeft: 20,
              marginTop: 25,
            }}
          >
            <Text style={{ fontWeight: "bold", lineHeight: 20, fontSize: 17 }}>
              Duedate:{" "}
            </Text>

            <Text
              style={{
                color: "rgb(218, 4, 4)",
                fontSize: 17,
                fontWeight: "semibold",
              }}
            >
              {task.dueDate}
            </Text>
          </Text>

          <Text
            style={{
              marginLeft: 20,
              fontSize: 17,
              fontWeight: "bold",
              marginTop: 25,
            }}
          >
            Files Attached:
          </Text>

          <View
            style={{
              height: 45,
              borderWidth: 1,
              width: 220,
              display: "flex",
              margin: 20,
              borderRadius: 15,
              backgroundColor: "rgba(237, 233, 237, 0.47)",
              // alignItems:"center",
              // justifyContent:"center",
              flexDirection: "row",
              gap: 30,
            }}
          >
            <Ionicons
              style={{
                marginTop: 10,
                marginLeft: 14,
              }}
              name="document"
              size={24}
              color="gray"
            />

            <Text
              style={{
                marginTop: 12,
                color: "rgba(23, 22, 23, 0.84)",
              }}
            >
              ABC.pdf
            </Text>
          </View>

          <View
            style={{
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Success", "Task created successfully!")
              }
              style={{
                padding: 10,
                height: 53,
                width: 200,
                backgroundColor: "#E8870A",
                borderRadius: 10,
                alignItems: "center",
                margin: 30,
                marginLeft: 50,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 25 }}
              >
                Submit Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
