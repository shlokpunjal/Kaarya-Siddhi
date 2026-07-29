import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { ThemeMode } from "../../context/ThemeContext";
import CollapsibleSection from "../CollapsibleSection";
import { profileStyles } from "../../styles/profileStyles";

type ThemeColors = any;

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "system", label: "System", icon: "phone-portrait-outline" },
];

type Props = {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export default function AppearanceCard({ colors, mode, setMode }: Props) {
  return (
    <View
      style={[
        profileStyles.card,
        { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border, paddingVertical: 4 },
      ]}
    >
      <CollapsibleSection
        icon="color-palette-outline"
        title="Appearance"
        summary={THEME_OPTIONS.find((o) => o.value === mode)?.label}
        colors={colors}
        last
      >
        <View style={profileStyles.themeRow}>
          {THEME_OPTIONS.map((option) => {
            const selected = mode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                style={[
                  profileStyles.themeOption,
                  {
                    backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
                    borderColor: selected ? colors.brand.accent : colors.base.border,
                  },
                ]}
              >
                <Ionicons name={option.icon} size={22} color={selected ? "#FFFFFF" : colors.text.primary} />
                <Text
                  style={[
                    typography.label,
                    { color: selected ? "#FFFFFF" : colors.text.primary, marginTop: 4 },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </CollapsibleSection>
    </View>
  );
}