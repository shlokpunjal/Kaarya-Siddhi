import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { lightTheme, typography } from "../../theme/theme";
import * as DocumentPicker from "expo-document-picker";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@env";
import DateTimePicker from "@react-native-community/datetimepicker";

const { colors } = lightTheme;

type Priority = "low" | "medium" | "high";

type EmployeeProfile = {
  id: string;        // UUID from auth
  name: string;
  email:string;
};

const PRIORITIES: { label: string; value: Priority; color: string; bg: string }[] = [
  { label: "Low",    value: "low",    color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Medium", value: "medium", color: "#E65100", bg: "#FFF3E0" },
  { label: "High",   value: "high",   color: "#B71C1C", bg: "#FFEBEE" },
];

export default function Newtask() {
  const router = useRouter();

  const [taskName, setTaskName] = useState("");

  // Employee autocomplete
  const [assignToName, setAssignToName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeesList, setEmployeesList] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Deadline — calendar picker (replaces text input)
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [description, setDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeProfiles();
  }, []);

  const fetchEmployeeProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) setEmployeesList(data);
    } catch (err: any) {
      console.error("Error loading employee directory:", err.message);
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
    setSelectedEmployeeId(emp.id); // Securely set behind-the-scenes UI UUID tracking
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

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      alert("Please enter a task name");
      return;
    }
    if (!selectedEmployeeId) {
      alert("Please select a valid employee from the list");
      return;
    }

    try {
      setLoading(true);

      const { data: { user }, error: userSessionError } = await supabase.auth.getUser();
      if (userSessionError || !user) {
        alert("Your session has expired. Please log back in.");
        return;
      }

      const uploadedResults = await Promise.all(
        attachedFiles.map((file) => uploadSingleFile(file))
      );
      const mainFileUrl = uploadedResults.length > 0 ? uploadedResults[0].file_url : null;

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskName,
          assigned_to: selectedEmployeeId,
          // Store as ISO date string (YYYY-MM-DD) or null
          deadline: deadlineDate ? deadlineDate.toISOString().split("T")[0] : null,
          description: description || null,
          attachment_url: mainFileUrl,
          status: "pending",
          priority: selectedPriority ?? "medium",
          created_by: user.id,
          workspace_id: "44799b6c-50a1-42c1-9783-4105bc16a330",
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
    } catch (error: any) {
      console.error("Full error:", error);
      alert("Error: " + (error?.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
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
        <Ionicons onPress={() => router.back()} name="arrow-back" size={28} color={colors.base.surfaceL1} />
        <Text style={{ ...typography.heading, color: colors.base.surfaceL1, flex: 1, textAlign: "center", marginRight: 28 }}>
          Task Assignment
        </Text>
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
                maxHeight: 180,
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

          {/* ── Deadline — calendar picker ── */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 6, paddingLeft: 4 }}>
              Deadline
            </Text>

            {/* Trigger button — same look as the text inputs above */}
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

            {/* Clear button — only shown when a date is picked */}
            {deadlineDate && (
              <TouchableOpacity
                onPress={() => setDeadlineDate(null)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingLeft: 4 }}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.text.secondary} />
                <Text style={{ ...typography.label, color: colors.text.secondary }}>Clear date</Text>
              </TouchableOpacity>
            )}

            {/* The actual picker — shown inline on iOS, modal on Android */}
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
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.base.border : colors.brand.accent,
              height: 54, borderRadius: 14, marginTop: 24,
              alignItems: "center", justifyContent: "center",
            }}
          >
            {loading
              ? <ActivityIndicator color={colors.base.surfaceL1} />
              : <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, fontSize: 18 }}>Add task</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
