import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const useAuth = () => {
    const [token, setToken] = useState<string | null>(null);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved session on mount
    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const savedToken = await AsyncStorage.getItem("token");
            const savedPhone = await AsyncStorage.getItem("userPhone");
            const savedEmail = await AsyncStorage.getItem("userEmail");

            setToken(savedToken);
            setUserPhone(savedPhone);
            setUserEmail(savedEmail);
        } catch (error) {
            console.log("Session load error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSession = async (token: string, phone: string, email: string) => {
        try {
            await AsyncStorage.setItem("token", token);
            await AsyncStorage.setItem("userPhone", phone);
            await AsyncStorage.setItem("userEmail", email);

            setToken(token);
            setUserPhone(phone);
            setUserEmail(email);
        } catch (error) {
            console.log("Session save error:", error);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("userPhone");
            await AsyncStorage.removeItem("userEmail");

            setToken(null);
            setUserPhone(null);
            setUserEmail(null);

            router.replace("/LoginChoice");
        } catch (error) {
            console.log("Logout error:", error);
        }
    };

    const isLoggedIn = !!token;

    return {
        token,
        userPhone,
        userEmail,
        isLoading,
        isLoggedIn,
        saveSession,
        logout,
    };
};