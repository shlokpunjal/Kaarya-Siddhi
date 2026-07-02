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
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage"; // add this import

const { colors } = lightTheme;

type Priority = "low" | "medium" | "high";

const PRIORITIES: { label: string; value: Priority; color: string; bg: string }[] = [
  { label: "Low", value: "low", color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Medium", value: "medium", color: "#E65100", bg: "#FFF3E0" },
  { label: "High", value: "high", color: "#B71C1C", bg: "#FFEBEE" },
];

export default function Newtask() {
  const router = useRouter();

  const [taskName, setTaskName] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Pick files from device ──────────────────────────────────────────────────
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

  // ── Upload single file to Cloudinary ───────────────────────────────────────
  // Cloudinary stores the actual file → returns a secure_url
  // Only that URL is saved in Supabase (tasks.attachment_url & task_files.file_url)
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
    if (!assignTo.trim()) {
      alert("Please enter who to assign to");
      return;
    }

    try {
      setLoading(true);

      const creatorEmail = await AsyncStorage.getItem("userEmail");

      // 1. Look up the assignee by name, restricted to employees only
      const { data: matches, error: userLookupError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("name", assignTo.trim())
        .eq("role", "employee");

      if (userLookupError) throw userLookupError;

      if (!matches || matches.length === 0) {
        alert(`No employee named "${assignTo.trim()}" was found. Please check the name.`);
        return;
      }

      if (matches.length > 1) {
        const list = matches.map((u) => `• ${u.name} — ${u.email}`).join("\n");
        alert(
          `Multiple employees are named "${assignTo.trim()}":\n\n${list}\n\nPlease re-enter using their email instead so the right person gets the task.`
        );
        return;
      }

      const assignedEmployee = matches[0]; // exactly one match

      // 2. Upload all files to Cloudinary in parallel
      const uploadedResults = await Promise.all(
        attachedFiles.map((file) => uploadSingleFile(file))
      );

      const mainFileUrl = uploadedResults.length > 0 ? uploadedResults[0].file_url : null;

      // 3. Insert task row — assigned_to stores the resolved email, created_by is the logged-in user
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskName,
          assigned_to: assignedEmployee.email,
          deadline: deadline || null,
          description: description || null,
          attachment_url: mainFileUrl,
          status: "pending",
          priority: selectedPriority ?? "medium",
          created_by: creatorEmail,
          workspace_id: "44799b6c-50a1-42c1-9783-4105bc16a330",
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 4. Insert one row per file into task_files
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
  // ── Shared input style ──────────────────────────────────────────────────────
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
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={28}
          color={colors.base.surfaceL1}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.base.surfaceL1,
            flex: 1,
            textAlign: "center",
            marginRight: 28,
          }}
        >
          Task Assignment
        </Text>
      </View>

      {/* Scrollable Form */}
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 16,
            marginTop: 30,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
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
          {/* Task Name */}
          <TextInput
            placeholder="Task Name"
            placeholderTextColor={colors.text.secondary}
            value={taskName}
            onChangeText={setTaskName}
            style={inputStyle}
          />

          {/* Assign To */}
          <TextInput
            placeholder="Assign to (employee's name)"
            placeholderTextColor={colors.text.secondary}
            value={assignTo}
            onChangeText={setAssignTo}
            style={[inputStyle, { marginTop: 14 }]}
          />

          {/* Deadline */}
          <TextInput
            placeholder="Deadline (e.g. 2025-12-31)"
            placeholderTextColor={colors.text.secondary}
            value={deadline}
            onChangeText={setDeadline}
            style={[inputStyle, { marginTop: 14 }]}
          />

          {/* Priority Selector */}
          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
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
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? p.color : colors.base.border,
                      backgroundColor: isSelected ? p.bg : colors.base.surfaceL2,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isSelected ? p.color : colors.text.secondary,
                      }}
                    />
                    <Text
                      style={{
                        ...typography.body,
                        fontSize: 14,
                        fontWeight: isSelected ? "600" : "400",
                        color: isSelected ? p.color : colors.text.secondary,
                      }}
                    >
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

          {/* File Picker Button */}
          <TouchableOpacity
            onPress={pickFile}
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 14,
              height: 50,
              borderRadius: 15,
              borderColor: colors.base.border,
              borderWidth: 1,
              paddingLeft: 15,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="attach" size={22} color={colors.text.secondary} />
            <Text style={{ ...typography.body, color: colors.text.secondary }}>
              {attachedFiles.length > 0
                ? `${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached — tap to add more`
                : "Add files"}
            </Text>
          </TouchableOpacity>

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <View style={{ marginTop: 10, gap: 8 }}>
              {attachedFiles.map((file) => (
                <View
                  key={file.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.base.surfaceL2,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.base.border,
                    padding: 10,
                    gap: 10,
                  }}
                >
                  <Ionicons name="document-outline" size={20} color={colors.brand.accent} />
                  <Text
                    style={{ ...typography.body, color: colors.text.primary, flex: 1 }}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(file.name)}>
                    <Ionicons name="close-circle" size={20} color={colors.status.overdue} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleAddTask}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.base.border : colors.brand.accent,
              height: 54,
              borderRadius: 14,
              marginTop: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.base.surfaceL1} />
            ) : (
              <Text
                style={{
                  ...typography.subheading,
                  color: colors.base.surfaceL1,
                  fontSize: 18,
                }}
              >
                Add task
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}