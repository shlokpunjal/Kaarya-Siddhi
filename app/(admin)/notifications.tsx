// app/(admin)/notifications.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { API_BASE_URL } from "../../constants/api";

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

type ConnectionRequestRow = {
  id: string;
  employee_email: string;
  admin_email: string;
  status: string;
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
  const { userEmail } = useAuth();
  

  const [requests, setRequests] = useState<ExtensionRequestRow[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequestRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching extension requests:", error.message);
    } else {
      setRequests((data as ExtensionRequestRow[]) ?? []);
    }

    if (userEmail) {
      console.log("Fetching connection requests for:", userEmail);
      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/pending/${encodeURIComponent(userEmail)}`,
        );
        const json = await response.json();
        console.log("Connection requests response:", json);
        setConnectionRequests(json.requests ?? []);
      } catch (err) {
        console.error("Error fetching connection requests:", err);
      }
    } else {
      console.log("userEmail is missing, skipping connection request fetch");
    }

    setLoading(false);
  }, [userEmail]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests]),
  );

  const respondToConnection = async (
    employeeEmail: string,
    accept: boolean,
  ) => {
    if (!userEmail) return;
    setRespondingTo(employeeEmail);

    try {
      const response = await fetch(`${API_BASE_URL}/connection-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_email: employeeEmail,
          admin_email: userEmail,
          accept,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Could not respond",
          data.detail || "Something went wrong.",
        );
        return;
      }

      setConnectionRequests((prev) =>
        prev.filter((req) => req.employee_email !== employeeEmail),
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setRespondingTo(null);
    }
  };

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
          style={{
            ...typography.heading,
            color: colors.base.surfaceL1,
            marginLeft: 15,
          }}
        >
          Notifications
        </Text>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Connection Requests section */}
          {connectionRequests.length > 0 && (
            <>
              <Text
                style={{
                  ...typography.heading3,
                  color: colors.text.primary,
                  marginBottom: 12,
                }}
              >
                Connection Requests
              </Text>

              {connectionRequests.map((req) => (
                <View
                  key={req.id}
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
                  <Text
                    style={{
                      ...typography.heading3,
                      color: colors.text.primary,
                    }}
                  >
                    {req.employee_email}
                  </Text>
                  <Text
                    style={{
                      ...typography.body,
                      color: colors.text.secondary,
                      marginTop: 4,
                    }}
                  >
                    wants to connect to your workspace.
                  </Text>

                  <View
                    style={{ flexDirection: "row", gap: 12, marginTop: 16 }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        respondToConnection(req.employee_email, true)
                      }
                      disabled={respondingTo === req.employee_email}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.status.completed,
                        opacity: respondingTo === req.employee_email ? 0.7 : 1,
                      }}
                    >
                      {respondingTo === req.employee_email ? (
                        <ActivityIndicator color={colors.base.surfaceL1} />
                      ) : (
                        <Text
                          style={{
                            ...typography.body,
                            color: colors.base.surfaceL1,
                          }}
                        >
                          Accept
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        respondToConnection(req.employee_email, false)
                      }
                      disabled={respondingTo === req.employee_email}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.status.overdue,
                        opacity: respondingTo === req.employee_email ? 0.7 : 1,
                      }}
                    >
                      <Text
                        style={{
                          ...typography.body,
                          color: colors.base.surfaceL1,
                        }}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Extension Requests section (existing, untouched) */}
          {requests.length === 0 && connectionRequests.length === 0 && (
            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                marginTop: 20,
              }}
            >
              No notifications yet.
            </Text>
          )}

          {requests.length > 0 && (
            <Text
              style={{
                ...typography.heading3,
                color: colors.text.primary,
                marginTop: 8,
                marginBottom: 12,
              }}
            >
              Extension Requests
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
                      backgroundColor: priorityColor(
                        colors,
                        req.tasks?.priority,
                      ),
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
