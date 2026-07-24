import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import * as DocumentPicker from "expo-document-picker";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNotification } from "../../lib/notify";
import { sendLocalNotification } from "../../utils/notifications";
import { wp, hp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { AlertModal } from "../../components/AlertModal";
import { toLocalDateString } from "../../utils/dateFormat";
import { authFetch } from "../../utils/authFetch";
type Priority = "low" | "medium" | "high";

type EmployeeProfile = {
  id: string;
  name: string;
};

const PRIORITIES: { label: string; value: Priority; color: string; bg: string }[] = [
  { label: "Low", value: "low", color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Medium", value: "medium", color: "#E65100", bg: "#FFF3E0" },
  { label: "High", value: "high", color: "#B71C1C", bg: "#FFEBEE" },
];

export default function Newtask() {
  const { colors } = useTheme();
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const isEditMode = !!taskId;
  const { showToast } = useToast();

  const [taskName, setTaskName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Employee autocomplete
  const [assignToName, setAssignToName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeesList, setEmployeesList] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Deadline — calendar picker. Always editable here (admin-only screen),
  // in both create and edit mode.
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [description, setDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // ── If editing, wait for both the employee directory AND the existing
  // task to load, since we need employeesList populated to resolve and
  // display the assigned employee's name in the autocomplete field. ──
  const [fetchingTask, setFetchingTask] = useState(isEditMode);

  useEffect(() => {
    initAdminAndEmployees();
  }, []);

  const initAdminAndEmployees = async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;

      const employees = await fetchEmployeeProfiles();

      // ── Edit mode: load the existing task now that we have the employee
      // directory to resolve the assignee's display name from. ──
      if (isEditMode && taskId) {
        await fetchTaskForEdit(taskId, employees);
      }
    } catch (err: any) {
      console.error("Error initializing admin/employee data:", err.message);
    } finally {
      if (isEditMode) setFetchingTask(false);
    }
  };

  const fetchEmployeeProfiles = async () => {
    const res = await authFetch("/employees-directory");
    if (!res.ok) return [];
    const data = await res.json();
    setEmployeesList(data);
    return data;
  };

  // ── Load an existing task's fields for editing ──────────────────────────────
  const fetchTaskForEdit = async (id: string, employees: EmployeeProfile[]) => {
    const res = await authFetch(`/tasks/${id}`);
    const data = res.ok ? await res.json() : null;
    const error = res.ok ? null : { message: `HTTP ${res.status}` };

    if (error || !data) {
      console.error("Failed to load task for editing:", error?.message);
      showToast("Could not load this task.", "error");
      return;
    }

    setTaskName(data.title ?? "");
    setDescription(data.description ?? "");
    setDeadlineDate(data.deadline ? new Date(data.deadline) : null);
    setSelectedPriority((data.priority as Priority) ?? null);

    if (data.assigned_to) {
      setSelectedEmployeeId(data.assigned_to);
      const matched = employees.find((e) => e.id === data.assigned_to);
      setAssignToName(matched?.name ?? "");
    }
  };

  const handleSearchEmployee = (text: string) => {
    setAssignToName(text);
    setSelectedEmployeeId(null);
    if (text.trim() === "") {
      setFilteredEmployees([]);
      setShowDropdown(false);
    } else {
      const sorted = employeesList.filter((emp) =>
        emp.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredEmployees(sorted);
      setShowDropdown(true);
    }
  };

  const selectEmployee = (emp: EmployeeProfile) => {
    setAssignToName(emp.name);
    setSelectedEmployeeId(emp.id);
    setShowDropdown(false);
  };

  const onChangeDate = (event: any, selected?: Date) => {
    // On Android the picker closes itself; on iOS keep it open until user taps away
    setShowDatePicker(Platform.OS === "ios");
    if (selected) setDeadlineDate(selected);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled) {
      setAttachedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = result.assets.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
    }
  };

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const uploadSingleFile = async (file: any) => {
    const secureUrl = await uploadToCloudinary(
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      },
      { folder: "task_attachments", resourceType: "auto" },
    );
    return {
      file_url: secureUrl,
      file_name: file.name,
      file_type: file.name.split(".").pop()?.toLowerCase() ?? "file",
    };
  };

  // ── Create OR update depending on mode ──────────────────────────────────────
  const handleAddTask = async () => {
    if (!taskName.trim()) {
      showToast("Please enter a task name", "warning");
      return;
    }
    if (!selectedEmployeeId) {
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
      const uploadedResults = await Promise.all(
        attachedFiles.map((file) => uploadSingleFile(file))
      );
      const mainFileUrl = uploadedResults.length > 0 ? uploadedResults[0].file_url : null;

      if (isEditMode) {
        const updateRes = await authFetch(`/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: taskName,
            assigned_to: selectedEmployeeId,
            deadline: deadlineDate ? toLocalDateString(deadlineDate) : null,
            description: description || null,
            ...(mainFileUrl ? { attachment_url: mainFileUrl } : {}),
            priority: selectedPriority ?? "medium",
          }),
        });
        if (!updateRes.ok) throw new Error("Could not update task.");

        if (uploadedResults.length > 0) {
          const filesPayload = uploadedResults.map((res) => ({
            task_id: taskId,
            file_url: res.file_url,
            file_name: res.file_name,
            file_type: res.file_type,
            storage_service: "cloudinary",
          }));
          const filesRes = await authFetch("/task-files", { method: "POST", body: JSON.stringify(filesPayload) });
          if (!filesRes.ok) throw new Error("Could not attach files.");
        }

        showToast("Task updated successfully", "success");
        setTimeout(() => router.back(), 900);
      } else {
        const createRes = await authFetch("/tasks/assign", {
          method: "POST",
          body: JSON.stringify({
            title: taskName,
            assigned_to: selectedEmployeeId,
            deadline: deadlineDate ? toLocalDateString(deadlineDate) : null,
            description: description || null,
            attachment_url: mainFileUrl,
            priority: selectedPriority ?? "medium",
          }),
        });
        if (!createRes.ok) throw new Error("Could not create task.");
        const task = await createRes.json();

        if (uploadedResults.length > 0 && task) {
          const filesPayload = uploadedResults.map((res) => ({
            task_id: task.id,
            file_url: res.file_url,
            file_name: res.file_name,
            file_type: res.file_type,
            storage_service: "cloudinary",
          }));
          const filesRes = await authFetch("/task-files", { method: "POST", body: JSON.stringify(filesPayload) });
          if (!filesRes.ok) throw new Error("Could not attach files.");
        }

        await createNotification({
          userId: selectedEmployeeId,
          type: "task_assigned",
          message: `You've been assigned a new task: "${taskName}".`,
          taskId: task.id,
        });

        sendLocalNotification("Task Created", `"${taskName}" has been assigned.`).catch((err) =>
          console.log("Local notification failed:", err)
        );

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

  // ── Delete task (edit mode only) ────────────────────────────────────────────
  const handleDeleteTask = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskId) return;

    try {
      setDeleting(true);

      const res = await authFetch(`/tasks/${taskId}`, { method: "DELETE" });
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

  const inputStyle = {
    backgroundColor: colors.base.surfaceL2,
    marginTop: 14,
    height: moderateScale(50),
    borderRadius: 12,
    borderColor: colors.base.border,
    borderWidth: 1,
    paddingLeft: 15,
    color: colors.text.primary,
    ...typography.body,
  };

  if (fetchingTask) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand.accent} />
        <Text style={[typography.body, { marginTop: 10, color: colors.text.secondary }]}>Loading task...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.brand.primary,
        height: moderateScale(70),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
      }}>
        <Ionicons onPress={() => router.back()} name="arrow-back" size={moderateScale(28)} color={colors.brand.onPrimary} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, flex: 1, textAlign: "center" }}>
          {isEditMode ? "Edit Task" : "Task Assignment"}
        </Text>

        {/* Delete icon — only shown when editing an existing task */}
        {isEditMode ? (
          <TouchableOpacity onPress={handleDeleteTask} disabled={deleting || loading}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.brand.onPrimary} />
            ) : (
              <Ionicons name="trash-outline" size={moderateScale(22)} color={colors.brand.onPrimary} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: moderateScale(22) }} />
        )}
      </View>

       <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? moderateScale(70) : 0}
      >

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: wp(6.4), paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
        <View style={{
          backgroundColor: colors.base.surfaceL1,
          borderRadius: 16,
          marginTop: hp(3.7),
          borderWidth: 1,
          borderColor: colors.base.border,
          padding: wp(5.3),
          ...Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
            android: { elevation: 5 },
          }),
        }}>

          {/* Task Name */}
          <TextInput
            placeholder="Task Name"
            placeholderTextColor={colors.text.secondary}
            value={taskName}
            onChangeText={setTaskName}
            style={inputStyle}
          />

          {/* Assign To — autocomplete */}
          <View style={{ zIndex: 10 }}>
            <TextInput
              placeholder="Assign to (Type employee name...)"
              placeholderTextColor={colors.text.secondary}
              value={assignToName}
              onChangeText={handleSearchEmployee}
              style={[
                inputStyle,
                selectedEmployeeId ? { borderColor: colors.brand.accent, borderWidth: 1.5 } : {},
              ]}
            />
            {selectedEmployeeId && (
              <View style={{ position: "absolute", right: 12, top: 26 }}>
                <Ionicons name="checkmark-circle" size={22} color={colors.brand.accent} />
              </View>
            )}
            {showDropdown && filteredEmployees.length > 0 && (
              <View style={{
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 12,
                marginTop: 4,
                maxHeight: moderateScale(180),
                overflow: "hidden",
              }}>
                {filteredEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    onPress={() => selectEmployee(emp)}
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.base.border,
                      backgroundColor: colors.base.surfaceL2,
                    }}
                  >
                    <Text style={{ ...typography.body, color: colors.text.primary }}>{emp.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── Deadline — calendar picker, always editable (admin screen) ── */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 6, paddingLeft: 4 }}>
              Deadline
            </Text>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                backgroundColor: colors.base.surfaceL2,
                height: moderateScale(50),
                borderRadius: 12,
                borderColor: deadlineDate ? colors.brand.accent : colors.base.border,
                borderWidth: deadlineDate ? 1.5 : 1,
                paddingHorizontal: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{
                ...typography.body,
                color: deadlineDate ? colors.text.primary : colors.text.secondary,
              }}>
                {deadlineDate
                  ? deadlineDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "Select deadline date"}
              </Text>
              <Ionicons
                name={deadlineDate ? "calendar" : "calendar-outline"}
                size={20}
                color={deadlineDate ? colors.brand.accent : colors.text.secondary}
              />
            </TouchableOpacity>

            {deadlineDate && (
              <TouchableOpacity
                onPress={() => setDeadlineDate(null)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingLeft: 4 }}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.text.secondary} />
                <Text style={{ ...typography.label, color: colors.text.secondary }}>Clear date</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={deadlineDate ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onChangeDate}
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          {/* Priority */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 8, paddingLeft: 4 }}>
              Priority
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {PRIORITIES.map((p) => {
                const isSelected = selectedPriority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setSelectedPriority(p.value)}
                    style={{
                      flex: 1, height: moderateScale(44), borderRadius: 12,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? p.color : colors.base.border,
                      backgroundColor: isSelected ? p.bg : colors.base.surfaceL2,
                      alignItems: "center", justifyContent: "center",
                      flexDirection: "row", gap: 6,
                    }}
                  >
                    <View style={{ width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4), backgroundColor: isSelected ? p.color : colors.text.secondary }} />
                    <Text style={{ ...typography.body, fontSize: moderateScale(14), fontWeight: isSelected ? "600" : "400", color: isSelected ? p.color : colors.text.secondary }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <TextInput
            placeholder="Add Description"
            placeholderTextColor={colors.text.secondary}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[inputStyle, { marginTop: 14, height: moderateScale(100), paddingTop: 12 }]}
          />

          {/* File Picker */}
          <TouchableOpacity
            onPress={pickFile}
            style={{
              backgroundColor: colors.base.surfaceL2, marginTop: 14, height: moderateScale(50),
              borderRadius: 15, borderColor: colors.base.border, borderWidth: 1,
              paddingLeft: 15, flexDirection: "row", alignItems: "center", gap: 10,
            }}
          >
            <Ionicons name="attach" size={22} color={colors.text.secondary} />
            <Text style={{ ...typography.body, color: colors.text.secondary }}>
              {attachedFiles.length > 0
                ? `${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached — tap to add more`
                : "Add files"}
            </Text>
          </TouchableOpacity>

          {attachedFiles.length > 0 && (
            <View style={{ marginTop: 10, gap: 8 }}>
              {attachedFiles.map((file) => (
                <View key={file.name} style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: colors.base.surfaceL2, borderRadius: 12,
                  borderWidth: 1, borderColor: colors.base.border, padding: 10, gap: 10,
                }}>
                  <Ionicons name="document-outline" size={20} color={colors.brand.accent} />
                  <Text style={{ ...typography.body, color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(file.name)}>
                    <Ionicons name="close-circle" size={20} color={colors.status.overdue} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleAddTask}
            disabled={loading || deleting}
            style={{
              backgroundColor: loading ? colors.base.border : colors.brand.accent,
              height: moderateScale(54), borderRadius: 14, marginTop: 24,
              alignItems: "center", justifyContent: "center",
            }}
          >
            {loading
              ? <ActivityIndicator color={colors.base.surfaceL1} />
              : <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, fontSize: moderateScale(18) }}>
                {isEditMode ? "Save Changes" : "Add task"}
              </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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