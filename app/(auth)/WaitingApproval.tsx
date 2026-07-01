import {
    StyleSheet,
    Text,
    View,
    Image,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../constants/api";

const WaitingApproval = () => {
    const { employeeEmail, adminEmail } = useLocalSearchParams();
    const [status, setStatus] = useState("pending");
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        checkStatus();
        pollRef.current = setInterval(checkStatus, 5000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const checkStatus = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/connection-status/${employeeEmail}/${adminEmail}`
            );
            const data = await response.json();

            if (data.status === "accepted") {
                if (pollRef.current) clearInterval(pollRef.current);
                router.replace("/dashboard");
            } else if (data.status === "rejected") {
                if (pollRef.current) clearInterval(pollRef.current);
                setStatus("rejected");
            }
        } catch (error) {
            console.log("Status check error:", error);
        }
    };

    const tryAgain = () => {
        router.replace({
            pathname: "/RequestAdmin",
            params: { email: employeeEmail },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.imagestyle}>
                <Image
                    source={require("../assets/images/logo.jpeg")}
                    style={styles.imageStyling}
                />
            </View>

            {status === "pending" ? (
                <>
                    <ActivityIndicator size="large" color="#1A2744" style={{ marginTop: 40 }} />
                    <Text style={styles.title}>Waiting for Approval</Text>
                    <Text style={styles.subText}>
                        We've notified {adminEmail}. This page will update automatically once they respond.
                    </Text>
                </>
            ) : (
                <>
                    <Text style={styles.rejectedTitle}>Request Rejected</Text>
                    <Text style={styles.subText}>
                        {adminEmail} did not accept your request. You can try connecting to another admin.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={tryAgain}>
                        <Text style={styles.buttonText}>Try Another Admin</Text>
                    </TouchableOpacity>
                </>
            )}
        </SafeAreaView>
    );
};

export default WaitingApproval;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
    },
    imagestyle: {
        justifyContent: "center",
        alignItems: "center",
        height: 120,
        width: 120,
        borderRadius: 120,
        backgroundColor: "#E8870A",
    },
    imageStyling: {
        height: 115,
        width: 115,
        borderRadius: 120,
    },
    title: {
        fontSize: 20,
        color: "#1A2744",
        fontFamily: "Poppins_600SemiBold",
        marginTop: 20,
    },
    rejectedTitle: {
        fontSize: 20,
        color: "#DC2626",
        fontFamily: "Poppins_600SemiBold",
        marginTop: 30,
    },
    subText: {
        fontSize: 13,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 12,
        fontFamily: "Poppins_400Regular",
        lineHeight: 20,
    },
    button: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1A2744",
        height: 50,
        width: 250,
        borderRadius: 10,
        elevation: 4,
        marginTop: 30,
    },
    buttonText: {
        color: "white",
        fontSize: 15,
        fontFamily: "Poppins_400Regular",
    },
});