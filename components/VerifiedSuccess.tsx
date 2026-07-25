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

const SUCCESS_GREEN = "#22C55E";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function VerifiedSuccess({
  title = "Verified successfully",
  subtitle = "Your phone number has been verified.",
}: Props) {
  const { colors } = useTheme();

  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(8);

  useEffect(() => {
    // Ring pops in
    ringOpacity.value = withTiming(1, { duration: 300 });
    ringScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.4)) });

    // Checkmark scales/fades in slightly after the ring
    checkOpacity.value = withDelay(200, withTiming(1, { duration: 250 }));
    checkScale.value = withDelay(
      200,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.8)) })
    );

    // Continuous soft pulse around the ring, starts once the ring has appeared
    pulseScale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      )
    );
    pulseOpacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // "Verified & Secured" label fades up last
    textOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    textTranslateY.value = withDelay(500, withTiming(0, { duration: 300 }));
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitle}</Text>

      <View style={styles.badgeWrap}>
        {/* Continuous pulsing halo */}
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        {/* Static outer ring */}
        <Animated.View style={[styles.outerRing, ringStyle]}>
          <Animated.View style={[styles.checkBadge, checkStyle]}>
            <Ionicons name="checkmark" size={moderateScale(36)} color="#fff" />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footerRow, textStyle]}>
        <Ionicons name="lock-closed" size={moderateScale(13)} color={SUCCESS_GREEN} />
        <Text style={styles.footerText}>Verified & Secured</Text>
      </Animated.View>
    </View>
  );
}

const RING_SIZE = moderateScale(130);
const BADGE_SIZE = moderateScale(56);

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", paddingVertical: moderateScale(30) },
  title: { fontSize: moderateScale(18), fontWeight: "600", marginBottom: 6 },
  subtitle: { fontSize: moderateScale(13), textAlign: "center", marginBottom: moderateScale(28) },
  badgeWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: SUCCESS_GREEN,
  },
  outerRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: SUCCESS_GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  checkBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: moderateScale(14),
    backgroundColor: SUCCESS_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: moderateScale(22),
  },
  footerText: {
    color: SUCCESS_GREEN,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
});