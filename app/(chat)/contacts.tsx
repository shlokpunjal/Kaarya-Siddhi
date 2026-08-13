import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useChatContacts } from "../../hooks/chat/useChatContacts";
import { ChatAvatar } from "../../components/chat/ChatAvatar";
import { formatContactPreviewTime } from "../../utils/chatTime";
import type { ChatContact } from "../../types/chat";
import ChatContactsSkeleton from "../../components/skeletonScreens/Chat/ChatContactsSkeleton";
export default function ChatContactsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { contacts, loading, refreshing, error, refresh, typingConversationIds } = useChatContacts();

  const renderItem = ({ item }: { item: ChatContact }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(chat)/${encodeURIComponent(item.email)}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: wp(5),
        paddingVertical: moderateScale(12),
        gap: 14,
      }}
    >
      <ChatAvatar uri={item.profile_pic_url} name={item.name} size={52} />

      <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: colors.base.border, paddingBottom: moderateScale(12) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ ...typography.subheading, color: colors.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          {item.last_message_at && (
            <Text
              style={{
                ...typography.label,
                color: item.unread_count > 0 ? colors.brand.accent : colors.text.secondary,
              }}
            >
              {formatContactPreviewTime(item.last_message_at)}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
          {typingConversationIds.has(item.conversation_id ?? "") ? (
            <Text
              style={{ ...typography.body, color: "#25D366", flex: 1, marginRight: 8, fontWeight: "600" }}
              numberOfLines={1}
            >
              typing...
            </Text>
          ) : (
            <Text
              style={{ ...typography.body, color: colors.text.secondary, flex: 1, marginRight: 8 }}
              numberOfLines={1}
            >
              {item.last_message_type === "image" && !item.last_message
                ? "📷 Photo"
                : item.last_message_type === "file" && !item.last_message
                  ? "📎 File"
                  : item.last_message || (item.designation ?? "Tap to start chatting")}
            </Text>
          )}
          {item.unread_count > 0 && (
            <View
              style={{
                minWidth: moderateScale(20),
                height: moderateScale(20),
                paddingHorizontal: 5,
                borderRadius: moderateScale(10),
                backgroundColor: colors.brand.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...typography.label, color: "#FFFFFF", fontSize: 11 }}>
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ChatContactsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(70),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={moderateScale(26)}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            flex: 1,
            textAlign: "center",
            marginRight: moderateScale(26),
          }}
        >
          Chats
        </Text>
      </View>

      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: wp(10) }}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.text.secondary} />
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 10, textAlign: "center" }}>
            {error}
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: wp(10) }}>
          <Ionicons name="chatbubbles-outline" size={44} color={colors.text.secondary} />
          <Text style={{ ...typography.subheading, color: colors.text.primary, marginTop: 14, textAlign: "center" }}>
            No one to chat with yet
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 6, textAlign: "center" }}>
            Once you're connected with an admin or employee, they'll show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand.accent} colors={[colors.brand.accent]} />
          }
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}