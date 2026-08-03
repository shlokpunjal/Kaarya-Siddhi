import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import AnimatedTrainScene from "../animation/AnimatedTrainScene";
import { typography } from "../../theme/theme";

const DOT_COLOR = "#0B1B3D";
const DOT_GROW_MS = 260;
const DOT_STAGGER_MS = 150;
const LOOP_PAUSE_MS = 400;

// ---------------------------------------------------------------------
// Three dots that grow one after another, then pause briefly and repeat
// from the beginning — a classic "typing/loading" indicator.
// ---------------------------------------------------------------------
function LoadingDots({ color = DOT_COLOR }: { color?: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const growAndShrink = (dot: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, {
          toValue: 1,
          duration: DOT_GROW_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: DOT_GROW_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

    // All three dots animate in parallel, but each one's own internal
    // delay staggers when it actually starts growing — so visually they
    // grow left to right, one at a time. A trailing pause gives a clean
    // beat before the whole thing loops back to dot 1.
    const cycle = Animated.sequence([
      Animated.parallel([
        growAndShrink(dot1, 0),
        growAndShrink(dot2, DOT_STAGGER_MS),
        growAndShrink(dot3, DOT_STAGGER_MS * 2),
      ]),
      Animated.delay(LOOP_PAUSE_MS),
    ]);

    const loop = Animated.loop(cycle);
    loop.start();

    return () => loop.stop();
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot: Animated.Value) => ({
    backgroundColor: color,
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.3],
        }),
      },
    ],
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Full-screen loading state
// ---------------------------------------------------------------------
export default function LoadingAssetsScreen({
  message = "Loading your assets",
}: {
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <AnimatedTrainScene />
      <View style={styles.messageRow}>
        <Text style={[styles.message, typography.body]}>{message}</Text>
        <LoadingDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
  },
  messageRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    color: "#0B1B3D",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 3,
  },
});