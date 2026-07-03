import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { typography } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 8, textAlign: 'center' }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 22, textAlign: 'center' }]}>
            {message}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.base.border }]}
              onPress={onCancel}
            >
              <Text style={[typography.heading3, { color: colors.text.primary }]}>{cancelText}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.confirmButton,
                { backgroundColor: destructive ? colors.status.overdue : colors.brand.accent },
              ]}
              onPress={onConfirm}
            >
              <Text style={[typography.heading3, { color: '#FFFFFF' }]}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '82%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});