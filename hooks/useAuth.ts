// import { useState, useEffect } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { router } from "expo-router";

// export const useAuth = () => {
//     const [token, setToken] = useState<string | null>(null);
//     const [userPhone, setUserPhone] = useState<string | null>(null);
//     const [userEmail, setUserEmail] = useState<string | null>(null);
//     const [userRole, setUserRole] = useState<string | null>(null);
//     const [workspaceId, setWorkspaceId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);

//     // Load saved session on mount
//     useEffect(() => {
//         loadSession();
//     }, []);

//     const loadSession = async () => {
//         try {
//             const savedToken = await AsyncStorage.getItem("token");
//             const savedPhone = await AsyncStorage.getItem("userPhone");
//             const savedEmail = await AsyncStorage.getItem("userEmail");
//             const savedRole = await AsyncStorage.getItem("userRole");
//             const savedWorkspaceId = await AsyncStorage.getItem("workspaceId");

//             setToken(savedToken);
//             setUserPhone(savedPhone);
//             setUserEmail(savedEmail);
//             setUserRole(savedRole);
//             setWorkspaceId(savedWorkspaceId);
//         } catch (error) {
//             console.log("Session load error:", error);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const saveSession = async (
//         token: string,
//         phone: string,
//         email: string,
//         role?: string,
//         workspaceId?: string | null
//     ) => {
//         try {
//             await AsyncStorage.setItem("token", token);
//             await AsyncStorage.setItem("userPhone", phone);
//             await AsyncStorage.setItem("userEmail", email);
//             if (role) {
//                 await AsyncStorage.setItem("userRole", role);
//             }
//             if (workspaceId) {
//                 await AsyncStorage.setItem("workspaceId", workspaceId);
//             }

//             setToken(token);
//             setUserPhone(phone);
//             setUserEmail(email);
//             if (role) setUserRole(role);
//             setWorkspaceId(workspaceId ?? null);
//         } catch (error) {
//             console.log("Session save error:", error);
//         }
//     };

//     const logout = async () => {
//         try {
//             await AsyncStorage.multiRemove([
//                 "token",
//                 "userPhone",
//                 "userEmail",
//                 "userRole",
//                 "workspaceId",
//             ]);

//             setToken(null);
//             setUserPhone(null);
//             setUserEmail(null);
//             setUserRole(null);
//             setWorkspaceId(null);

//             router.replace("/(auth)/LoginChoice");
//         } catch (error) {
//             console.log("Logout error:", error);
//         }
//     };

//     const isLoggedIn = !!token;

//     return {
//         token,
//         userPhone,
//         userEmail,
//         userRole,
//         workspaceId,
//         isLoading,
//         isLoggedIn,
//         saveSession,
//         logout,
//     };
// };


import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { authFetch } from "../utils/authFetch";

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
            // const token = await SecureStore.getItemAsync("accessToken");
            // console.log("Access Token:", token);

            // const refreshToken = await SecureStore.getItemAsync("refreshToken");
            // console.log("Refresh Token:", refreshToken);
            
            const savedToken = await SecureStore.getItemAsync("token");
            console.log("Saved Token:", savedToken);
            const savedPhone = await AsyncStorage.getItem("userPhone");
            const savedEmail = await AsyncStorage.getItem("userEmail");
            const savedRole = await AsyncStorage.getItem("userRole");
            const savedWorkspaceId = await AsyncStorage.getItem("workspaceId");

            // No cached token — nothing to validate, just a logged-out state
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            // Re-validate the token against the backend before trusting it.
            // authFetch already wipes storage + redirects to LoginChoice on a 401,
            // so we don't need to duplicate that logic here.
            console.log("Saved Token:", savedToken);
            // const res = await authFetch("/me");

            // if (!res.ok) {
            //     setIsLoading(false);
            //     return;
            // }

            // setToken(savedToken);
            // setUserPhone(savedPhone);
            // setUserEmail(savedEmail);
            // setUserRole(savedRole);
            // setWorkspaceId(savedWorkspaceId);
            console.log("Saved Token:", savedToken);

            const res = await authFetch("/me");

            console.log("/me Status:", res.status);

            if (res.ok) {
                const user = await res.json();
                console.log("/me Response:", user);
            } else {
                console.log("/me Failed");
                setIsLoading(false);
                return;
            }

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
            await SecureStore.setItemAsync("token", token);
            const stored = await SecureStore.getItemAsync("token");
            console.log("Stored Token:", stored);
            
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
            await SecureStore.deleteItemAsync("token");
            await AsyncStorage.multiRemove([
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