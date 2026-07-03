// components/ProgressDots.tsx
import { View, StyleSheet } from "react-native";

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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E5E5E5" },
  active: { backgroundColor: "#F5A623" },
});