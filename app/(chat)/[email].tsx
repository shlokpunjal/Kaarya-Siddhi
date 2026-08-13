import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import { useCurrentUserId } from "../../hooks/useCurrentUserId";
import { useConversation } from "../../hooks/chat/useConversation";
import { ChatAvatar } from "../../components/chat/ChatAvatar";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { MessageActionSheet } from "../../components/chat/MessageActionSheet";
import { ChatInputBar } from "../../components/chat/ChatInputBar";
import { formatDateSeparator } from "../../utils/chatTime";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/common/confirmModal";
import type { ChatMessage } from "../../types/chat";
import ConversationSkeleton from "../../components/skeletonScreens/Chat/ConversationSkeleton";
import LoadOlderSkeleton from "../../components/skeletonScreens/Chat/LoadOlderSkeleton";
// Renders either a real message row or a synthetic date-separator row.
type ListRow = { kind: "message"; message: ChatMessage } | { kind: "separator"; label: string };

export default function ConversationScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const otherEmail = decodeURIComponent(email);

  const { colors } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const ownUserId = useCurrentUserId();

  const {
    otherUser,
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    loadOlder,
    sendMessage,
    react,
    removeMessage,
    clear,
  } = useConversation(otherEmail, ownUserId);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [actionSheetFor, setActionSheetFor] = useState<ChatMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null);

  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  const rows: ListRow[] = useMemo(() => {
    const out: ListRow[] = [];
    let lastLabel = "";
    for (const m of messages) {
      const label = formatDateSeparator(m.created_at);
      if (label !== lastLabel) {
        out.push({ kind: "separator", label });
        lastLabel = label;
      }
      out.push({ kind: "message", message: m });
    }
    return out;
  }, [messages]);

  const handleSend = useCallback(
    (params: Parameters<typeof sendMessage>[0]) => {
      sendMessage({ ...params, replyToId: replyTo?.id ?? null });
      setReplyTo(null);
    },
    [sendMessage, replyTo],
  );

  const handleReact = useCallback(
    (emoji: string) => {
      if (actionSheetFor) react(actionSheetFor.id, emoji);
      setActionSheetFor(null);
    },
    [actionSheetFor, react],
  );

  const handleReply = useCallback(() => {
    setReplyTo(actionSheetFor);
    setActionSheetFor(null);
  }, [actionSheetFor]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await removeMessage(confirmDelete.id);
    } catch {
      showToast("Could not delete this message.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, removeMessage, showToast]);

  const handleClearConfirmed = useCallback(async () => {
    setConfirmClear(false);
    try {
      await clear();
      showToast("Chat cleared.", "success");
    } catch {
      showToast("Could not clear this chat.", "error");
    }
  }, [clear, showToast]);

  if (loading) {
    return <ConversationSkeleton />;
  }

  if (error || !otherUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.text.secondary} />
        <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 10, textAlign: "center" }}>
          {error || "Could not load this conversation."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(70),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={moderateScale(26)} color={colors.brand.onPrimary} />
        </TouchableOpacity>
        <ChatAvatar uri={otherUser.profile_pic_url} name={otherUser.name} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.subheading, color: colors.brand.onPrimary }} numberOfLines={1}>
            {otherUser.name}
          </Text>
          <Text style={{ ...typography.label, color: "rgba(255,255,255,0.7)" }} numberOfLines={1}>
            {otherUser.role === "admin" ? "Admin" : "Employee"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.brand.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Header dropdown menu */}
      {menuOpen && (
        <View
          style={{
            position: "absolute",
            top: moderateScale(74),
            right: 12,
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.base.border,
            paddingVertical: 6,
            zIndex: 10,
            boxShadow: "0px 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              setConfirmClear(true);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.status.overdue} />
            <Text style={{ ...typography.body, color: colors.status.overdue }}>Clear chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={rows}
          keyExtractor={(row, i) => (row.kind === "message" ? row.message.id : `sep-${i}-${row.label}`)}
          renderItem={({ item }) => {
            if (item.kind === "separator") {
              return (
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  <View style={{ backgroundColor: colors.base.surfaceL2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ ...typography.label, color: colors.text.secondary }}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const m = item.message;
            const isOwn = m.sender_id === ownUserId;
            const replyPreview = m.reply_to_id ? messagesById.get(m.reply_to_id) ?? null : null;
            return (
              <MessageBubble
                message={m}
                isOwn={isOwn}
                replyPreview={replyPreview}
                onLongPress={() => setActionSheetFor(m)}
              />
            );
          }}
          contentContainerStyle={{ paddingVertical: 10, flexGrow: 1, justifyContent: messages.length === 0 ? "center" : undefined }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            hasMore ? (
              loadingOlder ? (
                <LoadOlderSkeleton />
              ) : (
                <TouchableOpacity onPress={loadOlder} style={{ alignItems: "center", paddingVertical: 10 }}>
                  <Text style={{ ...typography.label, color: colors.brand.accent }}>Load earlier messages</Text>
                </TouchableOpacity>
              )
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingHorizontal: 30 }}>
              <Ionicons name="chatbubble-outline" size={36} color={colors.text.secondary} />
              <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 10, textAlign: "center" }}>
                Say hello to {otherUser.name.split(" ")[0]} 👋
              </Text>
            </View>
          }
        />

        <ChatInputBar replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={handleSend} />
      </KeyboardAvoidingView>

      <MessageActionSheet
        visible={!!actionSheetFor}
        isOwn={actionSheetFor?.sender_id === ownUserId}
        isDeleted={!!actionSheetFor?.is_deleted}
        onClose={() => setActionSheetFor(null)}
        onReact={handleReact}
        onReply={handleReply}
        onDelete={() => {
          setConfirmDelete(actionSheetFor);
          setActionSheetFor(null);
        }}
      />

      <ConfirmModal
        visible={confirmClear}
        title="Clear chat?"
        message="This clears the chat history on your side only. The other person will still see it."
        confirmText="Clear"
        destructive
        onConfirm={handleClearConfirmed}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmModal
        visible={!!confirmDelete}
        title="Delete message?"
        message="This message will be deleted for everyone in this chat."
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </SafeAreaView>
  );
}