import { mockTasks } from '../../data/mockTasks';
import { useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { lightTheme, typography } from "../../theme/theme";

const { colors } = lightTheme;

// Map task status to theme status colors
const statusColorMap: Record<string, string> = {
  overdue: colors.status.overdue,
  pending: colors.status.pending,
  inReview: colors.status.inReview,
  completed: colors.status.completed,
};

export default function TaskDetail() {
  const { taskId } = useLocalSearchParams();
  const task = mockTasks.find((t) => t.id === taskId);

  if (!task) return <Text style={{ ...typography.body, color: colors.text.primary }}>Task not found</Text>;

  const statusColor = statusColorMap[task.status] ?? colors.text.secondary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 60,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            ...typography.heading,
            color: colors.base.surfaceL1,
          }}
        >
          Task Details
        </Text>
      </View>

      {/* Card */}
      <View
        style={{
          backgroundColor: colors.base.surfaceL1,
          boxShadow: "0px 0px 5px gray",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.base.border,
          margin: 40,
          marginTop: 80,
          width: 300,
        }}
      >
        {/* Task Title */}
        <Text
          style={{
            ...typography.heading,
            marginTop: 15,
            textAlign: "center",
            color: colors.text.primary,
          }}
        >
          {task.title}
        </Text>

        <View>
          {/* Description */}
          <View style={{ marginLeft: 20, marginTop: 20 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Description:
            </Text>
            <Text style={{ ...typography.body, marginTop: 8, color: colors.text.secondary }}>
              {task.label}
            </Text>
          </View>

          {/* Status */}
          <View style={{ marginLeft: 20, marginTop: 25, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Status:
            </Text>
            <Text style={{ ...typography.heading3, color: statusColor }}>
              {task.status}
            </Text>
          </View>

          {/* Due Date */}
          <View style={{ marginLeft: 20, marginTop: 25, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Due Date:
            </Text>
            <Text style={{ ...typography.heading3, color: statusColor }}>
              {task.dueDate}
            </Text>
          </View>

          {/* Files Attached */}
          <Text style={{ ...typography.heading3, marginLeft: 20, marginTop: 25, color: colors.text.primary }}>
            Files Attached:
          </Text>

          <View
            style={{
              height: 45,
              borderWidth: 1,
              borderColor: colors.base.border,
              width: 220,
              margin: 20,
              borderRadius: 15,
              backgroundColor: colors.base.surfaceL2,
              flexDirection: "row",
              alignItems: "center",
              gap: 30,
            }}
          >
            <Ionicons
              style={{ marginLeft: 14 }}
              name="document"
              size={24}
              color={colors.text.secondary}
            />
            <Text style={{ ...typography.body, color: colors.text.primary }}>
              ABC.pdf
            </Text>
          </View>

          {/* Submit Button */}
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => Alert.alert("Success", "Task created successfully!")}
              style={{
                height: 53,
                width: 200,
                backgroundColor: colors.brand.accent,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                margin: 30,
                marginLeft: 50,
              }}
            >
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
                Submit Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
