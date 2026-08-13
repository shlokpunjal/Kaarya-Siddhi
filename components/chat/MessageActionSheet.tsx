import { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmojiPicker from "rn-emoji-keyboard";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type Props = {
  visible: boolean;
  isOwn: boolean;
  isDeleted: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
};

export function MessageActionSheet({ visible, isOwn, isDeleted, onClose, onReact, onReply, onDelete }: Props) {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.base.surfaceL1,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: moderateScale(28),
                  paddingTop: 14,
                }}
              >
                {!isDeleted && (
                  <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.base.border }}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <TouchableOpacity key={emoji} onPress={() => onReact(emoji)} style={{ padding: 6 }}>
                        <Text style={{ fontSize: 26 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setPickerOpen(true)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: colors.base.surfaceL2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {!isDeleted && (
                  <TouchableOpacity
                    onPress={onReply}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 14 }}
                  >
                    <Ionicons name="arrow-undo-outline" size={22} color={colors.text.primary} />
                    <Text style={{ ...typography.body, color: colors.text.primary }}>Reply</Text>
                  </TouchableOpacity>
                )}

                {isOwn && !isDeleted && (
                  <TouchableOpacity
                    onPress={onDelete}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 14 }}
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.status.overdue} />
                    <Text style={{ ...typography.body, color: colors.status.overdue }}>Delete for everyone</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onEmojiSelected={(item) => {
          setPickerOpen(false);
          onReact(item.emoji);
        }}
      />
    </>
  );
}