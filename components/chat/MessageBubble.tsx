// components/chat/MessageBubble.tsx
import { useRef } from "react";
import { View, Text, Image, TouchableOpacity, Linking, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale, wp } from "../../utils/responsive";
import { formatMessageTime } from "../../utils/chatTime";
import type { ChatMessage, ChatFile } from "../../types/chat";

type Props = {
  message: ChatMessage;
  isOwn: boolean;
  replyPreview?: ChatMessage | null;
  onLongPress: () => void;
  onPressReply?: () => void;
  onSwipeReply?: () => void;
  onOpenMedia?: (file: ChatFile) => void;
};

function TicksIcon({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const { colors } = useTheme();
  if (!isOwn) return null;

  if (message._pending) {
    return <Ionicons name="time-outline" size={14} color={colors.text.secondary} />;
  }
  if (message._failed) {
    return <Ionicons name="alert-circle-outline" size={14} color={colors.status.overdue} />;
  }
  if (message.status === "read") {
    return <Ionicons name="checkmark-done" size={16} color={colors.status.inReview} />;
  }
  if (message.status === "delivered") {
    return <Ionicons name="checkmark-done" size={16} color={colors.text.secondary} />;
  }
  return <Ionicons name="checkmark" size={16} color={colors.text.secondary} />;
}

const SWIPE_THRESHOLD = 45;
const MAX_SWIPE = 65;

export function MessageBubble({ message, isOwn, replyPreview, onLongPress, onPressReply, onSwipeReply, onOpenMedia }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const pan = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        // Own messages swipe left, received messages swipe right — only
        // let it move toward the "open" direction, clamp the distance.
        let dx = gesture.dx;
        if (isOwn) dx = Math.min(0, Math.max(dx, -MAX_SWIPE));
        else dx = Math.max(0, Math.min(dx, MAX_SWIPE));
        pan.setValue(dx);
        iconOpacity.setValue(Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD));
      },
      onPanResponderRelease: (_, gesture) => {
        const passed = Math.abs(gesture.dx) >= SWIPE_THRESHOLD;
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
        Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        if (passed && onSwipeReply) onSwipeReply();
      },
    }),
  ).current;

  const bubbleBg = isOwn ? colors.brand.accent : colors.base.surfaceL2;
  const textColor = isOwn ? "#FFFFFF" : colors.text.primary;
  const timeColor = isOwn ? "rgba(255,255,255,0.75)" : colors.text.secondary;

  if (message.is_deleted) {
    return (
      <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", maxWidth: wp(75), marginVertical: 4, marginHorizontal: 12 }}>
        <View
          style={{
            backgroundColor: colors.base.surfaceL2,
            borderRadius: moderateScale(16),
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="ban-outline" size={14} color={colors.text.secondary} />
          <Text style={{ ...typography.body, color: colors.text.secondary, fontStyle: "italic" }}>
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  const imageFiles = message.files.filter((f) => f.file_type?.startsWith("image/"));
  const videoFiles = message.files.filter((f) => f.file_type?.startsWith("video/"));
  const otherFiles = message.files.filter(
    (f) => !f.file_type?.startsWith("image/") && !f.file_type?.startsWith("video/"),
  );

  return (
    <View style={{ marginVertical: 4, marginHorizontal: 12 }}>
      {/* Reply icon revealed behind the bubble while swiping */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [isOwn ? "right" : "left"]: -30,
          justifyContent: "center",
          opacity: iconOpacity,
        }}
      >
        <Ionicons name="arrow-undo" size={20} color={colors.brand.accent} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          alignSelf: isOwn ? "flex-end" : "flex-start",
          maxWidth: wp(78),
          transform: [{ translateX: pan }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          delayLongPress={250}
          style={{
            backgroundColor: bubbleBg,
            borderRadius: moderateScale(16),
            borderTopRightRadius: isOwn ? 4 : moderateScale(16),
            borderTopLeftRadius: isOwn ? moderateScale(16) : 4,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 6,
            opacity: message._pending ? 0.6 : 1,
          }}
        >
          {/* Reply preview strip */}
          {replyPreview && (
            <TouchableOpacity
              onPress={onPressReply}
              style={{
                backgroundColor: isOwn ? "rgba(255,255,255,0.18)" : colors.base.surfaceL1,
                borderLeftWidth: 3,
                borderLeftColor: isOwn ? "#FFFFFF" : colors.brand.accent,
                borderRadius: 8,
                padding: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ ...typography.label, color: isOwn ? "#FFFFFF" : colors.brand.accent }} numberOfLines={1}>
                {replyPreview.is_deleted ? "Original message deleted" : "Reply"}
              </Text>
              <Text style={{ ...typography.body, color: isOwn ? "rgba(255,255,255,0.85)" : colors.text.secondary, fontSize: 12 }} numberOfLines={1}>
                {replyPreview.is_deleted ? "" : replyPreview.content || "📎 Attachment"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Image attachments */}
          {imageFiles.map((f) => (
            <TouchableOpacity key={f.id} activeOpacity={0.9} onPress={() => onOpenMedia?.(f)}>
              <Image
                source={{ uri: f.file_url }}
                style={{ width: wp(60), height: wp(60), borderRadius: 10, marginBottom: 6 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}

          {/* Video attachments */}
          {videoFiles.map((f) => (
            <TouchableOpacity key={f.id} activeOpacity={0.9} onPress={() => onOpenMedia?.(f)}>
              <View
                style={{
                  width: wp(60),
                  height: wp(60),
                  borderRadius: 10,
                  marginBottom: 6,
                  backgroundColor: "#00000055",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {f.thumbnail_url ? (
                  <Image source={{ uri: f.thumbnail_url }} style={{ width: "100%", height: "100%", position: "absolute" }} resizeMode="cover" />
                ) : null}
                <Ionicons name="play-circle" size={40} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ))}

          {/* Non-image/video file attachments */}
          {otherFiles.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => {
                if (f.file_type === "application/pdf") {
                  router.push({ pathname: "/reports/pdfViewer", params: { uri: f.file_url, title: f.file_name ?? "Document" } });
                } else if (f.file_url) {
                  Linking.openURL(f.file_url);
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: isOwn ? "rgba(255,255,255,0.18)" : colors.base.surfaceL1,
                borderRadius: 10,
                padding: 8,
                marginBottom: 6,
              }}
            >
              <Ionicons name="document-outline" size={20} color={isOwn ? "#FFFFFF" : colors.brand.accent} />
              <Text style={{ ...typography.body, color: textColor, flex: 1 }} numberOfLines={1}>
                {f.file_name || "File"}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Text content */}
          {message.content ? (
            <Text style={{ ...typography.body, color: textColor }}>{message.content}</Text>
          ) : null}

          {/* Timestamp + ticks */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: timeColor }}>{formatMessageTime(message.created_at)}</Text>
            <TicksIcon message={message} isOwn={isOwn} />
          </View>
        </TouchableOpacity>

        {/* Reactions row */}
        {message.reactions.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignSelf: isOwn ? "flex-end" : "flex-start",
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.base.border,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginTop: -6,
              gap: 2,
            }}
          >
            {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => (
              <Text key={emoji} style={{ fontSize: 13 }}>
                {emoji}
                {message.reactions.filter((r) => r.emoji === emoji).length > 1
                  ? ` ${message.reactions.filter((r) => r.emoji === emoji).length}`
                  : ""}
              </Text>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}