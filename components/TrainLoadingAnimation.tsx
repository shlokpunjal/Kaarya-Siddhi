import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from "react-native";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";
import { moderateScale } from "../utils/responsive";

type TrainStatus = "idle" | "loading" | "success" | "error";

interface TrainLoadingAnimationProps {
  /**
   * "idle"    -> hidden (fades out from wherever it is, if currently shown)
   * "loading" -> fades in and eases toward `maxLoadingProgress` over `loadingDurationMs`.
   *              Never reaches the end on its own — it's meant to look like it's
   *              still working no matter how long the real request takes.
   * "success" -> sprints the remaining distance to the end of the track, holds
   *              briefly, fades out, then calls `onFinished`.
   * "error"   -> fades out in place (same as idle), no completion callback.
   */
  status: TrainStatus;
  /** Called once the success arrival + fade-out animation has fully completed. */
  onFinished?: () => void;
  cabColor?: string;
  bodyColor?: string;
  darkColor?: string;
  trackColor?: string;
  trainWidth?: number;
  /** How long the fake "loading" progress takes to ease toward maxLoadingProgress. */
  loadingDurationMs?: number;
  /** Ceiling the loading phase eases toward, so it never finishes on its own (0-1). */
  maxLoadingProgress?: number;
}

const TrainLoadingAnimation: React.FC<TrainLoadingAnimationProps> = ({
  status,
  onFinished,
  cabColor = "#E8870A",
  bodyColor = "#F2A438",
  darkColor = "#1A2744",
  trackColor = "#E5E7EB",
  trainWidth = moderateScale(62),
  loadingDurationMs = 6000,
  maxLoadingProgress = 0.92,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 -> 1 along the track
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevStatusRef = useRef<TrainStatus>("idle");
  const trainHeight = trainWidth * 0.5;

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

    animRef.current?.stop();

    if (status === "loading") {
      animRef.current = Animated.timing(progress, {
        toValue: maxLoadingProgress,
        duration: loadingDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      animRef.current.start();
    }

    if (status === "success") {
      animRef.current = Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
          progress.setValue(0);
          onFinished?.();
        }
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
          <Svg width={trainWidth} height={trainHeight} viewBox="0 0 220 110">
            <Rect x={4} y={26} width={70} height={8} rx={3} fill={darkColor} />
            <Rect x={10} y={34} width={58} height={38} rx={3} fill={cabColor} />
            <Rect x={10} y={66} width={58} height={6} fill={darkColor} />
            <Rect x={16} y={40} width={11} height={16} rx={1.5} fill="#CFEAF5" />
            <Rect x={30} y={40} width={11} height={16} rx={1.5} fill="#CFEAF5" />
            <Rect x={44} y={40} width={11} height={16} rx={1.5} fill="#CFEAF5" />
            <Rect x={58} y={40} width={8} height={16} rx={1.5} fill="#CFEAF5" opacity={0.85} />

            <Rect x={68} y={38} width={100} height={30} rx={6} fill={bodyColor} />
            <Line x1={90} y1={38} x2={90} y2={68} stroke={darkColor} strokeWidth={1.5} opacity={0.35} />
            <Line x1={112} y1={38} x2={112} y2={68} stroke={darkColor} strokeWidth={1.5} opacity={0.35} />
            <Line x1={134} y1={38} x2={134} y2={68} stroke={darkColor} strokeWidth={1.5} opacity={0.35} />
            <Line x1={156} y1={38} x2={156} y2={68} stroke={darkColor} strokeWidth={1.5} opacity={0.35} />

            <Path d="M96 38 L96 30 Q96 24 102 24 L108 24 Q114 24 114 30 L114 38 Z" fill={cabColor} />
            <Path d="M122 38 L122 32 Q122 28 126 28 L130 28 Q134 28 134 32 L134 38 Z" fill={cabColor} />

            <Rect x={182} y={20} width={12} height={20} fill={darkColor} />
            <Path d="M178 20 L198 20 L194 10 L182 10 Z" fill={darkColor} />
            <Rect x={181} y={8} width={14} height={4} rx={2} fill={cabColor} />

            <Path d="M168 38 L200 38 L212 50 L212 62 L168 68 Z" fill={bodyColor} />
            <Circle cx={200} cy={50} r={4.5} fill="#FFE9B8" stroke={darkColor} strokeWidth={1} />

            <Path d="M204 62 L216 68 L200 68 Z" fill={darkColor} />

            <Rect x={4} y={72} width={208} height={5} rx={2} fill={darkColor} />
            <Rect x={30} y={84} width={100} height={4} rx={2} fill="#8A8A8A" />

            <Circle cx={26} cy={86} r={12} fill={darkColor} />
            <Circle cx={26} cy={86} r={4} fill={cabColor} />

            <Circle cx={66} cy={86} r={16} fill={darkColor} />
            <Circle cx={66} cy={86} r={5} fill={cabColor} />

            <Circle cx={112} cy={86} r={16} fill={darkColor} />
            <Circle cx={112} cy={86} r={5} fill={cabColor} />

            <Circle cx={158} cy={86} r={11} fill={darkColor} />
            <Circle cx={158} cy={86} r={3.5} fill={cabColor} />
          </Svg>
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
});