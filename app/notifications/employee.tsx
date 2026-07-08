// app/notifications/employee.tsx
//
// Employee's Notifications page.
// - "Requests" box: tap to open the full list of the employee's own extension
//   requests (app/notifications/employee-requests-list.tsx), presented as a
//   bottom sheet. Shows a live pending-count badge.
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

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Resolve the logged-in user's id the same way the dashboards do:
  // email in AsyncStorage -> lookup against the `users` table.
  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) return;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.error("Could not resolve user id for email:", email);
        return;
      }
      setUserId(data.id);
    })();
  }, []);

  const fetchPendingCount = useCallback(async (id: string) => {
    const { count, error } = await supabase
      .from("extension_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching pending count:", error.message);
    } else {
      setPendingCount(count ?? 0);
    }
  }, []);

  // Refresh whenever the screen regains focus (covers time spent on the list screen)
  useFocusEffect(
    useCallback(() => {
      if (userId) fetchPendingCount(userId);
    }, [userId, fetchPendingCount])
  );

  // Realtime: keep the badge accurate without needing to refocus
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`extension_requests_employee_badge_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extension_requests",
          filter: `requested_by=eq.${userId}`,
        },
        () => {
          fetchPendingCount(userId);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchPendingCount]);

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
          onPress={() => router.push("/notifications/employee-requests-list")}
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
              backgroundColor: colors.brand.primary + "22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="mail-outline" size={20} color={colors.brand.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>Requests</Text>
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 2 }}>
              Your extension requests
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            marginBottom: 12,
          }}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Other Notifications
          </Text>
        </View>
        <Text style={{ ...typography.body, color: colors.text.secondary }}>
          You're all caught up.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
