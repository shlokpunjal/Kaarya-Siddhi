import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { AlertModal } from "../../components/common/AlertModal";
import { authFetch } from "../../utils/authFetch";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import TaskDetailSkeleton from "../../components/skeletonScreens/Tasks/TaskDetailSkeleton";
import { ScreenHeader } from "../../components/task/ScreenHeader";
import { DetailRow } from "../../components/task/DetailRow";
import { FileAttachmentList } from "../../components/task/FileAttachmentList";
import { SubmittedFilesList } from "../../components/task/SubmittedFilesList";
import { ActionButton } from "../../components/task/ActionButton";
import { TaskNotFound } from "../../components/task/TaskNotFound";
import { useCurrentUserId } from "../../hooks/useCurrentUserId";
import { useTaskDetail } from "../../hooks/task/useTaskDetail";
import { useTaskDelete } from "../../hooks/task/useTaskDelete";
import { useTaskComplete } from "../../hooks/task/useTaskComplete";
import {
  TeamAssignedCard,
  normalizeMemberStatus,
  STATUS_LABELS,
} from "../../components/task/TeamAssignedCard";

const statusColorKey: Record<string, string> = {
  overdue: "overdue",
  pending: "pending",
  in_review: "inReview",
  completed: "completed",
};

// Same ceiling used for regular task attachments (hooks/task/useFileAttachments.ts).
const MAX_REVIEW_FILE_SIZE = 100 * 1024 * 1024;

export default function TaskDetail() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const currentUserId = useCurrentUserId();
  const { task, setTask, taskFiles, submissionFiles, meta, teammates, loading, refetch } =
    useTaskDetail(taskId);

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
  // tasks assigned BY the admin, so it's gated by !isSelfAssigned. Opens
  // a small modal first so the employee can optionally attach a file to
  // submit along with the request. ──
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewFile, setReviewFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pickingReviewFile, setPickingReviewFile] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const openReviewModal = () => {
    setReviewFile(null);
    setReviewModalVisible(true);
  };

  const pickReviewFile = async () => {
    try {
      setPickingReviewFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if ((asset.size ?? 0) > MAX_REVIEW_FILE_SIZE) {
        showToast("File is too large (max 100MB).", "error");
        return;
      }
      setReviewFile(asset);
    } finally {
      setPickingReviewFile(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!task) return;
    try {
      setSubmittingReview(true);

      let file_url: string | undefined;
      let file_name: string | undefined;

      // Uploading the file is optional — the employee may have nothing
      // to submit and just wants to move the task into review.
      if (reviewFile) {
        file_url = await uploadToCloudinary(
          {
            uri: reviewFile.uri,
            name: reviewFile.name,
            type: reviewFile.mimeType || "application/octet-stream",
          },
          { folder: "task_submissions", resourceType: "auto" },
        );
        file_name = reviewFile.name;
      }

      const res = await authFetch(`/tasks/${task.id}/ask-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file_url ? { file_url, file_name } : {}),
      });
      if (!res.ok) throw new Error("Failed to request review");

      setTask((prev: any) => ({ ...prev, status: "in_review" }));
      setReviewModalVisible(false);
      showToast("Task sent for review!", "success");
      refetch(); // pulls the fresh submission_files list in
    } catch (error: any) {
      showToast(error?.message || "Failed to request review", "error");
    } finally {
      setSubmittingReview(false);
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

  // The raw DB value is snake_case ("in_review") and would otherwise render
  // as the ugly "In_review" via textTransform: capitalize. Route it through
  // the same STATUS_LABELS map the Team card uses so admin and employee
  // screens always show identical wording for the same status.
  const displayStatusLabel = STATUS_LABELS[normalizeMemberStatus(displayStatus)];

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
            <Text style={{ ...typography.heading3, color: statusColor }}>
              {displayStatusLabel}
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

          {/* Same "Team" popup used on the admin screen — tapping it shows
              every teammate's name and live status (In Review, Pending,
              etc). Sharing this component means a status change here
              renders identically on the admin's screen too. */}
          <TeamAssignedCard teammates={teammates} colors={colors} label="Team" />

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }} />

          <FileAttachmentList files={taskFiles} />

          {/* Files submitted via "Ask to Review" — only relevant for
              admin-assigned tasks. Shows every teammate's submission on
              a shared team task, each tagged with who submitted it. */}
          {!isSelfAssigned && <SubmittedFilesList files={submissionFiles} />}

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

          {/* Extend Deadline — only for admin-created tasks, and hidden
              once the task is in review (nothing to extend while it's
              awaiting an admin decision). */}
          {!isSelfAssigned && task.status !== "in_review" && (
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
                onPress={openReviewModal}
                disabled={task.status === "completed" || task.status === "in_review"}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Ask to Review modal — optional file attachment */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submittingReview && setReviewModalVisible(false)}
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
            <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
              Submit for Review
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 16 }}>
              Attach a file to submit with this task if you have one — this is optional.
            </Text>

            <TouchableOpacity
              onPress={pickReviewFile}
              disabled={pickingReviewFile || submittingReview}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.base.surfaceL2,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.base.border,
                padding: 12,
                gap: 10,
                marginBottom: reviewFile ? 10 : 16,
              }}
            >
              <Ionicons name="attach" size={20} color={colors.text.secondary} />
              <Text style={{ ...typography.body, color: colors.text.secondary, flex: 1 }} numberOfLines={1}>
                {pickingReviewFile ? "Opening picker..." : reviewFile ? "Change file" : "Add a file (optional)"}
              </Text>
            </TouchableOpacity>

            {reviewFile && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.base.surfaceL2,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.base.border,
                  padding: 10,
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <Ionicons name="document-outline" size={20} color={colors.brand.accent} />
                <Text style={{ ...typography.body, color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                  {reviewFile.name}
                </Text>
                <TouchableOpacity onPress={() => setReviewFile(null)} disabled={submittingReview}>
                  <Ionicons name="close-circle" size={20} color={colors.status.overdue} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                disabled={submittingReview}
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
                onPress={handleSubmitReview}
                disabled={submittingReview}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: colors.brand.accent,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: submittingReview ? 0.7 : 1,
                }}
              >
                {submittingReview ? (
                  <ActivityIndicator color={colors.base.surfaceL1} />
                ) : (
                  <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>Submit</Text>
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