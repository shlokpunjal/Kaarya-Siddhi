import { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

export default function Complete() {
  const { colors } = useTheme();
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState<"suggestion" | "complete" | null>(null);

  useEffect(() => {
    if (!taskId) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) console.error("Task fetch error:", error);
      setTask(data);
      setLoading(false);
    })();
  }, [taskId]);

  // ── Admin sends the task back with a suggestion → status resets to pending ──
  const handleAddSuggestion = async () => {
    if (!feedback.trim()) {
      Alert.alert("Add feedback", "Please write a suggestion before sending it back.");
      return;
    }

    try {
      setSubmitting("suggestion");

      const { error } = await supabase
        .from("tasks")
        .update({
          status: "pending",
          suggestion: feedback.trim(),
        })
        .eq("id", taskId);

      if (error) throw error;

      Alert.alert(
        "Suggestion sent",
        "The task has been sent back to the employee as pending, with your feedback.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert("Could not send suggestion", error?.message || "Something went wrong.");
    } finally {
      setSubmitting(null);
    }
  };

  // ── Mark the task complete → shows up as completed for admin & employee ─────
 // ── Mark the task complete → shows up as completed for admin & employee ─────
const handleMarkComplete = async () => {
  try {
    setSubmitting("complete");

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "completed",
        suggestion: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;

    Alert.alert(
      "Task completed",
      "This task has been marked as complete. It will be automatically deleted 15 days from now.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  } catch (error: any) {
    Alert.alert("Could not complete task", error?.message || "Something went wrong.");
  } finally {
    setSubmitting(null);
  }
};

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.base.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!task) {
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
          <Text style={{ color: colors.brand.primary, ...typography.body }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const busy = submitting !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={28}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            flex: 1,
            textAlign: "center",
            marginRight: 28,
          }}
        >
          Task Completion
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
              },
              android: { elevation: 5 },
            }),
          }}
        >
          {/* Task Title */}
          <Text
            style={{
              ...typography.heading3,
              color: colors.text.primary,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {task.title}
          </Text>

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          {/* Feedback input */}
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Add feedback"
            placeholderTextColor={colors.text.secondary}
            multiline
            numberOfLines={4}
            editable={!busy}
            style={{
              minHeight: 100,
              backgroundColor: colors.base.surfaceL2,
              borderRadius: 12,
              padding: 14,
              textAlignVertical: "top",
              ...typography.body,
              color: colors.text.primary,
              marginBottom: 24,
            }}
          />

          {/* Add Suggestion */}
          <TouchableOpacity
            onPress={handleAddSuggestion}
            disabled={busy}
            style={{
              height: 52,
              borderRadius: 26,
              borderWidth: 1.5,
              borderColor: colors.brand.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {submitting === "suggestion" ? (
              <ActivityIndicator color={colors.brand.accent} />
            ) : (
              <Text style={{ ...typography.subheading, color: colors.brand.accent }}>
                Add Suggestion
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              ...typography.body,
              color: colors.text.secondary,
              textAlign: "center",
              marginVertical: 14,
            }}
          >
            OR
          </Text>

          {/* Mark as Complete */}
          <TouchableOpacity
            onPress={handleMarkComplete}
            disabled={busy}
            style={{
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.status.completed,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {submitting === "complete" ? (
              <ActivityIndicator color={colors.brand.onPrimary} />
            ) : (
              <Text style={{ ...typography.subheading, color: colors.brand.onPrimary }}>
                Mark as Complete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}