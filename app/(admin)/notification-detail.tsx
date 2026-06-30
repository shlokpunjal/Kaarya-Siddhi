// app/(admin)/notification-detail.tsx

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const statusColor = (colors: any, status: string) => {
  if (status === "accepted") return colors.status.completed;
  if (status === "rejected") return colors.status.overdue;
  return colors.status.pending;
};

export default function NotificationDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (!requestId) return;
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority, assigned_to)")
      .eq("id", requestId)
      .single();

    if (error) console.error("Error fetching request:", error);
    setRequest(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
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

  const openConfirm = (decision: "accepted" | "rejected") => {
    setPendingDecision(decision);
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

  const Row = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
    <View style={{ marginTop: 18 }}>
      <Text style={{ ...typography.heading3, color: colors.text.secondary }}>{label}</Text>
      <Text style={{ ...typography.body, color: valueColor ?? colors.text.primary, marginTop: 4 }}>
        {value}
      </Text>
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
          color={colors.base.surfaceL1}
        />
        <Text style={{ ...typography.heading, color: colors.base.surfaceL1, marginLeft: 15 }}>
          Request Details
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.base.surfaceL1,
          borderColor: colors.base.border,
          borderWidth: 1,
          borderRadius: 20,
          margin: 25,
          padding: 20,
          boxShadow: "0px 0px 5px gray",
        }}
      >
        {/* Task name + status corner */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{ ...typography.heading, color: colors.text.primary, flex: 1, marginRight: 10 }}
          >
            {request.tasks?.title ?? "Untitled Task"}
          </Text>
          <View
            style={{
              backgroundColor: statusColor(colors, request.status) + "22",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                ...typography.label,
                color: statusColor(colors, request.status),
                textTransform: "capitalize",
              }}
            >
              {request.status}
            </Text>
          </View>
        </View>

        <Row label="Assigned To" value={request.tasks?.assigned_to ?? "—"} />
        <Row
          label="Current Deadline"
          value={new Date(request.current_deadline).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        />
        <Row
          label="Requested Deadline"
          value={new Date(request.requested_deadline).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          valueColor={colors.brand.accent}
        />
        <Row label="Reason" value={request.reason} />

        {request.admin_note && (
          <Row label="Admin Note" value={request.admin_note} />
        )}

        {/* Action buttons only if still pending */}
        {request.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 14, marginTop: 28 }}>
            <TouchableOpacity
              onPress={() => openConfirm("accepted")}
              style={{
                flex: 1,
                height: 50,
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
                height: 50,
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
      </View>

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
              {pendingDecision === "accepted"
                ? "Confirm acceptance"
                : "Confirm rejection"}
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
                    pendingDecision === "accepted"
                      ? colors.status.completed
                      : colors.status.overdue,
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
