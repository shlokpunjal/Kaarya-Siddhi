import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { wp } from "../../utils/responsive";

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

type Props = {
  visible: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (file: PickedFile | null) => void;
};

/**
 * Shown when the employee taps "Ask to Review". File attachment is
 * optional — not every task has something to submit.
 */
export function AskReviewModal({ visible, submitting, onCancel, onSubmit }: Props) {
  const { colors } = useTheme();
  const [file, setFile] = useState<PickedFile | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  const handleSubmit = () => {
    onSubmit(file);
  };

  const handleCancel = () => {
    setFile(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
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
            You can attach a file to show your work — this is optional.
          </Text>

          {file ? (
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
              <Text
                style={{ ...typography.body, color: colors.text.primary, flex: 1 }}
                numberOfLines={1}
              >
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Ionicons name="close-circle" size={20} color={colors.status.overdue} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickFile}
              style={{
                backgroundColor: colors.base.surfaceL2,
                height: 50,
                borderRadius: 12,
                borderColor: colors.base.border,
                borderWidth: 1,
                paddingLeft: 15,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <Ionicons name="attach" size={22} color={colors.text.secondary} />
              <Text style={{ ...typography.body, color: colors.text.secondary }}>
                Attach a file (optional)
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={submitting}
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
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 10,
                backgroundColor: colors.brand.accent,
                justifyContent: "center",
                alignItems: "center",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.base.surfaceL1} />
              ) : (
                <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}