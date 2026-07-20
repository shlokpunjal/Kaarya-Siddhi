// components/OfflineScreen.tsx
//
// Drop-in "no internet" screen for Kaarya Siddhi.
// Wrap your app root (e.g. in app/_layout.tsx) so it replaces the
// normal content whenever the device has no internet connection.

import React, { useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import TrainRunnerGame from "./TrainRunnerGame";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { typography } from "../theme/theme";

const MIN_CHECK_DURATION_MS = 700; // avoid an instant flash on fast checks

export default function OfflineScreen({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isConnected, checkNow } = useNetworkStatus();
    //   const forcedIsConnected = false; // testing
    const [isChecking, setIsChecking] = useState(false);
    const spin = useRef(new Animated.Value(0)).current;

    const handleRetry = async () => {
        if (isChecking) return;
        setIsChecking(true);

        spin.setValue(0);
        Animated.loop(
            Animated.timing(spin, {
                toValue: 1,
                duration: 700,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        const startedAt = Date.now();
        await checkNow();
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(MIN_CHECK_DURATION_MS - elapsed, 0);

        setTimeout(() => {
            setIsChecking(false);
        }, remaining);
    };

    if (isConnected) {
        return <>{children}</>;
    }

    //testing
    //   if (forcedIsConnected ) {
    //     return <>{children}</>;
    //   }

    if (isChecking) {
        const rotate = spin.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
        });

        return (
            <View style={styles.container}>
                {/* <SkeletonScreen /> */}
                <View style={styles.checkingRow}>
                    <Animated.Text style={[styles.spinnerIcon, { transform: [{ rotate }] }]}>
                        ⟳
                    </Animated.Text>
                    <Text style={styles.checkingText}>Checking connection…</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TrainRunnerGame />
            <Text style={[styles.subtitle, typography.body]}>
                Kaarya Siddhi will reconnect automatically once you're back online.
            </Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryIcon}>⟳</Text>
                <Text style={[styles.retryText, typography.body]}>Retry Now</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#ffffff",
    },
    subtitle: {
        marginTop: 6,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
    },
    retryButton: {
        marginTop: 18,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    retryIcon: {
        fontSize: 16,
        marginRight: 6,
        color: "#444",
    },
    retryText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#444",
    },
    checkingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
    },
    spinnerIcon: {
        fontSize: 16,
        marginRight: 8,
        color: "#666",
    },
    checkingText: {
        fontSize: 13,
        color: "#666",
    },
});

/*
USAGE — in app/_layout.tsx (Expo Router root layout):
 
import OfflineScreen from "../components/OfflineScreen";
 
export default function RootLayout() {
  return (
    <OfflineScreen>
      <Stack>
        ... your existing screens
      </Stack>
    </OfflineScreen>
  );
}
 
The screen still auto-recovers on its own via the NetInfo listener.
"Retry Now" is for someone who doesn't want to wait — it forces an
active NetInfo.fetch() probe, shows a skeleton screen for a beat, then
either your real app renders (if back online) or it falls back to the
game screen (if still offline).
*/