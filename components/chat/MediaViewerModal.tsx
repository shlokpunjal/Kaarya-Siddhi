import { Modal, View, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

type Props = {
  visible: boolean;
  fileUrl: string | null;
  fileType: string | null;
  onClose: () => void;
};

export function MediaViewerModal({ visible, fileUrl, fileType, onClose }: Props) {
  const isVideo = !!fileType?.startsWith("video/");
  const player = useVideoPlayer(isVideo && fileUrl ? fileUrl : "", (p) => {
    p.loop = false;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          style={{ position: "absolute", top: 50, left: 20, zIndex: 10, padding: 6 }}
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {!fileUrl ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : isVideo ? (
          <VideoView style={{ flex: 1 }} player={player} allowsFullscreen nativeControls />
        ) : (
          <Image source={{ uri: fileUrl }} style={{ flex: 1 }} resizeMode="contain" />
        )}
      </View>
    </Modal>
  );
}