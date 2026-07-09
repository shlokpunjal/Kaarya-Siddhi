// app/notifications/employee.tsx
//
// Employee's Notifications page.
// - No separate "Requests" list — the employee doesn't need to check pending
//   status here, since the task-detail page already shows the Extend Deadline
//   button dimmed while a request is pending.
// - "Other Notifications" shows only DECIDED (accepted/rejected) extension
//   requests, so the employee finds out once the admin has responded.
//   Tapping a card opens employee-request-detail.tsx. Has its own Clear All,
//   which just dismisses locally (AsyncStorage) — doesn't delete real data.

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

type ExtensionNotification = {
  id: string;
  status: "accepted" | "rejected";
  admin_note: string | null;
  decided_at: string | null;
  tasks: { title: string } | null;
};

const clearedKey = (userId: string) => `employeeNotifsCleared_${userId}`;

const statusMeta = (colors: any, status: string) =>
  status === "accepted"
    ? { color: colors.status.completed, icon: "checkmark-circle-outline" as const, verb: "accepted" }
    : { color: colors.status.overdue, icon: "close-circle-outline" as const, verb: "rejected" };

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ExtensionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;
      const { data, error } = await supabase.from("users").select("id").eq("email", email).single();
      if (error || !data) {
        console.error("Could not resolve user id for email:", email);
        return;
      }
      setUserId(data.id);
    })();
  }, []);

  const fetchNotifications = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("extension_requests")
      .select("id, status, admin_note, decided_at, tasks(title)")
      .eq("requested_by", id)
      .neq("status", "pending")
      .order("decided_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error.message);
      setLoading(false);
      return;
    }

    const raw = await AsyncStorage.getItem(clearedKey(id));
    const cleared: string[] = raw ? JSON.parse(raw) : [];
    setNotifications(((data as any[]) ?? []).filter((n) => !cleared.includes(n.id)));
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
      .channel(`extension_requests_employee_notifs_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extension_requests", filter: `requested_by=eq.${userId}` },
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
    if (!userId) return;
    const raw = await AsyncStorage.getItem(clearedKey(userId));
    const existing: string[] = raw ? JSON.parse(raw) : [];
    const updated = Array.from(new Set([...existing, ...notifications.map((n) => n.id)]));
    await AsyncStorage.setItem(clearedKey(userId), JSON.stringify(updated));
    setNotifications([]);
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
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Other Notifications</Text>
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
          const meta = statusMeta(colors, n.status);
          return (
            <TouchableOpacity
              key={n.id}
              onPress={() =>
                router.push({ pathname: "/notifications/employee-request-detail", params: { requestId: n.id } })
              }
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
                <Text style={{ ...typography.heading3, color: colors.text.primary }}>
                  {n.tasks?.title ?? "Untitled Task"}
                </Text>
                <Text style={{ ...typography.label, color: meta.color, marginTop: 2 }}>
                  Your extension request was {meta.verb}
                </Text>
                {n.decided_at && (
                  <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                    {new Date(n.decided_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}