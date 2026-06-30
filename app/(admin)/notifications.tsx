// app/(admin)/notifications.tsx

import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
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

export default function Notifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
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

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

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
          color={colors.base.surfaceL1}
        />
        <Text style={{ ...typography.heading, color: colors.base.surfaceL1, marginLeft: 15 }}>
          Notifications
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {requests.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 20 }}>
              No extension requests yet.
            </Text>
          )}

          {requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/notification-detail",
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
