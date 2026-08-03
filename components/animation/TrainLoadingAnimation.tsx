import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from "react-native";
import { moderateScale } from "../../utils/responsive";

type TrainStatus = "idle" | "loading" | "success" | "error";

interface TrainLoadingAnimationProps {
  /**
   * "idle"    -> hidden (fades out from wherever it is, if currently shown)
   * "loading" -> fades in and eases toward `maxLoadingProgress` over `loadingDurationMs`.
   *              Never reaches the end on its own — it's meant to look like it's
   *              still working no matter how long the real request takes.
   * "success" -> sprints the *remaining* distance to the end of the track
   *              (duration scales with how far it's already traveled, so a
   *              fast response doesn't cause a jarring teleport-style sprint),
   *              holds briefly, fades out, then calls `onFinished`.
   * "error"   -> fades out in place (same as idle), no completion callback.
   */
  status: TrainStatus;
  /** Called once the success arrival + fade-out animation has fully completed. */
  onFinished?: () => void;
  primaryColor?: string;
  primaryDarkColor?: string;
  accentColor?: string;
  metalColor?: string;
  windowColor?: string;
  steamColor?: string;
  trackColor?: string;
  /**
   * Total width of the whole train (engine + both coaches + couplers).
   * If omitted, it's derived from the track's measured width so the train
   * scales to fit the page instead of using a fixed pixel size.
   */
  trainWidth?: number;
  /** How long the fake "loading" progress takes to ease toward maxLoadingProgress. */
  loadingDurationMs?: number;
  /** Ceiling the loading phase eases toward, so it never finishes on its own (0-1). */
  maxLoadingProgress?: number;
}

// The train graphic (lifted from AnimatedTrainScene) is authored at this
// fixed design size — engine + 2 coaches + 2 couplers. We scale the whole
// assembly up/down as one unit to match the available track width, rather
// than rewriting every internal style as a dynamic calculation.
const ENGINE_BASE_WIDTH = 60;
const COACH_BASE_WIDTH = 64;
const COACH_BASE_GAP = 7;
const TRAIN_BASE_HEIGHT = 42;
const FULL_TRAIN_BASE_WIDTH =
  COACH_BASE_WIDTH * 2 + ENGINE_BASE_WIDTH + COACH_BASE_GAP * 2;

// How wide the train should be relative to the measured track, when no
// explicit `trainWidth` is passed in — clamped so it never gets
// comically tiny or oversized on very narrow/wide screens.
const AUTO_WIDTH_RATIO = 0.58;
const AUTO_WIDTH_MIN = 150;
const AUTO_WIDTH_MAX = 240;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------------
// Steam puff (small looping smoke animation from the chimney)
// ---------------------------------------------------------------------
function SteamPuff({ delayMs, color }: { delayMs: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    const sequence = Animated.sequence([Animated.delay(delayMs), loop]);
    sequence.start();
    return () => sequence.stop();
  }, [anim, delayMs]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const opacity = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] });

  return (
    <Animated.View
      style={[
        styles.steamPuff,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------
// Wheel
// ---------------------------------------------------------------------
function Wheel({ metalColor, accentColor }: { metalColor: string; accentColor: string }) {
  return (
    <View style={[styles.wheel, { backgroundColor: metalColor }]}>
      <View style={[styles.wheelHub, { backgroundColor: accentColor }]} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Coupler (short connector between coaches/engine)
// ---------------------------------------------------------------------
function Coupler({ metalColor, primaryDarkColor }: { metalColor: string; primaryDarkColor: string }) {
  return (
    <View style={[styles.coupler, { backgroundColor: metalColor }]}>
      <View style={[styles.couplerEnd, { backgroundColor: primaryDarkColor }]} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Passenger coach
// ---------------------------------------------------------------------
function Coach({
  primaryColor,
  primaryDarkColor,
  accentColor,
  metalColor,
  windowColor,
}: {
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  metalColor: string;
  windowColor: string;
}) {
  return (
    <View style={styles.coachContainer}>
      {/* Wheels stay behind the coach */}
      <View style={styles.coachWheels}>
        <Wheel metalColor={metalColor} accentColor={accentColor} />
        <Wheel metalColor={metalColor} accentColor={accentColor} />
      </View>

      {/* Main coach body */}
      <View style={[styles.coachBody, { backgroundColor: primaryColor }]}>
        {/* Roof */}
        <View style={[styles.coachRoof, { backgroundColor: primaryDarkColor }]} />

        {/* Windows */}
        <View style={styles.coachWindowsRow}>
          <View style={[styles.coachWindow, { backgroundColor: windowColor, borderColor: primaryDarkColor }]} />
          <View style={[styles.coachWindow, { backgroundColor: windowColor, borderColor: primaryDarkColor }]} />
          <View style={[styles.coachWindow, { backgroundColor: windowColor, borderColor: primaryDarkColor }]} />
        </View>

        {/* Accent stripe */}
        <View style={[styles.coachAccentBand, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Locomotive
// ---------------------------------------------------------------------
function Engine({
  primaryColor,
  primaryDarkColor,
  accentColor,
  metalColor,
  windowColor,
  steamColor,
}: {
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  metalColor: string;
  windowColor: string;
  steamColor: string;
}) {
  return (
    <View style={styles.engineContainer}>
      {/* Smoke */}
      <SteamPuff delayMs={0} color={steamColor} />
      <SteamPuff delayMs={500} color={steamColor} />

      {/* Wheels behind body */}
      <View style={styles.engineWheels}>
        <Wheel metalColor={metalColor} accentColor={accentColor} />
        <Wheel metalColor={metalColor} accentColor={accentColor} />
      </View>

      {/* Engine body */}
      <View style={styles.engineBodyRow}>
        {/* Cab */}
        <View style={[styles.cab, { backgroundColor: primaryDarkColor }]}>
          <View style={[styles.cabWindow, { backgroundColor: windowColor }]} />
        </View>

        {/* Boiler */}
        <View style={[styles.boiler, { backgroundColor: primaryColor }]}>
          {/* Chimney */}
          <View style={[styles.chimney, { backgroundColor: primaryColor }]}>
            <View style={[styles.chimneyTop, { backgroundColor: primaryDarkColor }]} />
          </View>

          {/* Boiler accent band */}
          <View style={[styles.boilerBand, { backgroundColor: accentColor }]} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Full train: coach, coupler, coach, coupler, engine (engine leads)
// ---------------------------------------------------------------------
function FullTrain(props: {
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  metalColor: string;
  windowColor: string;
  steamColor: string;
}) {
  return (
    <View style={styles.fullTrain}>
      <Coach {...props} />
      <Coupler metalColor={props.metalColor} primaryDarkColor={props.primaryDarkColor} />
      <Coach {...props} />
      <Coupler metalColor={props.metalColor} primaryDarkColor={props.primaryDarkColor} />
      <Engine {...props} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------
const TrainLoadingAnimation: React.FC<TrainLoadingAnimationProps> = ({
  status,
  onFinished,
  primaryColor = "#0B1B3D",
  primaryDarkColor = "#071227",
  accentColor = "#E8870A",
  metalColor = "#3A4256",
  windowColor = "#CFE0F5",
  steamColor = "#9e9c9c",
  trackColor = "#E5E7EB",
  trainWidth: trainWidthProp,
  // Tuned down from 6000ms: most OTP verifications resolve well under a
  // second, so a shorter, snappier "cruise" phase means the train is
  // already close to the end by the time success fires, keeping the
  // final sprint short and natural instead of a big catch-up jump.
  loadingDurationMs = 2200,
  maxLoadingProgress = 0.88,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 -> 1 along the track
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevStatusRef = useRef<TrainStatus>("idle");

  // Size the train relative to the page's track width unless an explicit
  // width was passed in.
  const trainWidth =
    trainWidthProp ??
    (trackWidth > 0 ? clamp(trackWidth * AUTO_WIDTH_RATIO, AUTO_WIDTH_MIN, AUTO_WIDTH_MAX) : AUTO_WIDTH_MIN);
  const trainHeight = (trainWidth / FULL_TRAIN_BASE_WIDTH) * TRAIN_BASE_HEIGHT;
  const trainScale = trainWidth / FULL_TRAIN_BASE_WIDTH;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (Math.abs(width - trackWidth) > 1) {
      setTrackWidth(width);
    }
  };

  // Mount / fade-in / fade-out handling, keyed off status changes.
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "loading") {
      setShouldRender(true);

      // Only reset the train back to the start when beginning a genuinely
      // fresh attempt (not when we're already mid-flight for some reason).
      const startingFresh = prevStatus === "idle" || prevStatus === "error";
      if (startingFresh) {
        progress.setValue(0);
      }

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (status === "success") {
      // Arrival + fade-out + onFinished is driven entirely by the progress
      // effect below, since it needs trackWidth to compute the distance.
      return;
    }

    // idle / error -> fade out from wherever it currently is, then unmount.
    animRef.current?.stop();
    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
        progress.setValue(0);
      }
    });
  }, [status]);

  // Progress animation: fake-advance while loading, sprint to the end on success.
  useEffect(() => {
    if (!shouldRender || trackWidth <= 0) return;

    if (status === "loading") {
      animRef.current?.stop();
      animRef.current = Animated.timing(progress, {
        toValue: maxLoadingProgress,
        duration: loadingDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      animRef.current.start();
    }

    if (status === "success") {
      animRef.current?.stop();

      // Capture however far the train has actually traveled so far, so the
      // final sprint's duration scales with the remaining distance instead
      // of always being a fixed length. This is what prevents the
      // "teleport" look when verification finishes quickly and the train
      // has barely moved along the track.
      progress.stopAnimation((currentValue) => {
        const remaining = Math.max(1 - currentValue, 0);
        const sprintDuration = Math.round(Math.max(250, remaining * 700));

        const sequence = Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: sprintDuration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(150),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]);

        animRef.current = sequence;
        sequence.start(({ finished }) => {
          if (finished) {
            setShouldRender(false);
            progress.setValue(0);
            onFinished?.();
          }
        });
      });
    }

    return () => {
      animRef.current?.stop();
    };
  }, [status, shouldRender, trackWidth]);

  if (!shouldRender) return null;

  const travelDistance = Math.max(trackWidth - trainWidth, 0);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDistance],
  });

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <View style={[styles.track, { backgroundColor: trackColor }]} />

      {trackWidth > 0 && (
        <Animated.View
          style={[
            styles.trainWrap,
            {
              width: trainWidth,
              height: trainHeight,
              opacity,
              transform: [{ translateX }],
            },
          ]}
        >
          <View
            style={{
              width: FULL_TRAIN_BASE_WIDTH,
              height: TRAIN_BASE_HEIGHT,
              transform: [{ scale: trainScale }],
            }}
          >
            <FullTrain
              primaryColor={primaryColor}
              primaryDarkColor={primaryDarkColor}
              accentColor={accentColor}
              metalColor={metalColor}
              windowColor={windowColor}
              steamColor={steamColor}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default TrainLoadingAnimation;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: moderateScale(40),
    justifyContent: "flex-end",
    marginTop: 6,
    marginBottom: 6,
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    bottom: 4,
  },
  trainWrap: {
    position: "absolute",
    bottom: 6,
  },

  // ---- Full train row ----
  fullTrain: {
    width: FULL_TRAIN_BASE_WIDTH,
    height: TRAIN_BASE_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  // ---- Engine ----
  engineContainer: {
    position: "relative",
    width: ENGINE_BASE_WIDTH,
    height: TRAIN_BASE_HEIGHT,
  },
  engineBodyRow: {
    position: "absolute",
    left: 0,
    bottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 3,
  },
  cab: {
    width: 20,
    height: 26,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -1,
  },
  cabWindow: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  boiler: {
    position: "relative",
    width: 34,
    height: 20,
    borderRadius: 9,
  },
  boilerBand: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 4,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  chimney: {
    position: "absolute",
    top: -12,
    right: 6,
    width: 8,
    height: 13,
    borderRadius: 3,
    zIndex: 4,
  },
  chimneyTop: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  engineWheels: {
    position: "absolute",
    bottom: 0,
    left: -3,
    width: 52,
    flexDirection: "row",
    justifyContent: "space-around",
    zIndex: 1,
  },

  // ---- Coach ----
  coachContainer: {
    position: "relative",
    width: COACH_BASE_WIDTH,
    height: TRAIN_BASE_HEIGHT,
  },
  coachBody: {
    position: "absolute",
    left: 0,
    bottom: 8,
    width: COACH_BASE_WIDTH,
    height: 25,
    borderRadius: 5,
    zIndex: 3,
    overflow: "hidden",
  },
  coachRoof: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 5,
  },
  coachWindowsRow: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coachWindow: {
    width: 13,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  coachAccentBand: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: 4,
  },
  coachWheels: {
    position: "absolute",
    bottom: 0,
    left: 5,
    right: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },

  // ---- Shared: wheel, coupler, steam ----
  wheel: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelHub: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  coupler: {
    width: COACH_BASE_GAP,
    height: 4,
    marginBottom: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  couplerEnd: {
    width: 4,
    height: 7,
    borderRadius: 2,
  },
  steamPuff: {
    position: "absolute",
    top: -5,
    right: 14,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    zIndex: 10,
  },
});