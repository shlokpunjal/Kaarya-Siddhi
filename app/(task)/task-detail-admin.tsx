import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
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

import { authFetch } from "../../utils/authFetch";
import TaskDetailSkeleton from "../../components/skeletonScreens/Tasks/TaskDetailSkeleton";
import { ScreenHeader } from "../../components/task/ScreenHeader";
import { DetailRow } from "../../components/task/DetailRow";
import { FileAttachmentList } from "../../components/task/FileAttachmentList";
import { ActionButton } from "../../components/task/ActionButton";
import { TaskNotFound } from "../../components/task/TaskNotFound";
import { useCurrentUserId } from "../../hooks/useCurrentUserId";
import { useTaskDetail } from "../../hooks/task/useTaskDetail";
import { useTaskDelete } from "../../hooks/task/useTaskDelete";
import { useTaskComplete } from "../../hooks/task/useTaskComplete";

// Keyed by the normalized in-app status ("inReview"), not the raw DB value.
const statusColorKey: Record<string, string> = {
  overdue: "overdue",
  pending: "pending",
  inReview: "inReview",
  completed: "completed",
};

// Every task on this screen was created by an admin (the dashboard only
// fetches tasks where created_by = the logged-in admin), but we still
// normalize "in_review" -> "inReview" the same way the fetch used to.
const normalizeStatus = (taskData: any) => ({
  ...taskData,
  status: taskData.status === "in_review" ? "inReview" : taskData.status,
});

export default function TaskDetailAdmin() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const currentUserId = useCurrentUserId();
  const { task, setTask, taskFiles, meta, loading } = useTaskDetail(
    taskId,
    normalizeStatus,
  );

  // We still confirm ownership before showing edit/delete — guards against
  // a stray deep link to someone else's task.
  const isOwnTask =
    !!task && !!currentUserId && task.created_by === currentUserId;
  const canEditOrDelete = isOwnTask && task?.status !== "completed";
  const canReview = task?.status !== "completed";

  const taskDelete = useTaskDelete(taskId, () => router.back());
  const taskComplete = useTaskComplete(taskId, () =>
    setTask((prev: any) => ({ ...prev, status: "completed" })),
  );

  // ── Suggest Changes: sends the message + pushes the task back to
  // pending. PATCH /tasks/:id accepts { status, suggestion } and —
  // server-side — notifies the assigned employee. ──
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

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
        body: JSON.stringify({ status: "pending", suggestion: suggestionText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send suggestion");

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

  if (loading) return <TaskDetailSkeleton />;

  if (!task) {
    return <TaskNotFound />;
  }

  const statusColor =
    colors.status[statusColorKey[task.status] as keyof typeof colors.status] ??
    colors.text.secondary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader title="Task Details" />

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
          {/* Title + edit/delete */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <Text style={{ ...typography.heading, color: colors.text.primary, flex: 1 }}>
              {task.title}
            </Text>

            {canEditOrDelete && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 2 }}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({ pathname: "/(task)/new-task", params: { taskId: task.id } })
                  }
                  disabled={taskDelete.deleting}
                >
                  <Ionicons name="create-outline" size={22} color={colors.brand.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={taskDelete.requestDelete} disabled={taskDelete.deleting}>
                  {taskDelete.deleting ? (
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
            <Text style={{ ...typography.heading3, color: statusColor, textTransform: "capitalize" }}>
              {task.status ?? "pending"}
            </Text>
          </View>

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

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
            Description
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 20 }}>
            {task.description?.trim().replace(/\n{3,}/g, "\n\n") ||
              "No description provided."}
          </Text>

          {/* Deadline is edited directly via the edit icon above (routes to
              /newtask in edit mode) — no separate "Extend Deadline" flow here. */}
          <DetailRow
            icon="calendar-outline"
            label="Deadline"
            value={
              task.deadline
                ? new Date(task.deadline).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "No deadline set"
            }
            valueColor={statusColor}
          />

          <DetailRow icon="person-outline" label="Assigned To" value={meta.assigned_to_name || "—"} />

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          <FileAttachmentList files={taskFiles} />

          {/* Suggest Changes / Mark Complete */}
          {canReview ? (
            <View style={{ marginTop: 24 }}>
              <ActionButton
                label="Suggest Changes"
                onPress={handleOpenSuggestion}
                color={colors.brand.secprimary}
              />
              <View style={{ marginTop: 12 }}>
                <ActionButton label="Mark Complete" onPress={taskComplete.requestComplete} />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <ActionButton label="Already Completed" onPress={() => {}} disabled />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Suggest Changes Modal */}
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
            <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 12 }}>
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
                <Text style={{ ...typography.body, color: colors.text.primary }}>Cancel</Text>
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
                  <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={taskComplete.confirmVisible}
        type="warning"
        title="Mark as Complete"
        message="Do you want to mark this task as complete?"
        confirmText={taskComplete.completing ? "Marking..." : "Yes, Complete"}
        cancelText="Cancel"
        onConfirm={taskComplete.confirmComplete}
        onCancel={taskComplete.cancelComplete}
      />

      <AlertModal
        visible={taskDelete.confirmVisible}
        type="warning"
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText={taskDelete.deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={taskDelete.confirmDelete}
        onCancel={taskDelete.cancelDelete}
      />
    </SafeAreaView>
  );
}