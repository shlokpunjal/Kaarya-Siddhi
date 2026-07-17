import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from "react-native";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";

interface TrainLoadingAnimationProps {
  active: boolean;
  cabColor?: string;
  bodyColor?: string;
  darkColor?: string;
  trackColor?: string;
  trainWidth?: number;
  durationMs?: number;
}

const TrainLoadingAnimation: React.FC<TrainLoadingAnimationProps> = ({
  active,
  cabColor = "#E8870A",
  bodyColor = "#F2A438",
  darkColor = "#1A2744",
  trackColor = "#E5E7EB",
  trainWidth = 62,
  durationMs = 1500,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const trainHeight = trainWidth * 0.5;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (Math.abs(width - trackWidth) > 1) {
      setTrackWidth(width);
    }
  };

  useEffect(() => {
    if (active) {
      // Starting fresh: mount, reset position, fade in, start looping
      setShouldRender(true);
      translateX.setValue(0);
      opacity.setValue(0);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Stopping: DON'T touch translateX — fade out from wherever it currently is
      loopRef.current?.stop();

      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [active]);

  useEffect(() => {
    loopRef.current?.stop();

    if (active && shouldRender && trackWidth > 0) {
      const travelDistance = trackWidth - trainWidth;

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: travelDistance,
            duration: durationMs,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: durationMs,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active, shouldRender, trackWidth]);

  if (!shouldRender) return null;

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
    height: 40,
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