import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
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

  const [attachedFile, setAttachedFile] = useState<any>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setAttachedFile(result.assets[0]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 70,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            ...typography.heading,
            color: colors.base.surfaceL1,
          }}
        >
          Task Assignment
        </Text>
      </View>

      {/* Card */}
      <View
        style={{
          backgroundColor: colors.base.surfaceL1,
          height: 520,
          width: 300,
          boxShadow: "0px 0px 10px gray",
          margin: 42,
          marginTop: 60,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: colors.base.border,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextInput
            placeholder="Task Name"
            placeholderTextColor={colors.text.secondary}
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: colors.base.border,
              borderWidth: 1,
              paddingLeft: 15,
              color: colors.text.primary,
              ...typography.body,
            }}
          />

          <TextInput
            placeholder="Assign to"
            placeholderTextColor={colors.text.secondary}
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: colors.base.border,
              borderWidth: 1,
              paddingLeft: 15,
              color: colors.text.primary,
              ...typography.body,
            }}
          />

          <TextInput
            placeholder="Deadline"
            placeholderTextColor={colors.text.secondary}
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 20,
              height: 50,
              width: 250,
              borderRadius: 15,
              borderColor: colors.base.border,
              borderWidth: 1,
              paddingLeft: 15,
              color: colors.text.primary,
              ...typography.body,
            }}
          />

          <TextInput
            placeholder="Add Description"
            placeholderTextColor={colors.text.secondary}
            multiline
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 20,
              height: 100,
              width: 250,
              borderRadius: 15,
              borderColor: colors.base.border,
              borderWidth: 1,
              paddingLeft: 15,
              paddingTop: 12,
              color: colors.text.primary,
              ...typography.body,
            }}
          />

          {/* File Picker */}
          <TouchableOpacity
            onPress={pickFile}
            style={{
              backgroundColor: colors.base.surfaceL2,
              marginTop: 20,
              height: 50,
              width: 250,
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
              {attachedFile ? attachedFile.name : "Add file"}
            </Text>
          </TouchableOpacity>

          {/* Preview row — only shows after file is picked */}
          {attachedFile && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.base.surfaceL2,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.base.border,
                width: 250,
                padding: 10,
                marginTop: 8,
                gap: 10,
              }}
            >
              <Ionicons name="document" size={20} color={colors.brand.accent} />
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.primary,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {attachedFile.name}
              </Text>
              <TouchableOpacity onPress={() => setAttachedFile(null)}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.status.overdue}
                />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push("/taskadd")}
            style={{
              backgroundColor: colors.brand.accent,
              height: 60,
              width: 200,
              borderRadius: 20,
              margin: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                ...typography.subheading,
                color: colors.base.surfaceL1,
                fontSize: 24,
              }}
            >
              Add task
            </Text>
          </TouchableOpacity>
        </View>

        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={30}
          color={colors.base.surfaceL1}
          style={{
            margin: 20,
            marginTop: 120,
            marginLeft: -5,
            backgroundColor: colors.brand.primary,
            borderRadius: 20,
            width: 40,
            alignItems: "center",
            textAlign: "center",
          }}
        />
      </View>
    </SafeAreaView>
  );
}
