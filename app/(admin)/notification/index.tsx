// app/(admin)/notification/index.tsx

import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../context/ThemeContext";
import { typography } from "../../../theme/theme";
import { supabase } from "../../../lib/supabase";

type GeneralNotification = {
  id: string;
  user_id: string;
  task_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
};

export default function AdminNotificationHome() {
  const { colors } = useTheme();
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<GeneralNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve the logged-in admin's uuid from their stored email.
  // ASSUMPTION: a `users` table with columns (id uuid, email text).
  // If you store the uuid directly in AsyncStorage instead, tell me the key
  // and this lookup goes away.
  const getAdminId = async (): Promise<string | null> => {
    const email = await AsyncStorage.getItem("userEmail");
    if (!email) return null;
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
    if (error) {
      console.error("Error resolving admin id:", error.message);
      return null;
    }
    return data?.id ?? null;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Pending extension requests -> red dot on the Requests tile
    const { count } = await supabase
      .from("extension_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingCount(count ?? 0);

    // General notifications for this admin
    const adminId = await getAdminId();
    if (adminId) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", adminId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error.message);
      } else {
        setNotifications((data as GeneralNotification[]) ?? []);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const clearAll = async () => {
    const adminId = await getAdminId();
    if (!adminId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", adminId)
      .eq("is_read", false);
    fetchAll();
  };

  const iconForType = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === "task_completed") return "checkmark-done-outline";
    if (type === "task_overdue") return "alert-circle-outline";
    if (type === "task_created") return "add-circle-outline";
    return "notifications-outline";
  };

  const openNotification = (n: GeneralNotification) => {
    // Mark as read, then jump to the related task if there is one.
    supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then();
    if (n.task_id) {
      router.push({ pathname: "/(task)/task-detail", params: { taskId: n.task_id } });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={26}
          color={colors.brand.onPrimary}
        />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: 15 }}>
          Notifications
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Requests tile */}
          <TouchableOpacity
            onPress={() => router.push("/(admin)/notification/requests")}
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons name="mail-outline" size={22} color={colors.brand.accent} />
            <Text style={{ ...typography.heading3, color: colors.text.primary, flex: 1 }}>
              Requests
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />

            {pendingCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  height: 14,
                  width: 14,
                  borderRadius: 7,
                  backgroundColor: colors.status.overdue,
                  borderWidth: 2,
                  borderColor: colors.base.background,
                }}
              />
            )}
          </TouchableOpacity>

          {/* General notifications header + Clear All */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 28,
              marginBottom: 12,
            }}
          >
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              General Notifications
            </Text>
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={clearAll}
                style={{
                  borderColor: colors.base.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ ...typography.label, color: colors.text.secondary }}>
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {notifications.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary }}>
              No notifications yet.
            </Text>
          )}

          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              onPress={() => openNotification(n)}
              style={{
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                opacity: n.is_read ? 0.6 : 1,
              }}
            >
              <Ionicons name={iconForType(n.type)} size={20} color={colors.brand.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>
                  {n.message}
                </Text>
                <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              {!n.is_read && (
                <View
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: 4,
                    backgroundColor: colors.status.overdue,
                    marginTop: 4,
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}