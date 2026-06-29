import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { lightTheme, typography } from "../../theme/theme";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";

const { colors } = lightTheme;

export default function Newtask() {
  const router = useRouter();
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true, // enable multi-select
    });

    if (!result.canceled) {
      // Merge new files, avoid duplicates by name
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
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
            marginRight: 28, // offset for back icon so title stays centered
          }}
        >
          Task Assignment
        </Text>
      </View>

      {/* Scrollable content — avoids fixed height breaking layout */}
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
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            // Cross-platform shadow
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
            style={inputStyle}
          />

          {/* Assign To */}
          <TextInput
            placeholder="Assign to"
            placeholderTextColor={colors.text.secondary}
            style={[inputStyle, { marginTop: 14 }]}
          />

          {/* Deadline */}
          <TextInput
            placeholder="Deadline"
            placeholderTextColor={colors.text.secondary}
            style={[inputStyle, { marginTop: 14 }]}
          />

          {/* Description */}
          <TextInput
            placeholder="Add Description"
            placeholderTextColor={colors.text.secondary}
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
                  <Ionicons
                    name="document-outline"
                    size={20}
                    color={colors.brand.accent}
                  />
                  <Text
                    style={{
                      ...typography.body,
                      color: colors.text.primary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(file.name)}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.status.overdue}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Task Button */}
          <TouchableOpacity
            onPress={() => router.push("/taskadd")}
            style={{
              backgroundColor: colors.brand.accent,
              height: 54,
              borderRadius: 14,
              marginTop: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                ...typography.subheading,
                color: colors.base.surfaceL1,
                fontSize: 18,
              }}
            >
              Add Task
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Shared input style
const inputStyle = {
  backgroundColor: lightTheme.colors.base.surfaceL2,
  height: 50,
  borderRadius: 15,
  borderColor: lightTheme.colors.base.border,
  borderWidth: 1,
  paddingLeft: 15,
  color: lightTheme.colors.text.primary,
  ...typography.body,
};
