// Admin's Notifications page.
// - "Requests" section: every extension request across all employees, live status,
//   synced in realtime via Supabase (new pending requests appear instantly).
// - "Other Notifications" section: placeholder for future notification types.
//
// Tapping a request opens app/notifications/admin-request-review.tsx,
// where the admin reviews details and Accepts / Rejects.

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

type ExtensionRequestRow = {
  id: string;
  task_id: string;
  requested_by: string;
  current_deadline: string;
  requested_deadline: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  admin_note: string | null;
  created_at: string;
  tasks: { title: string; priority: "low" | "medium" | "high" } | null;
};

const statusColor = (colors: any, status: string) => {
  if (status === "accepted") return colors.status.completed;
  if (status === "rejected") return colors.status.overdue;
  return colors.status.pending;
};

const priorityColor = (colors: any, priority?: string) => {
  if (priority === "high") return colors.status.overdue;
  if (priority === "medium") return colors.status.pending;
  return colors.status.completed;
};

export default function AdminNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRequests = useCallback(async () => {
    // Joins the task's title + priority via Supabase's foreign-key relation.
    // If "tasks" isn't auto-detected, replace with two separate queries.
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching extension requests:", error.message);
    } else {
      setRequests((data as ExtensionRequestRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  // Refresh whenever the screen regains focus (covers any gap while backgrounded)
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  // Realtime: new requests / status changes from any employee show up instantly
  useEffect(() => {
    const channel = supabase
      .channel("extension_requests_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extension_requests" },
        () => {
          fetchRequests();
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
  }, [fetchRequests]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

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
          {/* ---------- Requests section ---------- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.text.secondary} />
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
              Requests
            </Text>
            {pendingCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.status.pending + "22",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ ...typography.label, color: colors.status.pending }}>
                  {pendingCount} pending
                </Text>
              </View>
            )}
          </View>

          {requests.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 24 }}>
              No extension requests yet.
            </Text>
          )}

          {requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              onPress={() =>
                router.push({
                  pathname: "/notifications/admin-request-review",
                  params: { requestId: req.id },
                })
              }
              style={{
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
                boxShadow: "0px 0px 5px gray",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View
                    style={{
                      height: 8,
                      width: 8,
                      borderRadius: 4,
                      backgroundColor: priorityColor(colors, req.tasks?.priority),
                    }}
                  />
                  <Text
                    style={{ ...typography.heading3, color: colors.text.primary, flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {req.tasks?.title ?? "Untitled Task"}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: statusColor(colors, req.status) + "22",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      ...typography.label,
                      color: statusColor(colors, req.status),
                      textTransform: "capitalize",
                    }}
                  >
                    {req.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

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
      )}
    </SafeAreaView>
  );
}
