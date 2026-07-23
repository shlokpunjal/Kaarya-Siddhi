import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { wp } from '../utils/responsive';

type BackButtonProps = {
  color?: string;
  onPress?: () => void;
};

export default function BackButton({ color = '#FFFFFF', onPress }: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={styles.button}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="chevron-back" size={22} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: wp(5.3),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
});