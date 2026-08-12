import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale, wp } from "../../utils/responsive";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import type { ChatMessage, PendingAttachment } from "../../types/chat";

type Props = {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (params: { content?: string; files?: PendingAttachment[]; messageType?: "text" | "image" | "file" }) => void;
};

export function ChatInputBar({ replyTo, onCancelReply, onSend }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [pendingPreviewUri, setPendingPreviewUri] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<"image" | "file">("image");

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadToCloudinary(
        { uri: asset.uri, name: asset.fileName || "chat-image.jpg", type: asset.mimeType || "image/jpeg" },
        { folder: "chat_attachments", resourceType: "image" },
      );
      setPendingAttachment({
        file_url: url,
        file_name: asset.fileName || "chat-image.jpg",
        file_type: asset.mimeType || "image/jpeg",
        file_size: asset.fileSize || null,
        thumbnail_url: url,
      });
      setPendingPreviewUri(asset.uri);
      setPendingType("image");
    } catch (err: any) {
      console.error("[ChatInputBar] image upload failed:", err?.message || err);
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadToCloudinary(
        { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" },
        { folder: "chat_attachments", resourceType: "auto" },
      );
      setPendingAttachment({
        file_url: url,
        file_name: asset.name,
        file_type: asset.mimeType || "application/octet-stream",
        file_size: asset.size || null,
        thumbnail_url: null,
      });
      setPendingPreviewUri(null);
      setPendingType("file");
    } catch (err: any) {
      console.error("[ChatInputBar] document upload failed:", err?.message || err);
    } finally {
      setUploading(false);
    }
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
    setPendingPreviewUri(null);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;

    onSend({
      content: trimmed || undefined,
      files: pendingAttachment ? [pendingAttachment] : undefined,
      messageType: pendingAttachment ? pendingType : "text",
    });

    setText("");
    clearAttachment();
  };

  return (
    <View style={{ backgroundColor: colors.base.surfaceL1, borderTopWidth: 1, borderTopColor: colors.base.border }}>
      {/* Reply preview banner */}
      {replyTo && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: colors.base.surfaceL2,
            borderLeftWidth: 3,
            borderLeftColor: colors.brand.accent,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.label, color: colors.brand.accent }}>Replying to</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, fontSize: 12 }} numberOfLines={1}>
              {replyTo.is_deleted ? "This message was deleted" : replyTo.content || "📎 Attachment"}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 8, gap: 10 }}>
          {pendingPreviewUri ? (
            <Image source={{ uri: pendingPreviewUri }} style={{ width: 48, height: 48, borderRadius: 8 }} />
          ) : (
            <Ionicons name="document-outline" size={28} color={colors.brand.accent} />
          )}
          <Text style={{ ...typography.body, color: colors.text.secondary, flex: 1 }} numberOfLines={1}>
            {pendingAttachment.file_name}
          </Text>
          <TouchableOpacity onPress={clearAttachment} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.status.overdue} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 8, gap: 6 }}>
        <TouchableOpacity onPress={pickImage} disabled={uploading} style={{ padding: 8 }}>
          <Ionicons name="image-outline" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument} disabled={uploading} style={{ padding: 8 }}>
          <Ionicons name="attach" size={24} color={colors.text.secondary} />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            backgroundColor: colors.base.surfaceL2,
            borderRadius: moderateScale(22),
            borderWidth: 1,
            borderColor: colors.base.border,
            paddingHorizontal: 14,
            paddingVertical: 8,
            maxHeight: moderateScale(100),
            justifyContent: "center",
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor={colors.text.secondary}
            multiline
            style={{ ...typography.body, color: colors.text.primary, maxHeight: moderateScale(84) }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={uploading || (!text.trim() && !pendingAttachment)}
          style={{
            width: moderateScale(42),
            height: moderateScale(42),
            borderRadius: moderateScale(21),
            backgroundColor: colors.brand.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: uploading || (!text.trim() && !pendingAttachment) ? 0.5 : 1,
          }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}