import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

type Props = {
  files: any[];
  onPick: () => void;
  onRemove: (name: string) => void;
};

/** The "Add files" trigger + list of attached file chips from newtask.tsx. */
export function FileAttachmentPicker({ files, onPick, onRemove }: Props) {
  const { colors } = useTheme();

  return (
    <View>
      <TouchableOpacity
        onPress={onPick}
        style={{
          backgroundColor: colors.base.surfaceL2,
          marginTop: 14,
          height: moderateScale(50),
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
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? "s" : ""} attached — tap to add more`
            : "Add files"}
        </Text>
      </TouchableOpacity>

      {files.length > 0 && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {files.map((file) => (
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
                style={{ ...typography.body, color: colors.text.primary, flex: 1 }}
                numberOfLines={1}
              >
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => onRemove(file.name)}>
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
    </View>
  );
}