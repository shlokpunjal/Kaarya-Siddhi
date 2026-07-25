import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { moderateScale } from "../../utils/responsive";
import EmployeeNotificationsSkeleton from '../../components/EmployeeNotificationSkeleton';
import { authFetch } from "../../utils/authFetch";

type NotifRow = {
  id: string;
  type:
  | "connection_accepted" | "connection_rejected"
  | "extension_accepted" | "extension_rejected"
  | "task_assigned" | "task_in_review";
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

function getFreshChannel(name: string) {
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authFetch("/me");
      if (res.ok) {
        const data = await res.json();
        setUserId(data.id);
      }
    })();
  }, []);

  const fetchNotifications = useCallback(async (id: string) => {
    setLoading(true);
    const types = "connection_accepted,connection_rejected,extension_accepted,extension_rejected,task_assigned,task_in_review";
    const res = await authFetch(`/notifications?types=${types}`);

    if (!res.ok) {
      console.error("Error fetching notifications:", res.status);
      setLoading(false);
      return;
    }
    const data = await res.json();
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
    const channel = getFreshChannel(`employee_notifs_${userId}`)
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
    const ids = notifications.map((n) => n.id).join(",");
    const res = await authFetch(`/notifications?ids=${ids}`, { method: "DELETE" });
    if (!res.ok) {
      console.error("Failed to clear notifications:", res.status);
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

  if (loading && notifications.length === 0) {
    return <EmployeeNotificationsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(60),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons onPress={() => router.back()} name="arrow-back" size={moderateScale(26)} color={colors.brand.onPrimary} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: moderateScale(15) }}>
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {!loading && notifications.length === 0 && (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              transform: [{ translateY: -40 }], // Move it up
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: 'rgba(0, 0, 0, 0.08)', // subtle circle behind icon
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="notifications-outline" size={32} color={colors.text.secondary} />
            </View>

            <Text
              style={{
                ...typography.subheading, // or a bold/medium variant
                color: colors.text.primary,
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              You're all caught up
            </Text>

            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
            >
              New notifications will show up here.
            </Text>
          </View>
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