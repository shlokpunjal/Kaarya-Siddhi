import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

type FadeInProps = {
  visible: boolean;
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: any;
};

export default function FadeIn({ visible, children, duration = 250, delay = 0, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(-4);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}