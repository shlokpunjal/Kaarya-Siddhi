import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import * as DocumentPicker from "expo-document-picker";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Priority = "low" | "medium" | "high";

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

  const [taskName, setTaskName] = useState("");

  // Deadline — calendar picker (replaces text input)
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [description, setDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── If editing, load the existing task ──────────────────────────────────────
  const [fetchingTask, setFetchingTask] = useState(isEditMode);

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      setFetchingTask(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error || !data) {
        console.error("Failed to load task for editing:", error?.message);
        Alert.alert("Error", "Could not load this task.");
        setFetchingTask(false);
        return;
      }

      setTaskName(data.title ?? "");
      setDescription(data.description ?? "");
      setDeadlineDate(data.deadline ? new Date(data.deadline) : null);
      setSelectedPriority((data.priority as Priority) ?? null);
      setFetchingTask(false);
    };

    fetchTask();
  }, [taskId]);

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
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    } as any);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: "POST", body: formData }
    );
    const data = await response.json();
    if (!data.secure_url) {
      throw new Error(`Cloudinary upload failed: ${data.error?.message ?? "unknown error"}`);
    }
    return {
      file_url: data.secure_url,
      file_name: file.name,
      file_type: file.name.split(".").pop()?.toLowerCase() ?? "file",
    };
  };

  // ── Create OR update depending on mode ──────────────────────────────────────
  const handleAddTask = async () => {
    if (!taskName.trim()) {
      alert("Please enter a task name");
      return;
    }

    try {
      setLoading(true);

      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        alert("Your session has expired. Please log back in.");
        return;
      }

      const { data: currentUser, error: userLookupError } = await supabase
        .from("users")
        .select("id, workspace_id")
        .eq("email", email)
        .single();

      if (userLookupError || !currentUser || !currentUser.workspace_id) {
        alert("Could not find your workspace. Please log back in.");
        return;
      }

      const uploadedResults = await Promise.all(
        attachedFiles.map((file) => uploadSingleFile(file))
      );
      const mainFileUrl = uploadedResults.length > 0 ? uploadedResults[0].file_url : null;

      if (isEditMode) {
        // ── Update existing task ──
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            title: taskName,
            deadline: deadlineDate ? deadlineDate.toISOString().split("T")[0] : null,
            description: description || null,
            ...(mainFileUrl ? { attachment_url: mainFileUrl } : {}),
            priority: selectedPriority ?? "medium",
          })
          .eq("id", taskId);

        if (updateError) throw updateError;

        if (uploadedResults.length > 0) {
          const filesPayload = uploadedResults.map((res) => ({
            task_id: taskId,
            file_url: res.file_url,
            file_name: res.file_name,
            file_type: res.file_type,
            storage_service: "cloudinary",
          }));
          const { error: fileError } = await supabase.from("task_files").insert(filesPayload);
          if (fileError) throw fileError;
        }

        alert("Task updated successfully");
        router.back();
      } else {
        // ── Create new task ──
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            title: taskName,
            assigned_to: currentUser.id, // self-assigned
            deadline: deadlineDate ? deadlineDate.toISOString().split("T")[0] : null,
            description: description || null,
            attachment_url: mainFileUrl,
            status: "pending",
            priority: selectedPriority ?? "medium",
            created_by: currentUser.id,
            workspace_id: currentUser.workspace_id,
          })
          .select()
          .single();

        if (taskError) throw taskError;

        if (uploadedResults.length > 0 && task) {
          const filesPayload = uploadedResults.map((res) => ({
            task_id: task.id,
            file_url: res.file_url,
            file_name: res.file_name,
            file_type: res.file_type,
            storage_service: "cloudinary",
          }));
          const { error: fileError } = await supabase.from("task_files").insert(filesPayload);
          if (fileError) throw fileError;
        }

        alert("Task created successfully");
        router.back();
      }
    } catch (error: any) {
      console.error("Full error:", error);
      alert("Error: " + (error?.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  // ── Delete task (edit mode only) ────────────────────────────────────────────
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
    if (!taskId) return;

    try {
      setDeleting(true);

      // Remove dependent rows first in case the DB doesn't have ON DELETE CASCADE set up
      await supabase.from("task_files").delete().eq("task_id", taskId);
      await supabase.from("task_submissions").delete().eq("task_id", taskId);
      await supabase.from("extension_requests").delete().eq("task_id", taskId);

      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;

      Alert.alert("Deleted", "Task has been deleted.");
      router.back();
    } catch (error: any) {
      Alert.alert("Delete failed", error?.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.base.surfaceL2,
    marginTop: 14,
    height: 50,
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
        height: 70,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
      }}>
        <Ionicons onPress={() => router.back()} name="arrow-back" size={28} color={colors.brand.onPrimary} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, flex: 1, textAlign: "center" }}>
          {isEditMode ? "Edit Task" : "New Task"}
        </Text>

        {/* Delete icon — only shown when editing an existing task */}
        {isEditMode ? (
          <TouchableOpacity onPress={handleDeleteTask} disabled={deleting || loading}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.brand.onPrimary} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={colors.brand.onPrimary} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: colors.base.surfaceL1,
          borderRadius: 16,
          marginTop: 30,
          borderWidth: 1,
          borderColor: colors.base.border,
          padding: 20,
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

          {/* ── Deadline — calendar picker ── */}
          {/* ── Deadline — calendar picker (view-only when editing) ── */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 6, paddingLeft: 4 }}>
              Deadline
            </Text>

            {isEditMode ? (
              // Read-only display — deadline cannot be changed once a task exists
              <View
                style={{
                  backgroundColor: colors.base.surfaceL2,
                  height: 50,
                  borderRadius: 12,
                  borderColor: colors.base.border,
                  borderWidth: 1,
                  paddingHorizontal: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: 0.7,
                }}
              >
                <Text style={{ ...typography.body, color: colors.text.secondary }}>
                  {deadlineDate
                    ? deadlineDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "No deadline set"}
                </Text>
                <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: colors.base.surfaceL2,
                    height: 50,
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
              </>
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
                      flex: 1, height: 44, borderRadius: 12,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? p.color : colors.base.border,
                      backgroundColor: isSelected ? p.bg : colors.base.surfaceL2,
                      alignItems: "center", justifyContent: "center",
                      flexDirection: "row", gap: 6,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isSelected ? p.color : colors.text.secondary }} />
                    <Text style={{ ...typography.body, fontSize: 14, fontWeight: isSelected ? "600" : "400", color: isSelected ? p.color : colors.text.secondary }}>
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
            style={[inputStyle, { marginTop: 14, height: 100, paddingTop: 12 }]}
          />

          {/* File Picker */}
          <TouchableOpacity
            onPress={pickFile}
            style={{
              backgroundColor: colors.base.surfaceL2, marginTop: 14, height: 50,
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
              height: 54, borderRadius: 14, marginTop: 24,
              alignItems: "center", justifyContent: "center",
            }}
          >
            {loading
              ? <ActivityIndicator color={colors.base.surfaceL1} />
              : <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, fontSize: 18 }}>
                  {isEditMode ? "Save Changes" : "Add task"}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}