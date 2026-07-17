import { useEffect, useRef } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type SkeletonBoxProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export default function SkeletonBox({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.base.surfaceL2,
          opacity,
        },
        style,
      ]}
    />
  );
}