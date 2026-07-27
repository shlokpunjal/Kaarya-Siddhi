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
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { AlertModal } from "../../components/AlertModal";
import { authFetch } from "../../utils/authFetch";

export default function TaskDetail() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

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
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingExtension, setHasPendingExtension] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // ── "Ask to Review" (moves task into the review queue for both roles) ───────
  const [askingReview, setAskingReview] = useState(false);

  // "Own task" governs both edit/delete icons AND the Review-or-Complete button —
  // an employee should only be able to act on tasks they created themselves,
  // not ones an admin assigned to them.

  // ── Who assigned/created this task (task.created_by), shown as "Assigned By" ──
  const [assignedByName, setAssignedByName] = useState<string>("—");
  const isOwnTask =
    !!task && !!currentUserId && task.created_by === currentUserId;

  const isSelfAssigned =
    !!task &&
    task.created_by &&
    task.assigned_to &&
    task.created_by === task.assigned_to;

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

      const { task: taskData, files, assigned_by_name } = await res.json();
      setTask(taskData);
      setTaskFiles(files ?? []);
      setAssignedByName(assigned_by_name || "—");
      setLoading(false);
    };

    fetchTask();
  }, [taskId]);

  
  // ── Check for an existing pending extension request, refreshed on focus ─────
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

  // ── Ask to Review — moves the task into the in_review queue directly ────────
  // Distinct from "Review or Complete" (which only shows for tasks the
  // employee created themselves and routes to a separate completion flow).
  // This button is available on ANY task assigned to the employee, so it's
  // placed under Extend Deadline rather than gated by isOwnTask.
  const handleAskToReview = async () => {
    if (!task) return;

    try {
      setAskingReview(true);

      const res = await authFetch(`/tasks/${task.id}/ask-review`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to request review");

      setTask((prev: any) => ({ ...prev, status: "in_review" }));
      showToast("Task sent for review!", "success");
    } catch (error: any) {
      showToast(error?.message || "Failed to request review", "error");
    } finally {
      setAskingReview(false);
    }
  };

  // ── Delete task ───────────────────────────────────────────────────────────────
  const handleDeleteTask = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteTask = async () => {
    if (!task) return;

    // Defense in depth — never rely solely on the icon being hidden.
    // Employees may only delete tasks they created themselves.
    if (!isOwnTask) {
      setDeleteConfirmVisible(false);
      showToast("You can only delete tasks you created.", "error");
      return;
    }

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
        <ActivityIndicator size="large" color={colors.brand.accent} />
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            marginTop: 12,
          }}
        >
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

 // ── Derived display status — "overdue" isn't a real DB value, it's a
  // pending task whose deadline has passed (same rule the dashboard uses
  // to bucket it). We only relabel for display; task.status itself stays
  // "pending" in the DB and in all the disabled/button logic below. ──
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const isOverdue =
    task.status === "pending" &&
    !!task.deadline &&
    task.deadline.slice(0, 10) < todayDateStr;

  const displayStatus = isOverdue ? "overdue" : (task.status ?? "pending");
  const statusColor = statusColorMap[displayStatus] ?? colors.text.secondary;

  // Edit/delete icons should only show for tasks the employee created AND
  // that aren't completed yet.
  const canEditOrDelete = isOwnTask && task.status !== "completed";

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
          {/* Task Title + Edit/Delete icons ---- */}
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
                      pathname: "/(task)/newtaskemp",
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
              {displayStatus}
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
            {task.description?.trim().replace(/\n{3,}/g, "\n\n") ||
              "No description provided."}
          </Text>

          {/* Deadline */}
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

          {/* Assigned By */}
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
              Assigned By:{" "}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                ...typography.body,
                color: colors.text.secondary,
                flex: 1,
              }}
            >
              {isSelfAssigned ? "You (self-created)" : assignedByName}
            </Text>
          </View>

          {/* Self-created task notice */}
          {isSelfAssigned && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: colors.base.surfaceL2,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.base.border,
                padding: 10,
                marginBottom: 20,
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={16}
                color={colors.brand.accent}
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  ...typography.label,
                  color: colors.text.secondary,
                  flex: 1,
                }}
              >
                This task was created by the employee for themselves.
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

          {/* Submit Task Button — only for tasks the employee created themselves */}
          {isOwnTask && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(task)/complete",
                  params: { taskId: task.id },
                })
              }
              disabled={
                task.status === "completed" || task.status === "inReview"
              }
              style={{
                backgroundColor:
                  task.status === "completed" || task.status === "inReview"
                    ? colors.base.border
                    : colors.brand.accent,
                height: moderateScale(50),
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
          )}

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

          {/* Ask to Review Button — new: moves task into the review queue and
              notifies both the assignee and the creator */}
          {!isSelfAssigned && (
            <TouchableOpacity
              disabled={
                askingReview ||
                task.status === "completed" ||
                task.status === "in_review"
              }
              onPress={handleAskToReview}
              style={{
                height: 50,
                borderRadius: 12,
                backgroundColor:
                  task.status === "completed" || task.status === "in_review"
                    ? colors.base.border
                    : colors.brand.accent,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                opacity: askingReview ? 0.7 : 1,
              }}
            >
              {askingReview ? (
                <ActivityIndicator color={colors.base.surfaceL1} />
              ) : (
                <Text
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={{
                    ...typography.subheading,
                    color: colors.brand.onPrimary,
                  }}
                >
                  {task.status === "completed"
                    ? "Already Completed"
                    : task.status === "in_review"
                      ? "Under Review"
                      : "Ask to Review"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

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