import { View, StyleSheet } from "react-native";
import { lightTheme } from "../theme/theme";

const { colors } = lightTheme;

export default function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < current && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.brand.accent,
    backgroundColor: "transparent",
  },
  active: { backgroundColor: colors.brand.accent },
});