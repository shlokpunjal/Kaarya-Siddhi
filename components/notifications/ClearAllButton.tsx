import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { typography } from "../../theme/theme";

type Props = {
  onPress: () => void;
  loading: boolean;
  color: string;
  label?: string;
};

function Dot({ color, delay }: { color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity: anim,
        marginHorizontal: 2,
      }}
    />
  );
}

export default function ClearAllButton({ onPress, loading, color, label = "Clear All" }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={{ flexDirection: "row", alignItems: "center", minWidth: 50, justifyContent: "flex-end", paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Dot color={color} delay={0} />
          <Dot color={color} delay={150} />
          <Dot color={color} delay={300} />
        </View>
      ) : (
        <Text style={{ ...typography.label, color }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}