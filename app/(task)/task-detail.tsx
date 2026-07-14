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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

export default function TaskDetail() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();

  const statusColorMap: Record<string, string> = {
    overdue: colors.status.overdue,
    pending: colors.status.pending,
    in_review: colors.status.inReview,
    completed: colors.status.completed,
  };


  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

// ── Resolve logged-in user's id (to check task ownership) ──
useEffect(() => {
  const resolveUser = async () => {
    const email = await AsyncStorage.getItem("userEmail");
    if (!email) return;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!error && data) {
      setCurrentUserId(data.id);
    }
  };

  resolveUser();
}, []);
  const [task, setTask] = useState<any>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingExtension, setHasPendingExtension] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignedName, setAssignedName] = useState<string>("—");
  const isOwnTask =
  !!task &&
  !!currentUserId &&
  task.created_by === currentUserId &&
  task.status !== "completed";
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

  // ── Delete task ───────────────────────────────────────────────────────────────
  const handleDeleteTask = () => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDeleteTask },
      ]
    );
  };

  const confirmDeleteTask = async () => {
    if (!task) return;

    try {
      setDeleting(true);

      // Remove dependent rows first in case the DB doesn't have ON DELETE CASCADE set up
      await supabase.from("task_files").delete().eq("task_id", task.id);
      await supabase.from("task_submissions").delete().eq("task_id", task.id);
      await supabase.from("extension_requests").delete().eq("task_id", task.id);

      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;

      Alert.alert("Deleted", "Task has been deleted.");
      router.back();
    } catch (error: any) {
      Alert.alert("Delete failed", error?.message || "Something went wrong.");
    } finally {
      setDeleting(false);
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
          {/* Task Title + Edit/Delete icons */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
             
            }}
          >
            
            <Text
              style={{
                ...typography.heading,
                color: colors.text.primary,
                textAlign: "center",
                flexShrink: 1,
              }}
              numberOfLines={2}
            >
              {task.title}
            </Text>

           {isOwnTask && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 190 }}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(task)/newtaskemp",
                    params: { taskId: task.id },
                  })
                }
                disabled={deleting}
              >
                <Ionicons name="create-outline" size={22} color={colors.brand.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteTask} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.status.overdue} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={colors.status.overdue} />
                )}
              </TouchableOpacity>
            </View>
          )}
          </View>
          
          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />
          
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

          {/* Auto-deletion notice — shown only when the task is completed */}
         {task.status === "completed" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: colors.base.surfaceL2,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.status.overdue,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.status.overdue}
                style={{ marginTop: 1 }}
              />
              <Text style={{ ...typography.label, color: colors.status.overdue, flex: 1 }}>
                This will be deleted after 15 days.
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          {/* Description */}
          <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
            Description
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 20 }}>
            {task.description?.trim().replace(/\n{3,}/g, '\n\n') || "No description provided."}
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
            onPress={() =>
              router.push({
                pathname: "/(task)/complete",
                params: { taskId: task.id },
              })
            }
            disabled={task.status === "completed" || task.status === "inReview"}
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
                  : "Review or Complete"}
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