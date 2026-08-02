import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";

/**
 * Shown by task-detail-employee.tsx and task-detail-admin.tsx when the task fetch
 * comes back empty (bad taskId, deleted task, etc). Was duplicated
 * verbatim in both screens.
 */
export function TaskNotFound() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.base.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="alert-circle-outline" size={48} color={colors.status.overdue} />
      <Text style={{ ...typography.body, color: colors.text.primary, marginTop: 12 }}>
        Task not found.
      </Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.brand.accent, ...typography.body }}>
          Go Back
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}