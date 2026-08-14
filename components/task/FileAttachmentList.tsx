import { useState } from "react";
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { downloadAndShareFile } from "../../utils/downloadFile";

type TaskFile = {
  file_url?: string;
  file_name?: string;
};

type Props = {
  files: TaskFile[];
};

/**
 * "Files Provided (N)" section — identical between task-detail.tsx and
 * taskDetailAdmin.tsx. Tapping a row opens the Cloudinary URL; the
 * download icon saves/shares the file via the device's share sheet.
 */
export function FileAttachmentList({ files }: Props) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  const handleDownload = async (idx: number, file: TaskFile) => {
    if (!file.file_url || downloadingIdx !== null) return;
    try {
      setDownloadingIdx(idx);
      await downloadAndShareFile(file.file_url, file.file_name);
    } catch (err: any) {
      showToast(err?.message || "Failed to download file", "error");
    } finally {
      setDownloadingIdx(null);
    }
  };

  return (
    <View>
      <Text
        style={{
          ...typography.heading3,
          color: colors.text.primary,
          marginBottom: 10,
        }}
      >
        Files Provided ({files.length})
      </Text>

      {files.length === 0 ? (
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            marginBottom: 16,
          }}
        >
          No files provided.
        </Text>
      ) : (
        files.map((file, idx) => (
          <View
            key={idx}
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
            <TouchableOpacity
              onPress={() => file.file_url && Linking.openURL(file.file_url)}
              style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}
            >
              <Ionicons name="document" size={22} color={colors.brand.accent} />
              <Text
                numberOfLines={1}
                style={{ flex: 1, ...typography.body, color: colors.text.primary }}
              >
                {file.file_name ?? "Unnamed file"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDownload(idx, file)}
              disabled={downloadingIdx !== null}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {downloadingIdx === idx ? (
                <ActivityIndicator size="small" color={colors.brand.accent} />
              ) : (
                <Ionicons name="download-outline" size={20} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}