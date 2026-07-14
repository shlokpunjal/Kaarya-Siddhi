// Admin's Notifications page.
// - "Requests" box: tap to open app/notifications/admin-requests-list.tsx,
//   presented as a bottom sheet, which contains two sections — Connection
//   Requests (from `notifications`) and Extend Deadline Requests (read
//   directly from `extension_requests`, scoped to this admin's workspace).
// - "Other Notifications" section: placeholder for future notification types.

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

export default function AdminNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const extensionChannelRef = useRef<RealtimeChannel | null>(null);
  const [otherNotifications, setOtherNotifications] = useState<any[]>([]); // populate this once you add admin-facing notification types

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

      <ScrollView contentContainerStyle={{ padding: 20 }}>
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
              height: 40,
              width: 40,
              borderRadius: 20,
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

        {/* ---------- Room for future notification types ---------- */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Other Notifications</Text>
          </View>
          {otherNotifications.length > 0 && (
            <TouchableOpacity onPress={() => setOtherNotifications([])}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={{ ...typography.body, color: colors.text.secondary }}>
          {otherNotifications.length === 0 ? "You're all caught up." : ""}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}