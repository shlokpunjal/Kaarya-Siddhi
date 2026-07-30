import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "../context/ThemeContext";
import { moderateScale } from "../utils/responsive";
import { typography } from "../theme/theme";

/* ======================================================
   COLORS
====================================================== */

const NAVY = "#1A2744";
const ACCENT = "#E8870A";

const SUCCESS_BADGE = ACCENT;
const SUCCESS_DEEP = NAVY;
const SUCCESS_GLOW = "rgba(26, 39, 68, 0.07)";

const TEXT_TITLE = NAVY;
const TEXT_SUBTITLE = "#5B6478";

/* ======================================================
   TYPES
====================================================== */

type Props = {
  title?: string;
  subtitle?: string;
};

/* ======================================================
   COMPONENT
====================================================== */

export default function VerifiedSuccess({
  title = "Verified successfully",
  subtitle = "Your phone number has been verified.",
}: Props) {
  const { colors } = useTheme();

  /* ---------------- Animation Values ---------------- */

  const ringScale = useSharedValue(0.12);
  const ringOpacity = useSharedValue(0);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(8);

  /* ---------------- Animation Sequence ---------------- */

  useEffect(() => {
    // Ring appears
    ringOpacity.value = withTiming(1, {
      duration: 160,
    });

    ringScale.value = withTiming(1, {
      duration: 480,
      easing: Easing.out(Easing.back(1.15)),
    });

    // Checkmark appears after ring
    checkOpacity.value = withDelay(
      280,
      withTiming(1, {
        duration: 220,
      })
    );

    checkScale.value = withDelay(
      280,
      withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.back(1.7)),
      })
    );

    // Continuous soft pulse
    pulseScale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.35, {
            duration: 1000,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(1, {
            duration: 0,
          })
        ),
        -1,
        false
      )
    );

    pulseOpacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0, {
            duration: 1000,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0.5, {
            duration: 0,
          })
        ),
        -1,
        false
      )
    );

    // Footer appears last
    textOpacity.value = withDelay(
      500,
      withTiming(1, {
        duration: 300,
      })
    );

    textTranslateY.value = withDelay(
      500,
      withTiming(0, {
        duration: 300,
      })
    );
  }, []);

  /* ---------------- Animated Styles ---------------- */

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      {/* Heading */}
      <Text style={[styles.title, typography.heading3]}>
        {title}
      </Text>

      <Text style={styles.subtitle}>
        {subtitle}
      </Text>

      {/* Success Animation */}
      <View style={styles.badgeWrap}>
        {/* Background Glow */}
        <View style={styles.glow} />

        {/* Pulsing Halo */}
        <Animated.View
          style={[styles.pulseRing, pulseStyle]}
        />

        {/* Main Outer Ring */}
        <Animated.View
          style={[styles.outerRing, ringStyle]}
        >
          {/* Orange Check Badge */}
          <Animated.View
            style={[styles.checkBadge, checkStyle]}
          >
            <Ionicons
              name="checkmark"
              size={moderateScale(36)}
              color="#FFFFFF"
            />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Security Footer */}
      <Animated.View
        style={[styles.footerRow, textStyle]}
      >
        <Ionicons
          name="lock-closed"
          size={moderateScale(13)}
          color={SUCCESS_DEEP}
        />

        <Text style={styles.footerText}>
          Verified & Secured
        </Text>
      </Animated.View>
    </View>
  );
}

/* ======================================================
   SIZES
====================================================== */

const RING_SIZE = moderateScale(130);
const BADGE_SIZE = moderateScale(56);
const GLOW_SIZE = moderateScale(170);

/* ======================================================
   STYLES
====================================================== */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: moderateScale(28),
  },

  title: {
    fontSize: moderateScale(18),
    marginBottom: moderateScale(6),
    color: TEXT_TITLE,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: moderateScale(13),
    textAlign: "center",
    marginBottom: moderateScale(28),
    color: TEXT_SUBTITLE,
  },

  badgeWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",

    // Kept from your latest Snack version
    marginTop: moderateScale(22),
  },

  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: SUCCESS_GLOW,
  },

  pulseRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: moderateScale(2),
    borderColor: SUCCESS_DEEP,
  },

  outerRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,

    borderWidth: moderateScale(2),
    borderColor: SUCCESS_DEEP,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(26, 39, 68, 0.05)",
  },

  checkBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: moderateScale(14),

    backgroundColor: SUCCESS_BADGE,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: SUCCESS_DEEP,
    shadowOffset: {
      width: 0,
      height: moderateScale(6),
    },
    shadowOpacity: 0.35,
    shadowRadius: moderateScale(10),

    elevation: 6,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),

    // Kept from your latest Snack version
    marginTop: moderateScale(46),
  },

  footerText: {
    color: SUCCESS_DEEP,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
});