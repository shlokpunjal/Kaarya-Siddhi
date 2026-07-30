import React, { useEffect, useRef } from "react";
import { Modal, StyleSheet, Text, View, Pressable, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { typography } from '../theme/theme';


export type AlertModalType = "success" | "error" | "warning" | "confirm";

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const ICON_CONFIG: Record<AlertModalType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: "checkmark-circle", color: "#22C55E" },
  error: { icon: "close-circle", color: "#EF4444" },
  warning: { icon: "warning", color: "#F59E0B" },
  confirm: { icon: "help-circle", color: "#3B82F6" },
};

export function AlertModal({
  visible,
  title,
  message,
  type = "confirm",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: AlertModalProps) {
  const { colors, isDark } = useTheme();
  const config = ICON_CONFIG[type];

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const cardBg = isDark ? colors.base.surfaceL2 : "#FFFFFF";
  const titleColor = isDark ? colors.text.primary : "#111827";
  const messageColor = isDark ? colors.text.secondary : "#6B7280";
  const cancelBg = isDark ? colors.base.surfaceL1 : "#F3F4F6";
  const cancelTextColor = isDark ? colors.text.primary : "#374151";

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: cardBg, transform: [{ scale }], opacity },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: config.color + "1A" }]}>
            <Ionicons name={config.icon} size={34} color={config.color} />
          </View>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          {!!message && (
            <Text style={[styles.message, typography.body, { color: messageColor }]}>{message}</Text>
          )}

          <View style={styles.buttonRow}>
            {onCancel && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: cancelBg, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, typography.body, { color: cancelTextColor }]}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: config.color, opacity: pressed ? 0.85 : 1 },
                !onCancel && { flex: 1 },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, typography.body]}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "600",
    fontSize: 14,
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});