import { View, Text, Image } from "react-native";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";

type Props = {
  uri: string | null;
  name: string;
  size?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ChatAvatar({ uri, name, size = 44 }: Props) {
  const { colors } = useTheme();
  const dim = moderateScale(size);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: colors.brand.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ ...typography.heading3, color: "#FFFFFF", fontSize: dim * 0.38 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}