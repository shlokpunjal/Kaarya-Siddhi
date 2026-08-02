import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";

type TaskFile = {
  file_url?: string;
  file_name?: string;
};

type Props = {
  files: TaskFile[];
};

/**
 * "Files Attached (N)" section — identical between task-detail.tsx and
 * taskDetailAdmin.tsx. Each row opens the Cloudinary URL on tap.
 */
export function FileAttachmentList({ files }: Props) {
  const { colors } = useTheme();

  return (
    <View>
      <Text
        style={{
          ...typography.heading3,
          color: colors.text.primary,
          marginBottom: 10,
        }}
      >
        Files Attached ({files.length})
      </Text>

      {files.length === 0 ? (
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            marginBottom: 16,
          }}
        >
          No files attached.
        </Text>
      ) : (
        files.map((file, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => file.file_url && Linking.openURL(file.file_url)}
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
            <Ionicons name="document" size={22} color={colors.brand.accent} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, ...typography.body, color: colors.text.primary }}
            >
              {file.file_name ?? "Unnamed file"}
            </Text>
            <Ionicons
              name="open-outline"
              size={18}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}