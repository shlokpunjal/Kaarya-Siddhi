import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const useAuth = () => {
    const [token, setToken] = useState<string | null>(null);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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
            const savedRole = await AsyncStorage.getItem("userRole");
            const savedWorkspaceId = await AsyncStorage.getItem("workspaceId");

            setToken(savedToken);
            setUserPhone(savedPhone);
            setUserEmail(savedEmail);
            setUserRole(savedRole);
            setWorkspaceId(savedWorkspaceId);
        } catch (error) {
            console.log("Session load error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSession = async (
        token: string,
        phone: string,
        email: string,
        role?: string,
        workspaceId?: string | null
    ) => {
        try {
            await AsyncStorage.setItem("token", token);
            await AsyncStorage.setItem("userPhone", phone);
            await AsyncStorage.setItem("userEmail", email);
            if (role) {
                await AsyncStorage.setItem("userRole", role);
            }
            if (workspaceId) {
                await AsyncStorage.setItem("workspaceId", workspaceId);
            }

            setToken(token);
            setUserPhone(phone);
            setUserEmail(email);
            if (role) setUserRole(role);
            setWorkspaceId(workspaceId ?? null);
        } catch (error) {
            console.log("Session save error:", error);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "token",
                "userPhone",
                "userEmail",
                "userRole",
                "workspaceId",
            ]);

            setToken(null);
            setUserPhone(null);
            setUserEmail(null);
            setUserRole(null);
            setWorkspaceId(null);

            router.replace("/(auth)/LoginChoice");
        } catch (error) {
            console.log("Logout error:", error);
        }
    };

    const isLoggedIn = !!token;

    return {
        token,
        userPhone,
        userEmail,
        userRole,
        workspaceId,
        isLoading,
        isLoggedIn,
        saveSession,
        logout,
    };
};