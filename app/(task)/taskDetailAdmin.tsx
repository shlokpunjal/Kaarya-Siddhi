import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

export default function TaskDetailAdmin() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();

  const statusColorMap: Record<string, string> = {
    overdue: colors.status.overdue,
    pending: colors.status.pending,
    in_review: colors.status.inReview,
    completed: colors.status.completed,
  };

  const [task, setTask] = useState<any>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingExtension, setHasPendingExtension] = useState(false);
  const [assignedName, setAssignedName] = useState<string>("—");

  // ── Fetch task + its files from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      setLoading(true);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Task fetch error:", taskError);
        setLoading(false);
        return;
      }

      const { data: files, error: filesError } = await supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId);

      if (filesError) console.error("Files fetch error:", filesError);

      setTask(taskData);
      setTaskFiles(files ?? []);
      setLoading(false);
    };

    fetchTask();
  }, [taskId]);

  // ── Resolve assigned employee's name (task.assigned_to is a user id) ────────
  useEffect(() => {
    const resolveAssignee = async () => {
      if (!task?.assigned_to) return;

      const { data, error } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", task.assigned_to)
        .single();

      if (!error && data) {
        setAssignedName(data.name || data.email || task.assigned_to);
      } else {
        setAssignedName(task.assigned_to);
      }
    };

    resolveAssignee();
  }, [task]);

  // ── Check for an existing pending extension request, refreshed on focus ─────
  const checkPendingExtension = useCallback(async () => {
    if (!taskId) return;
    const { data, error } = await supabase
      .from("extension_requests")
      .select("id")
      .eq("task_id", taskId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) {
      console.error("Extension request check error:", error);
      return;
    }
    setHasPendingExtension(!!data);
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      checkPendingExtension();
    }, [checkPendingExtension])
  );

  // ── Submit task → inserts into task_submissions + updates status ────────────
  const handleSubmit = async () => {
    if (!task) return;

    try {
      setSubmitting(true);

      const { error: submitError } = await supabase
        .from("task_submissions")
        .insert({
          task_id: task.id,
          submitted_by: task.assigned_to,
          note: "Submitted via app",
        });

      if (submitError) throw submitError;

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "inReview" })
        .eq("id", task.id);

      if (updateError) throw updateError;

      setTask((prev: any) => ({ ...prev, status: "inReview" }));

      alert("Task submitted successfully!");
      router.back();
    } catch (error: any) {
      alert("Submit failed: " + (error?.message || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
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
        <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 12 }}>
          Loading task...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Task not found ───────────────────────────────────────────────────────────
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

  const statusColor = statusColorMap[task.status] ?? colors.text.secondary;

  // ── UI ───────────────────────────────────────────────────────────────────────
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
          Task Details
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
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
              ...typography.heading,
              color: colors.text.primary,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {task.title}
          </Text>

          {/* Status */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Ionicons name="ellipse" size={12} color={statusColor} style={{ marginRight: 8 }} />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>Status: </Text>
            <Text
              style={{
                ...typography.heading3,
                color: statusColor,
                textTransform: "capitalize",
              }}
            >
              {task.status ?? "pending"}
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          {/* Description */}
          <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
            Description
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 20 }}>
            {task.description ?? "No description provided."}
          </Text>

          {/* Deadline */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Deadline:{" "}
            </Text>
            <Text style={{ ...typography.body, color: statusColor }}>
              {task.deadline
                ? new Date(task.deadline).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "No deadline set"}
            </Text>
          </View>

          {/* Assigned To */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Assigned To:{" "}
            </Text>
            <Text
              numberOfLines={1}
              style={{ ...typography.body, color: colors.text.secondary, flex: 1 }}
            >
              {assignedName}
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          {/* Files Attached — fetched from task_files table (Cloudinary URLs) */}
          <Text
            style={{
              ...typography.heading3,
              color: colors.text.primary,
              marginBottom: 10,
            }}
          >
            Files Attached ({taskFiles.length})
          </Text>

          {taskFiles.length === 0 ? (
            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                marginBottom: 16,
              }}
            >
              No files attached.
            </Text>
          ) : (
            taskFiles.map((file, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => file.file_url && Linking.openURL(file.file_url)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.base.surfaceL2,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.base.border,
                  padding: 12,
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                <Ionicons name="document" size={22} color={colors.brand.primary} />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, ...typography.body, color: colors.text.primary }}
                >
                  {file.file_name ?? "Unnamed file"}
                </Text>
                <Ionicons name="open-outline" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            ))
          )}

          {/* Submit Task Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || task.status === "completed" || task.status === "inReview"}
            style={{
              backgroundColor:
                task.status === "completed" || task.status === "inReview"
                  ? colors.base.border
                  : colors.brand.accent,
              height: 50,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 24,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.base.surfaceL1} />
            ) : (
              <Text
                style={{
                  color: colors.brand.onPrimary,
                  ...typography.subheading,
                }}
              >
                {task.status === "completed"
                  ? "Already Completed"
                  : task.status === "inReview"
                  ? "Under Review"
                  : "Submit Task"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Extend Deadline Button */}
          <TouchableOpacity
            disabled={hasPendingExtension || task.status === "completed"}
            onPress={() =>
              router.push({
                pathname: "/(task)/extend-deadline",
                params: { taskId: task.id },
              })
            }
            style={{
              height: 50,
              borderRadius: 12,
              backgroundColor:
                hasPendingExtension || task.status === "completed"
                  ? colors.base.border
                  : colors.brand.secprimary,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            <Text
              style={{
                ...typography.subheading,
                color: colors.brand.onPrimary,
              }}
            >
              {hasPendingExtension ? "Extension Requested" : "Extend Deadline"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}