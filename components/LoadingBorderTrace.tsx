import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
  Easing,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface LoadingBorderTraceProps {
  active: boolean;
  borderRadius?: number;
  color?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const LoadingBorderTrace: React.FC<LoadingBorderTraceProps> = ({
  active,
  borderRadius = 24,
  color = "#E8870A",
  children,
  style,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // Only update state on a meaningful size change, not sub-pixel jitter
    setSize((prev) => {
      if (Math.abs(width - prev.width) > 1 || Math.abs(height - prev.height) > 1) {
        return { width, height };
      }
      return prev;
    });
  };

  const w = size.width;
  const h = size.height;
  const r = Math.min(borderRadius, w / 2, h / 2);
  const perimeter =
    w > 0 && h > 0 ? 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r : 0;
  const cometLength = perimeter * 0.22;
  const gapLength = Math.max(perimeter - cometLength, 1);

  // IMPORTANT: only depend on `active`, never on `perimeter`/size —
  // otherwise every layout re-measure restarts the loop back to 0
  useEffect(() => {
    loopRef.current?.stop();

    if (active) {
      progress.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      loopRef.current.start();
    } else {
      progress.setValue(0);
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(cometLength + gapLength)],
  });

  return (
    <View style={style} onLayout={onLayout}>
      {active && w > 0 && h > 0 && (
        <Svg
          width={w}
          height={h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <AnimatedRect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={r}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeOpacity={0.25}
            strokeDasharray={`${cometLength}, ${gapLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
          <AnimatedRect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeOpacity={0.6}
            strokeDasharray={`${cometLength}, ${gapLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
          <AnimatedRect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={r}
            fill="none"
            stroke="#FFD9A0"
            strokeWidth={3}
            strokeDasharray={`${cometLength}, ${gapLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </Svg>
      )}
      {children}
    </View>
  );
};

export default LoadingBorderTrace;