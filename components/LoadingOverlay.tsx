import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  Easing,
} from "react-native";
import TrainLoadingAnimation from "./TrainLoadingAnimation";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = "Loading...",
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(scale, {
          toValue: 0.96,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.overlay,
          {
            opacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={styles.title}>{message}</Text>

          <View style={{ width: "100%", marginTop: 18 }}>
            <TrainLoadingAnimation active={visible} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default LoadingOverlay;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.42)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  card: {
    width: "100%",
    maxWidth: 340,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    paddingHorizontal: 24,
    paddingVertical: 24,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A2744",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});