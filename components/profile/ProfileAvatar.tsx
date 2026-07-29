import { View, Text, Pressable, Image, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { profileStyles, RING_SIZE } from "../../styles/profileStyles";

type ThemeColors = any; // swap for your real ThemeColors type if exported

type Props = {
  colors: ThemeColors;
  avatarUri: string | null;
  uploading: boolean;
  editing: boolean;
  initials: string;
  name: string;
  designation: string;
  onChangeName: (v: string) => void;
  onChangeDesignation: (v: string) => void;
  onPickAvatar: () => void;
  onPressAvatar: () => void; // opens preview when not editing
};

export default function ProfileAvatar({
  colors,
  avatarUri,
  uploading,
  editing,
  initials,
  name,
  designation,
  onChangeName,
  onChangeDesignation,
  onPickAvatar,
  onPressAvatar,
}: Props) {
  return (
    <View style={profileStyles.avatarSection}>
      <View style={profileStyles.avatarWrap}>
        <Pressable onPress={editing ? onPickAvatar : onPressAvatar}>
          <View style={[profileStyles.avatarRing, { borderColor: colors.brand.accent }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={profileStyles.avatarImage} />
            ) : (
              <View
                style={[
                  profileStyles.avatarImage,
                  profileStyles.avatarFallback,
                  { backgroundColor: colors.brand.accent },
                ]}
              >
                <Text style={[typography.heading, { color: "#FFFFFF" }]}>{initials}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {uploading && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                alignItems: "center",
                justifyContent: "center",
                borderRadius: RING_SIZE / 2,
                backgroundColor: "rgba(0,0,0,0.35)",
              },
            ]}
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}

        {editing && (
          <Pressable
            style={[
              profileStyles.cameraBadge,
              { backgroundColor: colors.brand.primary, borderColor: colors.base.surfaceL1 },
            ]}
            onPress={onPickAvatar}
            hitSlop={8}
          >
            <Ionicons name="camera" size={13} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {editing ? (
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="Full name"
          placeholderTextColor={colors.text.secondary}
          style={[
            typography.subheading,
            profileStyles.avatarNameInput,
            { borderColor: colors.base.border, color: colors.text.primary },
          ]}
        />
      ) : (
        <Text
          style={[typography.subheading, { color: colors.text.primary, marginTop: 12 }]}
          numberOfLines={1}
        >
          {name}
        </Text>
      )}

      {editing ? (
        <TextInput
          value={designation}
          onChangeText={onChangeDesignation}
          placeholder="Designation"
          placeholderTextColor={colors.text.secondary}
          style={[
            typography.body,
            profileStyles.avatarDesignationInput,
            { borderColor: colors.base.border, color: colors.text.primary },
          ]}
        />
      ) : (
        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
          {designation || "—"}
        </Text>
      )}
    </View>
  );
}