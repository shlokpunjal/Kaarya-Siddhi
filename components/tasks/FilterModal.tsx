import { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text } from "react-native";
import { typography } from "../../theme/theme";
import { taskListStyles } from "../../styles/taskListStyles";

type ThemeColors = any;

type Props = {
  colors: ThemeColors;
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  children: ReactNode; // the screen renders its own chip sections here
};

// Just the modal shell (overlay, card, scrollable body, Apply button).
// Each screen supplies its own filter sections as children so admin can
// add a "By Employee" section without this component needing to know
// anything about FilterType.
export default function FilterModal({ colors, visible, onClose, onApply, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={taskListStyles.modalOverlay} onPress={onClose}>
        <Pressable style={[taskListStyles.modalCard, { backgroundColor: colors.base.surfaceL1 }]} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false} style={taskListStyles.scrollArea}>
            <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 16 }]}>
              Filter Tasks
            </Text>
            {children}
          </ScrollView>

          <Pressable style={[taskListStyles.applyButton, { backgroundColor: colors.brand.accent }]} onPress={onApply}>
            <Text style={[typography.heading3, { color: "#FFFFFF" }]}>Apply Filter</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}