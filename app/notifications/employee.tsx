// app/notifications/employee.tsx
//
// Reads DECIDED notifications only (connection_accepted/rejected,
// extension_accepted/rejected, task_assigned) — pending items never appear
// here since the employee already sees pending status on the task-detail
// screen itself. Clear All performs a real delete from the notifications
// table. Must stay in sync with the bell-badge query in (employee)/index.tsx.

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

type NotifRow = {
  id: string;
  type:
    | "connection_accepted"
    | "connection_rejected"
    | "extension_accepted"
    | "extension_rejected"
    | "task_assigned";
  message: string;
  created_at: string;
  metadata: any;
  task_id: string | null;
};

const notifMeta = (colors: any, type: NotifRow["type"]) => {
  if (type === "connection_accepted" || type === "extension_accepted")
    return { color: colors.status.completed, icon: "checkmark-circle-outline" as const };
  if (type === "task_assigned")
    return { color: colors.brand.accent, icon: "briefcase-outline" as const };
  return { color: colors.status.overdue, icon: "close-circle-outline" as const };
};

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;
      const { data } = await supabase.from("users").select("id").eq("email", email).single();
      if (data) setUserId(data.id);
    })();
  }, []);

  const fetchNotifications = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, message, created_at, metadata, task_id")
      .eq("user_id", id)
      .in("type", [
        "connection_accepted",
        "connection_rejected",
        "extension_accepted",
        "extension_rejected",
        "task_assigned",
      ])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error.message);
      setLoading(false);
      return;
    }
    setNotifications((data as NotifRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) fetchNotifications(userId);
    }, [userId, fetchNotifications])
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`employee_notifs_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchNotifications(userId)
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchNotifications]);

  const clearAll = async () => {
    if (!userId || notifications.length === 0) return;
    const ids = notifications.map((n) => n.id);
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (error) {
      console.error("Failed to clear notifications:", error.message);
      return;
    }
    setNotifications([]);
  };

  const handlePress = (n: NotifRow) => {
    if (n.type === "extension_accepted" || n.type === "extension_rejected") {
      router.push({
        pathname: "/notifications/employee-request-detail",
        params: { requestId: n.metadata?.extension_request_id },
      });
    } else if (n.type === "task_assigned") {
      router.push({
        pathname: "/(task)/task-detail",
        params: { taskId: n.task_id ?? n.metadata?.taskId },
      });
    }
    // Connection notifications have no dedicated detail screen — just informational.
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons onPress={() => router.back()} name="arrow-back" size={26} color={colors.brand.onPrimary} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: 15 }}>
          Notifications
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Notifications</Text>
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {!loading && notifications.length === 0 && (
          <Text style={{ ...typography.body, color: colors.text.secondary }}>You're all caught up.</Text>
        )}

        {notifications.map((n) => {
          const meta = notifMeta(colors, n.type);
          const isExtension = n.type.startsWith("extension");
          const isTappable = isExtension || n.type === "task_assigned";
          return (
            <TouchableOpacity
              key={n.id}
              onPress={() => handlePress(n)}
              disabled={!isTappable}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                gap: 12,
              }}
            >
              <Ionicons name={meta.icon} size={20} color={meta.color} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>{n.message}</Text>
                <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}