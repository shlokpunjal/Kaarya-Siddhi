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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { AlertModal } from "../../components/common/AlertModal";
import { authFetch } from "../../utils/authFetch";
import TaskDetailSkeleton from "../../components/skeletonScreens/TaskDetailSkeleton";

export default function TaskDetailAdmin() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  // Keyed by the normalized in-app status ("inReview"), not the raw DB value.
  const statusColorMap: Record<string, string> = {
    overdue: colors.status.overdue,
    pending: colors.status.pending,
    inReview: colors.status.inReview,
    completed: colors.status.completed,
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ── Resolve logged-in admin's id (to confirm task ownership before
  // showing edit/delete) ──────────────────────────────────────────────────
  useEffect(() => {
    const resolveUser = async () => {
      const res = await authFetch("/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.id);
      }
    };

    resolveUser();
  }, []);

  const [task, setTask] = useState<any>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedName, setAssignedName] = useState<string>("—");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // ── Suggest Changes (opens a dialog, admin types a message, task goes
  // back to pending with the message attached) ────────────────────────────
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  // ── Mark Complete (confirm dialog, then updates status) ─────────────────
  const [completeConfirmVisible, setCompleteConfirmVisible] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Every task on this screen was created by an admin (the dashboard only
  // fetches tasks where created_by = the logged-in admin), but we still
  // confirm ownership before showing edit/delete, same pattern as the
  // employee screen — guards against a stray deep link to someone else's task.
  const isOwnTask =
    !!task && !!currentUserId && task.created_by === currentUserId;
  const canEditOrDelete = isOwnTask && task?.status !== "completed";
  const canReview = task?.status !== "completed";

  // ── Fetch task + its files from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      setLoading(true);

      const res = await authFetch(`/tasks/${taskId}/detail`);
      if (!res.ok) {
        console.error("Task fetch error:", res.status);
        setLoading(false);
        return;
      }

      const { task: taskData, files, assigned_to_name } = await res.json();

      setTask({
        ...taskData,
        status: taskData.status === "in_review" ? "inReview" : taskData.status,
      });
      setTaskFiles(files ?? []);
      setAssignedName(assigned_to_name || "—");
      setLoading(false);
    };

    fetchTask();
  }, [taskId]);

  // ── Delete task ───────────────────────────────────────────────────────────────
  const handleDeleteTask = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteTask = async () => {
    if (!task) return;

    try {
      setDeleting(true);

      const res = await authFetch(`/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      setDeleteConfirmVisible(false);
      showToast("Task has been deleted.", "success");
      setTimeout(() => router.back(), 900);
    } catch (error: any) {
      setDeleteConfirmVisible(false);
      showToast(error?.message || "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Suggest Changes: sends the message + pushes the task back to pending.
  // PATCH /tasks/:id accepts { status, suggestion } and — server-side —
  // notifies the assigned employee (notifications row + push/tray alert).
  const handleOpenSuggestion = () => {
    setSuggestionText("");
    setSuggestionModalVisible(true);
  };

  const handleSendSuggestion = async () => {
    if (!task || !suggestionText.trim()) {
      showToast("Please write a suggestion first", "error");
      return;
    }

    try {
      setSendingSuggestion(true);

      const res = await authFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending",
          suggestion: suggestionText.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send suggestion");

      // The employee is notified server-side by the PATCH above (writes a
      // `notifications` row + sends the push/tray alert) — see
      // backend/routes/employee_tasks.py:update_task.

      setTask((prev: any) => ({
        ...prev,
        status: "pending",
        suggestion: suggestionText.trim(),
      }));

      setSuggestionModalVisible(false);
      showToast("Suggestion sent to employee.", "success");
    } catch (error: any) {
      showToast(error?.message || "Failed to send suggestion", "error");
    } finally {
      setSendingSuggestion(false);
    }
  };

  // ── Mark Complete: confirm dialog, then updates status ──────────────────────
  // NOTE: same assumption as above — adjust the endpoint/body to your backend.
  const handleMarkComplete = () => {
    setCompleteConfirmVisible(true);
  };

  const confirmMarkComplete = async () => {
    if (!task) return;

    try {
      setCompleting(true);

      const res = await authFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) throw new Error("Failed to mark complete");

      setTask((prev: any) => ({ ...prev, status: "completed" }));
      setCompleteConfirmVisible(false);
      showToast("Task marked as completed!", "success");
    } catch (error: any) {
      setCompleteConfirmVisible(false);
      showToast(error?.message || "Failed to mark complete", "error");
    } finally {
      setCompleting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <TaskDetailSkeleton />
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
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.status.overdue}
        />
        <Text
          style={{
            ...typography.body,
            color: colors.text.primary,
            marginTop: 12,
          }}
        >
          Task not found.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.brand.accent, ...typography.body }}>
            Go Back
          </Text>
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
          height: moderateScale(70),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={moderateScale(28)}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            flex: 1,
            textAlign: "center",
            marginRight: moderateScale(28),
          }}
        >
          Task Details
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: wp(6.4), paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: wp(5.3),
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
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <Text
              style={{
                ...typography.heading,
                color: colors.text.primary,
                flex: 1,
              }}
            >
              {task.title}
            </Text>

            {canEditOrDelete && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 2,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(task)/newtask",
                      params: { taskId: task.id },
                    })
                  }
                  disabled={deleting}
                >
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={colors.brand.accent}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteTask}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.status.overdue}
                    />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.status.overdue}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.base.border,
              marginBottom: 16,
            }}
          />

          {/* Status */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="ellipse"
              size={12}
              color={statusColor}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ ...typography.heading3, color: colors.text.primary }}
            >
              Status:{" "}
            </Text>
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
              <Text
                style={{
                  ...typography.label,
                  color: colors.status.overdue,
                  flex: 1,
                }}
              >
                This will be deleted after 15 days.
              </Text>
            </View>
          )}

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: colors.base.border,
              marginBottom: 16,
            }}
          />

          {/* Description */}
          <Text
            style={{
              ...typography.heading3,
              color: colors.text.primary,
              marginBottom: 6,
            }}
          >
            Description
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.text.secondary,
              marginBottom: 20,
            }}
          >
            {task.description ?? "No description provided."}
          </Text>

          {/* Deadline — no longer has a separate "Extend Deadline" flow here;
              admin edits the deadline directly via the edit icon above,
              which routes to /newtask in edit mode. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ ...typography.heading3, color: colors.text.primary }}
            >
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ ...typography.heading3, color: colors.text.primary }}
            >
              Assigned To:{" "}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                ...typography.body,
                color: colors.text.secondary,
                flex: 1,
              }}
            >
              {assignedName}
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: colors.base.border,
              marginBottom: 16,
            }}
          />

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
                <Ionicons
                  name="document"
                  size={22}
                  color={colors.brand.accent}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    ...typography.body,
                    color: colors.text.primary,
                  }}
                >
                  {file.file_name ?? "Unnamed file"}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            ))
          )}

          {/* Suggest Changes / Mark Complete — two separate actions replacing
              the old single "Review or Complete" button. */}
          {canReview ? (
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity
                onPress={handleOpenSuggestion}
                style={{
                  width: "100%",
                  backgroundColor: colors.brand.secprimary,
                  height: moderateScale(50),
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.brand.onPrimary,
                    ...typography.subheading,
                  }}
                >
                  Suggest Changes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMarkComplete}
                style={{
                  width: "100%",
                  backgroundColor: colors.brand.accent,
                  height: moderateScale(50),
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.brand.onPrimary,
                    ...typography.subheading,
                  }}
                >
                  Mark Complete
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.base.border,
                height: moderateScale(50),
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 24,
              }}
            >
              <Text
                style={{
                  color: colors.brand.onPrimary,
                  ...typography.subheading,
                }}
              >
                Already Completed
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Suggest Changes Modal — free-text message that goes back to the
          employee, and pushes the task back into Pending */}
      <Modal
        visible={suggestionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: wp(6.4),
          }}
        >
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.base.border,
            }}
          >
            <Text
              style={{
                ...typography.heading3,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Suggest Changes
            </Text>
            <TextInput
              value={suggestionText}
              onChangeText={setSuggestionText}
              placeholder="What should the employee change?"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={4}
              style={{
                ...typography.body,
                color: colors.text.primary,
                backgroundColor: colors.base.surfaceL2,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.base.border,
                padding: 12,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setSuggestionModalVisible(false)}
                disabled={sendingSuggestion}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.base.border,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ ...typography.body, color: colors.text.primary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendSuggestion}
                disabled={sendingSuggestion}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: colors.brand.accent,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: sendingSuggestion ? 0.7 : 1,
                }}
              >
                {sendingSuggestion ? (
                  <ActivityIndicator color={colors.base.surfaceL1} />
                ) : (
                  <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>
                    Send
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mark Complete confirmation */}
      <AlertModal
        visible={completeConfirmVisible}
        type="warning"
        title="Mark as Complete"
        message="Do you want to mark this task as complete?"
        confirmText={completing ? "Marking..." : "Yes, Complete"}
        cancelText="Cancel"
        onConfirm={confirmMarkComplete}
        onCancel={() => setCompleteConfirmVisible(false)}
      />

      <AlertModal
        visible={deleteConfirmVisible}
        type="warning"
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}