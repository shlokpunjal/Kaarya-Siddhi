import { useState } from "react";
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { downloadAndShareFile } from "../../utils/downloadFile";
import type { SubmissionFile } from "../../hooks/task/useTaskDetail";

type Props = {
  files: SubmissionFile[];
};

const formatWhen = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Files an employee attached when tapping "Ask to Review". For a team
 * task these can come from several different teammates — each row is
 * tagged with who submitted it so the admin (and the rest of the team)
 * can tell submissions apart. Shared between task-detail-employee.tsx
 * and task-detail-admin.tsx.
 */
export function SubmittedFilesList({ files }: Props) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  const handleDownload = async (idx: number, file: SubmissionFile) => {
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
    <View style={{ marginTop: 16 }}>
      <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 10 }}>
        Submitted Files {files.length > 0 ? `(${files.length})` : ""}
      </Text>

      {files.length === 0 ? (
        <Text style={{ ...typography.body, color: colors.text.secondary }}>
          No files submitted with review requests yet.
        </Text>
      ) : (
        files.map((file, idx) => (
          <View
            key={`${file.file_url}-${idx}`}
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
              <Ionicons name="document-attach" size={22} color={colors.brand.accent} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ ...typography.body, color: colors.text.primary }}>
                  {file.file_name ?? "Unnamed file"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ ...typography.label, color: colors.text.secondary, marginTop: 2 }}
                >
                  {file.submitted_by_name ? `Submitted by ${file.submitted_by_name}` : "Submitted"}
                  {file.submitted_at ? ` • ${formatWhen(file.submitted_at)}` : ""}
                </Text>
              </View>
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