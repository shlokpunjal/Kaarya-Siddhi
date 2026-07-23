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
import { moderateScale } from "../../utils/responsive";
import AdminNotificationsSkeleton from '../../components/AdminNotificationSkeleton';


export default function AdminNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const extensionChannelRef = useRef<RealtimeChannel | null>(null);
  type OtherNotif = {
    id: string;
    type: string;
    message: string;
    created_at: string;
  };

  const [otherNotifications, setOtherNotifications] = useState<OtherNotif[]>([]);
  const otherChannelRef = useRef<RealtimeChannel | null>(null);

  const fetchOtherNotifications = useCallback(async () => {
    const email = await AsyncStorage.getItem("userEmail");
    if (!email) return;
    const { data: userRow } = await supabase.from("users").select("id").eq("email", email).single();
    if (!userRow) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, message, created_at")
      .eq("user_id", userRow.id)
      .in("type", ["task_assigned_confirmation"])
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching other notifications:", error.message);
    setOtherNotifications((data as OtherNotif[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { fetchOtherNotifications(); }, [fetchOtherNotifications]));

  useEffect(() => {
    if (!adminUserId) return;
    const channel = supabase
      .channel(`admin_other_notifs_${adminUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${adminUserId}` },
        () => fetchOtherNotifications()
      )
      .subscribe();
    otherChannelRef.current = channel;
    return () => {
      if (otherChannelRef.current) {
        supabase.removeChannel(otherChannelRef.current);
        otherChannelRef.current = null;
      }
    };
  }, [adminUserId, fetchOtherNotifications]);

  const clearOtherNotifications = async () => {
    if (otherNotifications.length === 0) return;
    const ids = otherNotifications.map((n) => n.id);
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (error) {
      console.error("Failed to clear notifications:", error.message);
      return;
    }
    setOtherNotifications([]);
  };

  // Resolve the logged-in admin's id + workspace: email in AsyncStorage ->
  // lookup against the `users` table.
  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, workspace_id")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.error("Could not resolve admin user for email:", email);
        return;
      }
      setAdminUserId(data.id);
      setWorkspaceId(data.workspace_id);
    })();
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const email = await AsyncStorage.getItem("userEmail");
    if (!email) return;
    const { data: userRow } = await supabase
      .from("users")
      .select("id, workspace_id")
      .eq("email", email)
      .single();
    if (!userRow) return;

    const { count: connCount, error: connError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userRow.id)
      .eq("type", "connection_request");

    if (connError) console.error("Error fetching connection count:", connError.message);

    const { count: extCount, error: extError } = await supabase
      .from("extension_requests")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", userRow.workspace_id)
      .eq("status", "pending");

    if (extError) console.error("Error fetching extension count:", extError.message);

    setPendingCount((connCount ?? 0) + (extCount ?? 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [fetchPendingCount])
  );

  // Realtime: keep the badge accurate — connection requests via notifications,
  // scoped to this admin's own user id.
  useEffect(() => {
    if (!adminUserId) return;

    const channel = supabase
      .channel(`notifications_admin_badge_${adminUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${adminUserId}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    notifChannelRef.current = channel;

    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [adminUserId, fetchPendingCount]);

  // Realtime: extension requests via extension_requests, scoped to workspace.
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`extension_requests_admin_badge_${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extension_requests",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    extensionChannelRef.current = channel;

    return () => {
      if (extensionChannelRef.current) {
        supabase.removeChannel(extensionChannelRef.current);
        extensionChannelRef.current = null;
      }
    };
  }, [workspaceId, fetchPendingCount]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchPendingCount(), fetchOtherNotifications()]);
      setPageLoading(false);
    })();
  }, []);

  if (pageLoading) {
    return <AdminNotificationsSkeleton />;
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(60),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={moderateScale(26)}
          color={colors.brand.onPrimary}
        />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: 15 }}>
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
        }}
      >
        {/* ---------- Requests box ---------- */}
        <TouchableOpacity
          onPress={() => router.push("/notifications/admin-requests-list")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: moderateScale(40),
              width: moderateScale(40),
              borderRadius: moderateScale(20),
              backgroundColor: colors.brand.onPrimary + "22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="mail" size={20} color={colors.brand.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>Requests</Text>
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 2 }}>
              Connection & extend deadline requests
            </Text>
          </View>

          {pendingCount > 0 && (
            <View
              style={{
                backgroundColor: colors.status.pending + "22",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginRight: 10,
              }}
            >
              <Text style={{ ...typography.label, color: colors.status.pending }}>
                {pendingCount} pending
              </Text>
            </View>
          )}

          <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* ---------- Other Notifications ---------- */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Other Notifications</Text>
          </View>
          {otherNotifications.length > 0 && (
            <TouchableOpacity onPress={clearOtherNotifications}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {otherNotifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 32,
              marginTop: -35, // adjust if needed
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
        ) : (
          otherNotifications.map((n) => (
            <View
              key={n.id}
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
              <Ionicons name="briefcase-outline" size={20} color={colors.brand.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>{n.message}</Text>
                <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}