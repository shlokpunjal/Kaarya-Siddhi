import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RailSpinnerProps {
  size?: number;
  trackColor?: string;
  arcColor?: string;
  strokeWidth?: number;
}

const RailSpinner: React.FC<RailSpinnerProps> = ({
  size = 48,
  trackColor = "#1A2744",
  arcColor = "#E8870A",
  strokeWidth = 4,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
      <Svg width={size} height={size}>
        {/* Static track — small dashes, a subtle nod to rail sleepers */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeOpacity={0.18}
          strokeDasharray={`${circumference / 24} ${circumference / 24}`}
          fill="none"
        />
        {/* Rotating arc — the actual loading indicator */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

export default RailSpinner;

const styles = StyleSheet.create({});