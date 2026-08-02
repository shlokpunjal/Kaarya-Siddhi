import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "../utils/authFetch";
import { toLocalDateString } from "../utils/dateFormat";
import { createNotification } from "../lib/notify";
import { sendLocalNotification } from "../utils/notifications";
import { useToast } from "../context/ToastContext";
import { useEmployeeAutocomplete } from "./useEmployeeAutocomplete";
import { useFileAttachments } from "./useFileAttachments";
import { useTaskDelete } from "./useTaskDelete";

export type Priority = "low" | "medium" | "high";

/**
 * Everything the New/Edit Task screen needs: field state, employee
 * autocomplete, file attachments, loading the existing task in edit
 * mode, submitting (create or update), and deleting.
 */
export function useTaskForm(taskId: string | undefined) {
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
  const fileAttachments = useFileAttachments();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;

      const employees = await employeeAutocomplete.loadEmployees();

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

    if (data.assigned_to) {
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
      file_type: res.file_type,
      storage_service: "cloudinary",
    }));
    const filesRes = await authFetch("/task-files", {
      method: "POST",
      body: JSON.stringify(filesPayload),
    });
    if (!filesRes.ok) throw new Error("Could not attach files.");
  };

  const submit = async () => {
    if (!taskName.trim()) {
      showToast("Please enter a task name", "warning");
      return;
    }
    if (!employeeAutocomplete.selectedEmployeeId) {
      showToast("Please select a valid employee from the list", "warning");
      return;
    }

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

      const payload = {
        title: taskName,
        assigned_to: employeeAutocomplete.selectedEmployeeId,
        deadline: deadlineDate ? toLocalDateString(deadlineDate) : null,
        description: description || null,
        priority: selectedPriority ?? "medium",
      };

      if (isEditMode) {
        const updateRes = await authFetch(`/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            ...(mainFileUrl ? { attachment_url: mainFileUrl } : {}),
          }),
        });
        if (!updateRes.ok) throw new Error("Could not update task.");

        await attachUploadedFiles(taskId!, uploadedResults);

        showToast("Task updated successfully", "success");
        setTimeout(() => router.back(), 900);
      } else {
        const createRes = await authFetch("/tasks/assign", {
          method: "POST",
          body: JSON.stringify({ ...payload, attachment_url: mainFileUrl }),
        });
        if (!createRes.ok) throw new Error("Could not create task.");
        const task = await createRes.json();

        await attachUploadedFiles(task.id, uploadedResults);

        // The task itself is already created at this point — notification
        // delivery is best-effort and must never surface as a failure for
        // an action that already succeeded.
        createNotification({
          userId: employeeAutocomplete.selectedEmployeeId,
          type: "task_assigned",
          message: `You've been assigned a new task: "${taskName}".`,
          taskId: task.id,
        }).catch((err) => console.log("Notification creation failed:", err));

        sendLocalNotification(
          "Task Created",
          `"${taskName}" has been assigned.`,
        ).catch((err) => console.log("Local notification failed:", err));

        showToast("Task created successfully", "success");
        setTimeout(() => router.back(), 900);
      }
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
    fileAttachments,
    submit,
    taskDelete,
  };
}