import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "../../utils/authFetch";
import { toLocalDateString } from "../../utils/dateFormat";
import { createNotification } from "../../lib/notify";
import { sendLocalNotification } from "../../utils/notifications";
import { useToast } from "../../context/ToastContext";
import { useEmployeeAutocomplete } from "./useEmployeeAutocomplete";
import { useTeamAssignees } from "./useTeamAssignees";
import { useFileAttachments } from "./useFileAttachments";
import { useTaskDelete } from "./useTaskDelete";

export type Priority = "low" | "medium" | "high";

export type TaskFormMode = "assign" | "self";

/** "person" assigns to one employee (existing behavior). "team" assigns
 *  the same task to several employees at once — see submit() below for
 *  how that's reconciled with the single-assignee backend. Only relevant
 *  in assign mode, and only when creating a new task (an existing task
 *  always has exactly one assignee). */
export type AssignMode = "person" | "team";

/**
 * Correlation id shared across every task created in one "Team" submit —
 * lets the backend resolve "who else is on this task" later (see
 * GET /tasks/:id/detail). Just needs to be unique per submit, not
 * cryptographically strong, so a timestamp + random suffix is enough —
 * no uuid library dependency required.
 */
function generateTeamBatchId(): string {
  return `team_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Everything the New/Edit Task screen needs: field state, employee
 * autocomplete (assign mode only), file attachments, loading the existing
 * task in edit mode, submitting (create or update), and deleting.
 *
 * `mode="assign"` — admin assigning to an employee (posts /tasks/assign,
 * requires an employee to be selected, fires a task_assigned notification).
 * `mode="self"` — employee creating their own task (posts /tasks/self, no
 * employee picker, no notification).
 */
export function useTaskForm(taskId: string | undefined, mode: TaskFormMode) {
  const isAssignMode = mode === "assign";
  const router = useRouter();
  const { showToast } = useToast();
  const isEditMode = !!taskId;

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Wait for both the employee directory AND the existing task before
  // rendering the form in edit mode — we need employeesList populated to
  // resolve and display the assignee's name in the autocomplete field.
  const [fetchingTask, setFetchingTask] = useState(isEditMode);

  const employeeAutocomplete = useEmployeeAutocomplete();
  const [assignMode, setAssignMode] = useState<AssignMode>("person");
  const teamAssignees = useTeamAssignees(employeeAutocomplete.employeesList);
  const fileAttachments = useFileAttachments();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;

      const employees = isAssignMode
        ? await employeeAutocomplete.loadEmployees()
        : [];

      if (isEditMode && taskId) {
        await fetchTaskForEdit(taskId, employees);
      }
    } catch (err: any) {
      console.error("Error initializing admin/employee data:", err.message);
    } finally {
      if (isEditMode) setFetchingTask(false);
    }
  };

  const fetchTaskForEdit = async (id: string, employees: any[]) => {
    const res = await authFetch(`/tasks/${id}`);
    const data = res.ok ? await res.json() : null;

    if (!res.ok || !data) {
      console.error("Failed to load task for editing:", res.status);
      showToast("Could not load this task.", "error");
      return;
    }

    setTaskName(data.title ?? "");
    setDescription(data.description ?? "");
    setDeadlineDate(data.deadline ? new Date(data.deadline) : null);
    setSelectedPriority((data.priority as Priority) ?? null);

    if (isAssignMode && data.assigned_to) {
      employeeAutocomplete.presetFromId(data.assigned_to, employees);
    }
  };

  const onChangeDate = (event: any, selected?: Date) => {
    // On Android the picker closes itself; on iOS keep it open until the
    // user taps away.
    setShowDatePicker(Platform.OS === "ios");
    if (selected) setDeadlineDate(selected);
  };

  const attachUploadedFiles = async (
    taskIdForFiles: string,
    uploadedResults: Awaited<ReturnType<typeof fileAttachments.uploadAll>>,
  ) => {
    if (uploadedResults.length === 0) return;
    const filesPayload = uploadedResults.map((res) => ({
      task_id: taskIdForFiles,
      file_url: res.file_url,
      file_name: res.file_name,
      // file_type: res.file_type,
      // storage_service: "cloudinary",
    }));
    const filesRes = await authFetch("/task-files", {
      method: "POST",
      body: JSON.stringify(filesPayload),
    });
    if (!filesRes.ok) throw new Error("Could not attach files.");
  };

  // Team mode only ever applies when creating a brand-new assigned task —
  // an existing task already has exactly one assignee, so edit mode always
  // behaves like "person" regardless of the toggle's state.
  const isTeamCreate = isAssignMode && !isEditMode && assignMode === "team";

  const submit = async () => {
    if (!taskName.trim()) {
      showToast("Please enter a task name", "warning");
      return;
    }
    if (isTeamCreate) {
      if (teamAssignees.selected.length === 0) {
        showToast("Please add at least one employee to the team", "warning");
        return;
      }
    } else if (isAssignMode && !employeeAutocomplete.selectedEmployeeId) {
      showToast("Please select a valid employee from the list", "warning");
      return;
    }
    // Captured once, right after the null-check above — narrows the type
    // to `string` for the rest of this function. Re-reading
    // employeeAutocomplete.selectedEmployeeId later loses that narrowing
    // since it's hook state, not a local const.
    const assignedEmployeeId = employeeAutocomplete.selectedEmployeeId;

    try {
      setLoading(true);

      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        showToast("Your session has expired. Please log back in.", "error");
        return;
      }

      const uploadedResults = await fileAttachments.uploadAll();
      const mainFileUrl =
        uploadedResults.length > 0 ? uploadedResults[0].file_url : null;

      const basePayload = {
        title: taskName,
        deadline: deadlineDate ? toLocalDateString(deadlineDate) : null,
        description: description || null,
        priority: selectedPriority ?? "medium",
      };

      if (isEditMode) {
        const updateRes = await authFetch(`/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...basePayload,
            ...(isAssignMode ? { assigned_to: assignedEmployeeId } : {}),
            ...(mainFileUrl ? { attachment_url: mainFileUrl } : {}),
          }),
        });
        if (!updateRes.ok) throw new Error("Could not update task.");

        await attachUploadedFiles(taskId!, uploadedResults);

        showToast("Task updated successfully", "success");
        setTimeout(() => router.back(), 900);
        return;
      }

      if (isTeamCreate) {
        // The backend has no multi-assignee concept (`tasks.assigned_to`
        // is a single column), so "team" is a client-side convenience:
        // it fans out into one identical task per selected employee, all
        // tagged with the same team_batch_id so the detail screen can
        // later resolve and show teammates.
        const teamBatchId = generateTeamBatchId();
        const results = await Promise.allSettled(
          teamAssignees.selected.map(async (emp) => {
            const createRes = await authFetch("/tasks/assign", {
              method: "POST",
              body: JSON.stringify({
                ...basePayload,
                assigned_to: emp.id,
                attachment_url: mainFileUrl,
                team_batch_id: teamBatchId,
              }),
            });
             if (!createRes.ok) {
              const errBody = await createRes.text().catch(() => "");
              console.error(`Assign failed for ${emp.name} (${emp.id}):`, createRes.status, errBody);
              throw new Error(`Failed for ${emp.name}`);
            }
                  const task = await createRes.json();

            await attachUploadedFiles(task.id, uploadedResults);

            createNotification({
              userId: emp.id,
              type: "task_assigned",
              message: `You've been assigned a new task: "${taskName}".`,
              taskId: task.id,
            }).catch((err) =>
              console.log("Notification creation failed:", err),
            );

            return task;
          }),
        );

        const succeeded = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failed = results.length - succeeded;

        if (succeeded > 0) {
          sendLocalNotification(
            "Task Created",
            `"${taskName}" assigned to ${succeeded} employee${succeeded > 1 ? "s" : ""}.`,
          ).catch((err) => console.log("Local notification failed:", err));
        }

        if (failed > 0) {
          showToast(
            succeeded > 0
              ? `Assigned to ${succeeded}, but ${failed} failed.`
              : "Could not assign the task to any employee.",
            failed === results.length ? "error" : "warning",
          );
        } else {
          showToast("Task created successfully", "success");
        }

        if (succeeded > 0) setTimeout(() => router.back(), 900);
        return;
      }

      // Single person (or self) create — original behavior.
      const createRes = await authFetch(
        isAssignMode ? "/tasks/assign" : "/tasks/self",
        {
          method: "POST",
          body: JSON.stringify({
            ...basePayload,
            ...(isAssignMode ? { assigned_to: assignedEmployeeId } : {}),
            attachment_url: mainFileUrl,
          }),
        },
      );
      if (!createRes.ok) throw new Error("Could not create task.");
      const task = await createRes.json();

      await attachUploadedFiles(task.id, uploadedResults);

      // Assign mode only — the task itself is already created at this
      // point, so notification delivery is best-effort and must never
      // surface as a failure for an action that already succeeded.
      if (isAssignMode && assignedEmployeeId) {
        createNotification({
          userId: assignedEmployeeId,
          type: "task_assigned",
          message: `You've been assigned a new task: "${taskName}".`,
          taskId: task.id,
        }).catch((err) => console.log("Notification creation failed:", err));

        sendLocalNotification(
          "Task Created",
          `"${taskName}" has been assigned.`,
        ).catch((err) => console.log("Local notification failed:", err));
      }

      showToast("Task created successfully", "success");
      setTimeout(() => router.back(), 900);
    } catch (error: any) {
      console.error("Full error:", error);
      showToast(error?.message || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const taskDelete = useTaskDelete(taskId, () => router.back());

  return {
    isEditMode,
    fetchingTask,
    loading,
    taskName,
    setTaskName,
    description,
    setDescription,
    deadlineDate,
    setDeadlineDate,
    showDatePicker,
    setShowDatePicker,
    onChangeDate,
    selectedPriority,
    setSelectedPriority,
    employeeAutocomplete,
    assignMode,
    setAssignMode,
    teamAssignees,
    fileAttachments,
    submit,
    taskDelete,
  };
}