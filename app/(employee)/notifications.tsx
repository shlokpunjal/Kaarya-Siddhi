// app/(employee)/notifications.tsx
// Shows the current employee's own extension requests and their status.
// Bell badge on index.tsx counts requests where admin has decided (accepted/rejected).

import React, { useState, useCallback } from "react";
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

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    // Get current logged-in user's id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority)")
      .eq("requested_by", user.id)
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
        <Text
          style={{ ...typography.heading, color: colors.base.surfaceL1, marginLeft: 15 }}
        >
          My Requests
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {requests.length === 0 && (
            <Text
              style={{ ...typography.body, color: colors.text.secondary, marginTop: 20 }}
            >
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
                    pathname: "/(employee)/notification-detail",
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
                  {/* Priority dot + task title */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        width: 8,
                        borderRadius: 4,
                        backgroundColor: priorityColor(colors, req.tasks?.priority),
                      }}
                    />
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {req.tasks?.title ?? "Untitled Task"}
                    </Text>
                  </View>

                  {/* Status pill */}
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

                {/* Requested deadline sub-line */}
                <Text
                  style={{
                    ...typography.label,
                    color: colors.text.secondary,
                    marginTop: 8,
                  }}
                >
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
