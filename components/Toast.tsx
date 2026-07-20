import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, Pressable, Platform, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { typography } from "../theme/theme";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const TYPE_COLOR: Record<ToastType, string> = {
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
};

const TYPE_ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "close-circle",
  warning: "warning",
  info: "information-circle",
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;

  const accent = TYPE_COLOR[toast.type];
  const icon = TYPE_ICON[toast.type];
  const duration = toast.duration ?? 3500;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -40, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 90) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: g.dx > 0 ? 400 : -400,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onDismiss(toast.id));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, []);

  const cardBg = isDark ? colors.base.surfaceL2 : "#FFFFFF";
  const textColor = isDark ? colors.text.primary : "#1F2937";
  const closeColor = isDark ? colors.text.secondary : "#9CA3AF";

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.toast,
        {
          backgroundColor: cardBg,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
    >
      <Pressable style={styles.content} onPress={dismiss}>
        <View style={[styles.iconBadge, { backgroundColor: accent + "22" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
          {toast.message}
        </Text>
        <Pressable hitSlop={10} onPress={dismiss} style={styles.closeButton}>
          <Ionicons name="close" size={16} color={closeColor} />
        </Pressable>
      </Pressable>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: accent,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily:"Poppins_600SemiBold",
    // fontWeight: "500",
    lineHeight: 19,
  },
  closeButton: {
    padding: 2,
  },
  progressTrack: {
    height: 3,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  progressFill: {
    height: "100%",
  },
});