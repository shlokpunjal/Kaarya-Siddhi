import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
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
  const dashOffset = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const perimeter =
    size.width > 0
      ? 2 * (size.width - 2 * borderRadius) +
        2 * (size.height - 2 * borderRadius) +
        2 * Math.PI * borderRadius
      : 0;

  const segmentLength = perimeter * 0.28; // length of the glowing comet trail

  useEffect(() => {
    if (active && perimeter > 0) {
      dashOffset.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(dashOffset, {
          toValue: -perimeter,
          duration: 1600,
          useNativeDriver: false,
        })
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      dashOffset.setValue(0);
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active, perimeter]);

  return (
    <View style={style} onLayout={onLayout}>
      {active && size.width > 0 && (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Outer soft glow */}
          <AnimatedRect
            x={1}
            y={1}
            width={size.width - 2}
            height={size.height - 2}
            rx={borderRadius}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeOpacity={0.22}
            strokeDasharray={`${segmentLength}, ${perimeter}`}
            strokeDashoffset={dashOffset as unknown as number}
            strokeLinecap="round"
          />
          {/* Mid glow */}
          <AnimatedRect
            x={1}
            y={1}
            width={size.width - 2}
            height={size.height - 2}
            rx={borderRadius}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeOpacity={0.55}
            strokeDasharray={`${segmentLength}, ${perimeter}`}
            strokeDashoffset={dashOffset as unknown as number}
            strokeLinecap="round"
          />
          {/* Bright core */}
          <AnimatedRect
            x={1}
            y={1}
            width={size.width - 2}
            height={size.height - 2}
            rx={borderRadius}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray={`${segmentLength}, ${perimeter}`}
            strokeDashoffset={dashOffset as unknown as number}
            strokeLinecap="round"
          />
        </Svg>
      )}
      {children}
    </View>
  );
};

export default LoadingBorderTrace;