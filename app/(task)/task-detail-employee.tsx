import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { AlertModal } from "../../components/common/AlertModal";
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

const statusColorKey: Record<string, string> = {
  overdue: "overdue",
  pending: "pending",
  in_review: "inReview",
  completed: "completed",
};

export default function TaskDetail() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const currentUserId = useCurrentUserId();
  const { task, setTask, taskFiles, meta, loading } = useTaskDetail(taskId);

  // "Own task" governs edit/delete, Mark Complete, and whether this is a
  // self-created task at all (vs one an admin assigned).
  const isOwnTask =
    !!task && !!currentUserId && task.created_by === currentUserId;
  const isSelfAssigned =
    !!task &&
    task.created_by &&
    task.assigned_to &&
    task.created_by === task.assigned_to;

  const taskDelete = useTaskDelete(
    taskId,
    () => router.back(),
    // Defense in depth — never rely solely on the icon being hidden.
    () => (isOwnTask ? true : "You can only delete tasks you created."),
  );

  const taskComplete = useTaskComplete(taskId, () =>
    setTask((prev: any) => ({ ...prev, status: "completed" })),
  );

  // ── "Ask to Review" (moves task into the review queue) — specific to
  // tasks assigned BY the admin, so it's gated by !isSelfAssigned. ──
  const [askingReview, setAskingReview] = useState(false);
  const handleAskToReview = async () => {
    if (!task) return;
    try {
      setAskingReview(true);
      const res = await authFetch(`/tasks/${task.id}/ask-review`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to request review");
      setTask((prev: any) => ({ ...prev, status: "in_review" }));
      showToast("Task sent for review!", "success");
    } catch (error: any) {
      showToast(error?.message || "Failed to request review", "error");
    } finally {
      setAskingReview(false);
    }
  };

  // ── Pending extension check, refreshed on focus ──
  const [hasPendingExtension, setHasPendingExtension] = useState(false);
  const checkPendingExtension = useCallback(async () => {
    if (!taskId) return;
    const res = await authFetch(`/tasks/${taskId}/pending-extension`);
    if (!res.ok) return;
    const { pending } = await res.json();
    setHasPendingExtension(pending);
  }, [taskId]);
  useFocusEffect(
    useCallback(() => {
      checkPendingExtension();
    }, [checkPendingExtension]),
  );

  if (loading) return <TaskDetailSkeleton />;

  if (!task) {
    return <TaskNotFound />;
  }

  // "overdue" isn't a real DB value — it's a pending task whose deadline
  // has passed. We only relabel for display; task.status stays "pending".
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const isOverdue =
    task.status === "pending" &&
    !!task.deadline &&
    task.deadline.slice(0, 10) < todayDateStr;
  const displayStatus = isOverdue ? "overdue" : (task.status ?? "pending");
  const statusColor =
    colors.status[statusColorKey[displayStatus] as keyof typeof colors.status] ??
    colors.text.secondary;

  const canEditOrDelete = isOwnTask && task.status !== "completed";

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
                    router.push({ pathname: "/(task)/new-task-employee", params: { taskId: task.id } })
                  }
                  disabled={taskDelete.deleting}
                >
                  <Ionicons name="create-outline" size={22} color={colors.brand.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={taskDelete.requestDelete} disabled={taskDelete.deleting}>
                  <Ionicons name="trash-outline" size={20} color={colors.status.overdue} />
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
              {displayStatus}
            </Text>
          </View>

          {task.status === "completed" && (
            <InfoBanner
              icon="information-circle-outline"
              color={colors.status.overdue}
              text="This will be deleted after 15 days."
            />
          )}

          {!!task.suggestion && (
            <SuggestionBanner suggestion={task.suggestion} />
          )}

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
            Description
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 20 }}>
            {task.description?.trim().replace(/\n{3,}/g, "\n\n") || "No description provided."}
          </Text>

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

          <DetailRow
            icon="person-outline"
            label="Assigned By"
            value={isSelfAssigned ? "You (self-created)" : meta.assigned_by_name || "—"}
          />

          {isSelfAssigned && (
            <InfoBanner
              icon="person-circle-outline"
              color={colors.brand.accent}
              text="This task was created by the employee for themselves."
              plain
            />
          )}

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          <FileAttachmentList files={taskFiles} />

          {/* Mark Complete — only for tasks the employee created themselves */}
          {isOwnTask && (
            <View style={{ marginTop: 24 }}>
              <ActionButton
                label={task.status === "completed" ? "Already Completed" : "Mark Complete"}
                onPress={taskComplete.requestComplete}
                disabled={taskComplete.completing || task.status === "completed"}
                loading={taskComplete.completing}
              />
            </View>
          )}

          {/* Extend Deadline — only for admin-created tasks */}
          {!isSelfAssigned && (
            <View style={{ marginTop: 12 }}>
              <ActionButton
                label={hasPendingExtension ? "Extension Requested" : "Extend Deadline"}
                onPress={() =>
                  router.push({ pathname: "/(task)/extend-deadline", params: { taskId: task.id } })
                }
                disabled={hasPendingExtension || task.status === "completed"}
                color={colors.brand.secprimary}
              />
            </View>
          )}

          {/* Ask to Review — tasks assigned BY the admin only */}
          {!isSelfAssigned && (
            <View style={{ marginTop: 12 }}>
              <ActionButton
                label={
                  task.status === "completed"
                    ? "Already Completed"
                    : task.status === "in_review"
                      ? "Under Review"
                      : "Ask to Review"
                }
                onPress={handleAskToReview}
                disabled={
                  askingReview || task.status === "completed" || task.status === "in_review"
                }
                loading={askingReview}
              />
            </View>
          )}
        </View>
      </ScrollView>

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

// Small local presentational helpers — only used on this screen and its
// admin counterpart's "suggestion" banner is different enough not to share.
function InfoBanner({
  icon,
  color,
  text,
  plain,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
  plain?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: colors.base.surfaceL2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: plain ? colors.base.border : color,
        padding: 10,
        marginBottom: plain ? 20 : 16,
      }}
    >
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 1 }} />
      <Text style={{ ...typography.label, color: plain ? colors.text.secondary : color, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

function SuggestionBanner({ suggestion }: { suggestion: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: colors.base.surfaceL2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.brand.accent,
        padding: 10,
        marginBottom: 16,
      }}
    >
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={16}
        color={colors.brand.accent}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.label, color: colors.brand.accent, marginBottom: 2 }}>
          Suggestion from admin
        </Text>
        <Text style={{ ...typography.body, color: colors.text.secondary }}>{suggestion}</Text>
      </View>
    </View>
  );
}