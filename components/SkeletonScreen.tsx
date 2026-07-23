// Generic shimmering placeholder shown briefly after the user taps
// "Retry Now" on the offline screen — mimics the shape of a normal
// app screen (header + content rows) while a fresh connectivity
// check is in flight.
 
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
 
function ShimmerBlock({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
 
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
 
  return <Animated.View style={[styles.block, style, { opacity }]} />;
}
 
export default function SkeletonScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ShimmerBlock style={styles.avatar} />
        <ShimmerBlock style={styles.headerLine} />
      </View>
 
      <ShimmerBlock style={styles.bannerBlock} />
 
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.cardRow}>
          <ShimmerBlock style={styles.cardThumb} />
          <View style={styles.cardTextCol}>
            <ShimmerBlock style={styles.lineWide} />
            <ShimmerBlock style={styles.lineNarrow} />
          </View>
        </View>
      ))}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  block: {
    backgroundColor: "#e2e5ea",
    borderRadius: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerLine: {
    flex: 1,
    height: 14,
  },
  bannerBlock: {
    width: "100%",
    height: 90,
    marginBottom: 18,
    borderRadius: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  cardTextCol: {
    flex: 1,
  },
  lineWide: {
    width: "80%",
    height: 12,
    marginBottom: 8,
  },
  lineNarrow: {
    width: "45%",
    height: 10,
  },
});