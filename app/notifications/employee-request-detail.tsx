// Read-only view of a single extension request, including admin's decision + note.
// Realtime-synced: updates live the moment the admin accepts/rejects.

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const statusMeta = (colors: any, status: string) => {
  if (status === "accepted")
    return { color: colors.status.completed, label: "Accepted", icon: "checkmark-circle-outline" as const };
  if (status === "rejected")
    return { color: colors.status.overdue, label: "Rejected", icon: "close-circle-outline" as const };
  return { color: colors.status.pending, label: "Pending", icon: "time-outline" as const };
};

export default function EmployeeRequestDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRequest = async () => {
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority, deadline)")
      .eq("id", requestId)
      .single();
    if (error) console.error("Error fetching request:", error);
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    fetchRequest();

    const channel = supabase
      .channel(`extension_request_${requestId}_employee`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extension_requests",
          filter: `id=eq.${requestId}`,
        },
        () => {
          fetchRequest();
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
  }, [requestId]);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.base.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
        <Text style={{ ...typography.body, color: colors.text.primary, margin: 20 }}>
          Request not found
        </Text>
      </SafeAreaView>
    );
  }

  const meta = statusMeta(colors, request.status);

  const Row = ({
    icon,
    label,
    value,
    valueColor,
  }: {
    icon: any;
    label: string;
    value: string;
    valueColor?: string;
  }) => (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
      <Ionicons name={icon} size={18} color={colors.text.secondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.label, color: colors.text.secondary }}>{label}</Text>
        <Text style={{ ...typography.body, color: valueColor ?? colors.text.primary, marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
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
          color={colors.brand.onPrimary}
        />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: 15 }}>
          Request Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 40 }}>
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
          }}
        >
          {/* Task name + status badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <Text style={{ ...typography.heading, color: colors.text.primary, flex: 1, marginRight: 10 }}>
              {request.tasks?.title ?? "Untitled Task"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: meta.color + "22",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Ionicons name={meta.icon} size={13} color={meta.color} />
              <Text style={{ ...typography.label, color: meta.color, textTransform: "capitalize" }}>
                {meta.label}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 18 }} />

          <Row
            icon="calendar-outline"
            label="Current Deadline"
            value={new Date(request.current_deadline).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          />
          <Row
            icon="calendar"
            label="Requested Deadline"
            value={new Date(request.requested_deadline).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            valueColor={colors.brand.accent}
          />
          <Row icon="chatbox-ellipses-outline" label="Your Reason" value={request.reason} />

          {/* Admin decision box — only shown once decided */}
          {request.status !== "pending" && (
            <>
              <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 18 }} />
              <View
                style={{
                  backgroundColor: meta.color + "11",
                  borderColor: meta.color + "44",
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                  <Text style={{ ...typography.heading3, color: meta.color }}>
                    Admin {meta.label} this request
                  </Text>
                </View>

                {request.admin_note ? (
                  <Text style={{ ...typography.body, color: colors.text.primary }}>
                    {request.admin_note}
                  </Text>
                ) : (
                  <Text style={{ ...typography.body, color: colors.text.secondary }}>
                    No additional note left by admin.
                  </Text>
                )}

                {request.decided_at && (
                  <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 8 }}>
                    Decided on{" "}
                    {new Date(request.decided_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Still pending notice */}
          {request.status === "pending" && (
            <>
              <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 18 }} />
              <View
                style={{
                  backgroundColor: colors.status.pending + "11",
                  borderColor: colors.status.pending + "44",
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons name="time-outline" size={20} color={colors.status.pending} />
                <Text style={{ ...typography.body, color: colors.status.pending, flex: 1 }}>
                  Awaiting admin response.
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            height: 50,
            borderRadius: 12,
            backgroundColor: colors.brand.secprimary,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ ...typography.subheading, color: colors.brand.onPrimary }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
