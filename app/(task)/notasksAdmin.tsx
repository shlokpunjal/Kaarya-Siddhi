import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";

// Apple's standard "ease-in-out" curve — smoother, more expensive-feeling
// than the default sin-based easing.
const PREMIUM_EASE = Easing.bezier(0.42, 0, 0.58, 1);

export default function NoTasksAdmin() {
  const router = useRouter();
  const { colors } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Image: one slow, restrained breathing motion — scale + a touch of lift.
    // Long duration (5s) is what reads as "premium" rather than "playful".
    const imageLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.03,
            duration: 5000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -8,
            duration: 5000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 5000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 5000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Glow: independent, slightly longer cycle so it drifts in and out of
    // sync with the image — ambient light breathing behind the subject.
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 6000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.85,
            duration: 6000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 6000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 6000,
            easing: PREMIUM_EASE,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    imageLoop.start();
    glowLoop.start();

    return () => {
      imageLoop.stop();
      glowLoop.stop();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: colors.brand.primary, marginTop: 25 }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: colors.brand.onPrimary, fontSize: 22, marginTop: -20 }]}>
            Kaarya Siddhi
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Main content ── */}
      <View style={styles.content}>
        <View style={styles.illustrationStack}>
          {/* Layered soft glow — concentric circles simulate a gaussian blur,
              since RN has no native blur without an extra dependency */}
          <Animated.View
            style={[
              styles.glowLayer,
              styles.glowOuter,
              {
                backgroundColor: colors.brand.accent,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowLayer,
              styles.glowMid,
              {
                backgroundColor: colors.brand.accent,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowLayer,
              styles.glowInner,
              {
                backgroundColor: colors.brand.accent,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <Animated.View
            style={{
              transform: [{ scale }, { translateY }],
            }}
          >
            <Image
              source={require("../../assets/images/notaskImage.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 10 }]}>
          You completed all tasks.
        </Text>
        <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 4 }]}>
          You have no tasks.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/newtaskemp")}
          style={[styles.newTaskButton, { backgroundColor: colors.brand.accent }]}
        >
          <Ionicons name="add" size={22} color={colors.base.surfaceL1} />
          <Text style={[typography.subheading, { color: colors.base.surfaceL1, fontSize: 18 }]}>
            New Task
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 50,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  illustrationStack: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  glowLayer: {
    position: "absolute",
    borderRadius: 999,
  },
  // Three concentric circles, each larger and fainter than the last,
  // approximate a soft radial falloff (poor-man's gaussian blur).
  glowOuter: {
    width: 210,
    height: 210,
    opacity: 0.06,
  },
  glowMid: {
    width: 165,
    height: 165,
    opacity: 0.1,
  },
  glowInner: {
    width: 120,
    height: 120,
    opacity: 0.16,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  newTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 36,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});