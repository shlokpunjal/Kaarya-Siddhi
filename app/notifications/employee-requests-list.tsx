// app/notifications/employee-requests-list.tsx
//
// Full list of the employee's own extension requests. Opened as a bottom
// sheet from the "Requests" box on app/notifications/employee.tsx.
// Tapping a request opens app/notifications/employee-request-detail.tsx.

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  decided_at: string | null;
  tasks: { title: string; priority: "low" | "medium" | "high" } | null;
};

const statusMeta = (colors: any, status: string) => {
  if (status === "accepted")
    return { color: colors.status.completed, icon: "checkmark-circle-outline" as const };
  if (status === "rejected")
    return { color: colors.status.overdue, icon: "close-circle-outline" as const };
  return { color: colors.status.pending, icon: "time-outline" as const };
};

const priorityColor = (colors: any, priority?: string) => {
  if (priority === "high") return colors.status.overdue;
  if (priority === "medium") return colors.status.pending;
  return colors.status.completed;
};

export default function EmployeeRequestsList() {
  const { colors } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.error("Could not resolve user id for email:", email);
        setLoading(false);
        return;
      }
      setUserId(data.id);
    })();
  }, []);

  const fetchRequests = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority)")
      .eq("requested_by", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching employee requests:", error.message);
    } else {
      setRequests((data as ExtensionRequestRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) fetchRequests(userId);
    }, [userId, fetchRequests])
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`extension_requests_employee_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extension_requests",
          filter: `requested_by=eq.${userId}`,
        },
        () => {
          fetchRequests(userId);
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
  }, [userId, fetchRequests]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.base.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
      }}
    >
      {/* Drag handle */}
      <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.base.border,
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
          <Text style={{ ...typography.heading, color: colors.text.primary }}>
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

        <Ionicons
          onPress={() => router.back()}
          name="close"
          size={24}
          color={colors.text.secondary}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
          {requests.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary }}>
              You haven't made any extension requests yet.
            </Text>
          )}

          {requests.map((req) => {
            const meta = statusMeta(colors, req.status);
            return (
              <TouchableOpacity
                key={req.id}
                onPress={() =>
                  router.push({
                    pathname: "/notifications/employee-request-detail",
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
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: meta.color + "22",
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Ionicons name={meta.icon} size={13} color={meta.color} />
                    <Text
                      style={{
                        ...typography.label,
                        color: meta.color,
                        textTransform: "capitalize",
                      }}
                    >
                      {req.status}
                    </Text>
                  </View>
                </View>

                <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 8 }}>
                  Requested:{" "}
                  {new Date(req.requested_deadline).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
