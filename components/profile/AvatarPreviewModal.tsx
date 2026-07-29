import { Modal, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { profileStyles } from "../../styles/profileStyles";

type Props = {
  visible: boolean;
  avatarUri: string | null;
  onClose: () => void;
};

export default function AvatarPreviewModal({ visible, avatarUri, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={profileStyles.modalBackground} onPress={onClose}>
        <Ionicons name="close" size={30} color="#FFFFFF" style={profileStyles.closeModalButton} />
        {avatarUri && (
          <Image source={{ uri: avatarUri }} style={profileStyles.fullscreenImage} resizeMode="contain" />
        )}
      </Pressable>
    </Modal>
  );
}