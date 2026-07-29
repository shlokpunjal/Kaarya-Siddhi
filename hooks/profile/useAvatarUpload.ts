import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { authFetch } from "../../utils/authFetch";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";

export function useAvatarUpload(
  userId: string | undefined,
  initialUri: string | null,
  onSuccess: (url: string) => void,
  onError: (msg: string) => void,
) {
  const [avatarUri, setAvatarUri] = useState<string | null>(initialUri);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setAvatarUri(initialUri), [initialUri]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError("Please allow photo library access to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setAvatarUri(localUri); // optimistic preview
    setUploading(true);

    try {
      const secureUrl = await uploadToCloudinary(
        { uri: localUri, type: "image/jpeg", name: `avatar_${userId}.jpg` },
        { folder: "profile_pics", resourceType: "image" },
      );
      const res = await authFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify({ profile_pic_url: secureUrl }),
      });
      if (!res.ok) throw new Error("Could not update photo");
      setAvatarUri(secureUrl);
      onSuccess(secureUrl);
    } catch (err: any) {
      onError(err.message || "Could not upload photo.");
      setAvatarUri(initialUri); // revert preview
    } finally {
      setUploading(false);
    }
  };

  return { avatarUri, uploading, pickAvatar };
}