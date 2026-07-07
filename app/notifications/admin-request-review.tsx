// app/notifications/admin-request-review.tsx
//
// Admin's review screen for a single extension request.
// Visually styled like the employee's Extend Deadline form (task name, deadline
// boxes, reason box) but repurposed for the admin: everything is read-only,
// and if the request is still pending, Accept / Reject actions appear at the
// bottom (with an optional note, confirmed via a modal).
//
// Realtime-synced: if the request gets decided from another device/session
// while this screen is open, the UI updates live.

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
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
    return { color: colors.status.completed, icon: "checkmark-circle-outline" as const, label: "Accepted" };
  if (status === "rejected")
    return { color: colors.status.overdue, icon: "close-circle-outline" as const, label: "Rejected" };
  return { color: colors.status.pending, icon: "time-outline" as const, label: "Pending" };
};

export default function AdminRequestReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRequest = async () => {
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority, assigned_to, deadline)")
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
      .channel(`extension_request_${requestId}`)
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

  const openConfirm = (decision: "accepted" | "rejected") => {
    setPendingDecision(decision);
    setAdminNote("");
    setModalVisible(true);
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    setDeciding(true);

    const { error } = await supabase
      .from("extension_requests")
      .update({
        status: pendingDecision,
        admin_note: adminNote.trim() || null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    // If accepted, also push the new deadline onto the task itself.
    if (!error && pendingDecision === "accepted") {
      await supabase
        .from("tasks")
        .update({ deadline: request.requested_deadline })
        .eq("id", request.task_id);
    }

    setDeciding(false);
    setModalVisible(false);

    if (error) {
      Alert.alert("Could not update", error.message);
      return;
    }

    Alert.alert(
      pendingDecision === "accepted" ? "Request accepted" : "Request rejected",
      "The employee will be notified.",
      [{ text: "OK", onPress: () => router.back() }]
    );
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
          color={colors.brand.onPrimary ?? colors.base.surfaceL1}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary ?? colors.base.surfaceL1,
            marginLeft: 15,
          }}
        >
          Review Request
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 25 }}>
        {/* Task name + status badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Task</Text>
            <Text style={{ ...typography.heading, color: colors.text.primary, marginTop: 4 }}>
              {request.tasks?.title ?? "Untitled Task"}
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
              paddingVertical: 5,
              marginTop: 22,
            }}
          >
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text
              style={{ ...typography.label, color: meta.color, textTransform: "capitalize" }}
            >
              {meta.label}
            </Text>
          </View>
        </View>

        <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 8 }}>
          Requested by {request.tasks?.assigned_to ?? "—"}
        </Text>

        {/* Current Deadline (read-only) */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Current Deadline
          </Text>
          <View
            style={{
              marginTop: 8,
              backgroundColor: colors.base.surfaceL2,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ ...typography.body, color: colors.text.primary }}>
              {new Date(request.current_deadline).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Requested Deadline (read-only, highlighted) */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Requested Deadline
          </Text>
          <View
            style={{
              marginTop: 8,
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.brand.accent,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ ...typography.body, color: colors.brand.accent }}>
              {new Date(request.requested_deadline).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Ionicons name="calendar" size={20} color={colors.brand.accent} />
          </View>
        </View>

        {/* Reason (read-only) */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Employee's Reason
          </Text>
          <View
            style={{
              marginTop: 8,
              minHeight: 90,
              backgroundColor: colors.base.surfaceL2,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ ...typography.body, color: colors.text.primary }}>
              {request.reason}
            </Text>
          </View>
        </View>

        {/* Decision summary — shown once already decided */}
        {request.status !== "pending" && (
          <View
            style={{
              marginTop: 25,
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
                You {meta.label.toLowerCase()} this request
              </Text>
            </View>
            {request.admin_note ? (
              <Text style={{ ...typography.body, color: colors.text.primary }}>
                {request.admin_note}
              </Text>
            ) : (
              <Text style={{ ...typography.body, color: colors.text.secondary }}>
                No note was left.
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
        )}

        {/* Accept / Reject — only while pending */}
        {request.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 14, marginTop: 30 }}>
            <TouchableOpacity
              onPress={() => openConfirm("accepted")}
              style={{
                flex: 1,
                height: 53,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.status.completed,
              }}
            >
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
                Accept
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openConfirm("rejected")}
              style={{
                flex: 1,
                height: 53,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.status.overdue,
              }}
            >
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confirm modal — optional note + second-time confirm */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 20,
              padding: 22,
              width: 300,
            }}
          >
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              {pendingDecision === "accepted" ? "Confirm acceptance" : "Confirm rejection"}
            </Text>
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 6 }}>
              You can leave an optional note for the employee.
            </Text>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={3}
              style={{
                marginTop: 14,
                minHeight: 70,
                backgroundColor: colors.base.surfaceL2,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                textAlignVertical: "top",
                ...typography.body,
                color: colors.text.primary,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={deciding}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: colors.base.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ ...typography.body, color: colors.text.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDecision}
                disabled={deciding}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue,
                  opacity: deciding ? 0.7 : 1,
                }}
              >
                {deciding ? (
                  <ActivityIndicator color={colors.base.surfaceL1} />
                ) : (
                  <Text style={{ ...typography.body, color: colors.base.surfaceL1 }}>
                    {pendingDecision === "accepted" ? "Confirm Accept" : "Confirm Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
