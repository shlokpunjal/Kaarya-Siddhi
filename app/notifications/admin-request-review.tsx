import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { createNotification } from "../../lib/notify";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";

const statusMeta = (colors: any, status: string) => {
  if (status === "accepted")
    return { color: colors.status.completed, icon: "checkmark-circle" as const, label: "Accepted" };
  if (status === "rejected")
    return { color: colors.status.overdue, icon: "close-circle" as const, label: "Rejected" };
  return { color: colors.status.pending, icon: "time" as const, label: "Pending Review" };
};

const priorityMeta = (colors: any, priority?: string) => {
  if (priority === "high") return { color: colors.status.overdue, label: "High Priority" };
  if (priority === "medium") return { color: colors.status.pending, label: "Medium Priority" };
  return { color: colors.status.completed, label: "Low Priority" };
};

export default function AdminRequestReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { showToast } = useToast();

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
      .select("*, tasks(title, priority, assigned_to, deadline), requester:users!requested_by(name)")
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
        { event: "*", schema: "public", table: "extension_requests", filter: `id=eq.${requestId}` },
        () => { fetchRequest(); }
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
        <Text style={{ ...typography.body, color: colors.text.primary, marginTop: 12, textAlign: "center" }}>
          Request not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.brand.accent, ...typography.body }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = statusMeta(colors, request.status);
  const priority = priorityMeta(colors, request.tasks?.priority);
  const cardShadow = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    android: { elevation: 4 },
  });

  const openConfirm = (decision: "accepted" | "rejected") => {
    setPendingDecision(decision);
    setAdminNote("");
    setModalVisible(true);
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    setDeciding(true);

    const decidedAt = new Date().toISOString();
    const noteToSave = adminNote.trim() || null;

    const { error } = await supabase
      .from("extension_requests")
      .update({ status: pendingDecision, admin_note: noteToSave, decided_at: decidedAt })
      .eq("id", request.id);

    if (!error && pendingDecision === "accepted") {
      // Resetting deadline_reminder_sent here matters: without it, a task
      // that already got its "due tomorrow" reminder for the OLD deadline
      // would silently never get one for the new, extended deadline.
      await supabase
        .from("tasks")
        .update({ deadline: request.requested_deadline, deadline_reminder_sent: false })
        .eq("id", request.task_id);
    }

    setDeciding(false);
    setModalVisible(false);

    if (error) {
      showToast(error.message || "Could not update request", "error");
      return;
    }

    setRequest((prev: any) => ({ ...prev, status: pendingDecision, admin_note: noteToSave, decided_at: decidedAt }));

    // Remove the pending notification (for all admins who received it) and
    // notify the employee of the decision.
    await supabase
      .from("notifications")
      .delete()
      .eq("type", "extension_request")
      .contains("metadata", { extension_request_id: request.id });

    await createNotification({
      userId: request.requested_by,
      type: pendingDecision === "accepted" ? "extension_accepted" : "extension_rejected",
      message:
        pendingDecision === "accepted"
          ? `Your extension request for "${request.tasks?.title ?? "your task"}" was accepted.`
          : `Your extension request for "${request.tasks?.title ?? "your task"}" was rejected.`,
      taskId: request.task_id,
      metadata: { extension_request_id: request.id },
    });

    showToast("The employee will be notified.", "success");
    setTimeout(() => router.back(), 900);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(60),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons onPress={() => router.back()} name="arrow-back" size={moderateScale(26)} color={colors.brand.onPrimary ?? colors.base.surfaceL1} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary ?? colors.base.surfaceL1, marginLeft: 15 }}>
          Review Request
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: wp(5.3), paddingBottom: 40 }}>
        {/* ── Status hero ── */}
        <View
          style={{
            backgroundColor: meta.color + "18",
            borderRadius: 20,
            padding: 22,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: moderateScale(64),
              width: moderateScale(64),
              borderRadius: moderateScale(32),
              backgroundColor: meta.color + "26",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name={meta.icon} size={moderateScale(34)} color={meta.color} />
          </View>
          <Text style={{ ...typography.heading3, color: meta.color }}>{meta.label}</Text>
          {request.decided_at && (
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
              Decided on {formatDate(request.decided_at)}
            </Text>
          )}
        </View>

        {/* ── Task card ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Task
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: priority.color + "22",
                borderRadius: 8,
                paddingHorizontal: 9,
                paddingVertical: 3,
              }}
            >
              <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: priority.color }} />
              <Text style={{ ...typography.label, color: priority.color, fontSize: 11 }}>{priority.label}</Text>
            </View>
          </View>
          <Text style={{ ...typography.heading, color: colors.text.primary, marginBottom: 4 }}>
            {request.tasks?.title ?? "Untitled Task"}
          </Text>
          <Text style={{ ...typography.label, color: colors.text.secondary }}>
            Requested by {request.requester?.name ?? "—"}
          </Text>
        </View>

        {/* ── Deadline comparison ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            Deadline Change
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Current */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  height: moderateScale(40),
                  width: moderateScale(40),
                  borderRadius: moderateScale(20),
                  backgroundColor: colors.base.surfaceL2,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="calendar-outline" size={moderateScale(20)} color={colors.text.secondary} />
              </View>
              <Text style={{ ...typography.label, color: colors.text.secondary, fontSize: 11, marginBottom: 3 }}>
                CURRENT
              </Text>
              <Text style={{ ...typography.body, color: colors.text.primary }}>
                {formatDate(request.current_deadline)}
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons name="arrow-forward" size={20} color={colors.brand.accent} style={{ marginHorizontal: 8 }} />

            {/* Requested */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  height: moderateScale(40),
                  width: moderateScale(40),
                  borderRadius: moderateScale(20),
                  backgroundColor: colors.brand.accent + "22",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="calendar" size={moderateScale(20)} color={colors.brand.accent} />
              </View>
              <Text style={{ ...typography.label, color: colors.brand.accent, fontSize: 11, marginBottom: 3 }}>
                REQUESTED
              </Text>
              <Text style={{ ...typography.body, color: colors.brand.accent, fontFamily: "Poppins-SemiBold" }}>
                {formatDate(request.requested_deadline)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Reason ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.text.secondary} />
            <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Employee's Reason
            </Text>
          </View>
          <Text style={{ ...typography.body, color: colors.text.primary, lineHeight: 21 }}>
            {request.reason}
          </Text>
        </View>

        {/* ── Admin note — shown once decided ── */}
        {request.status !== "pending" && (
          <View
            style={{
              backgroundColor: meta.color + "12",
              borderColor: meta.color + "33",
              borderWidth: 1,
              borderRadius: 18,
              padding: 20,
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Ionicons name="create-outline" size={16} color={meta.color} />
              <Text style={{ ...typography.label, color: meta.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Your Note
              </Text>
            </View>
            {request.admin_note ? (
              <Text style={{ ...typography.body, color: colors.text.primary, lineHeight: 21 }}>
                {request.admin_note}
              </Text>
            ) : (
              <Text style={{ ...typography.body, color: colors.text.secondary, fontStyle: "italic" }}>
                No note was left.
              </Text>
            )}
          </View>
        )}

        {/* ── Accept / Reject — only while pending ── */}
        {request.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => openConfirm("accepted")}
              style={{
                flex: 1,
                height: moderateScale(54),
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.status.completed,
                ...cardShadow,
              }}
            >
              <Ionicons name="checkmark" size={20} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openConfirm("rejected")}
              style={{
                flex: 1,
                height: moderateScale(54),
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.status.overdue,
                ...cardShadow,
              }}
            >
              <Ionicons name="close" size={20} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 22,
              padding: 24,
              width: "100%",
              maxWidth: 340,
              ...cardShadow,
            }}
          >
            <View
              style={{
                height: moderateScale(52),
                width: moderateScale(52),
                borderRadius: moderateScale(26),
                backgroundColor:
                  (pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue) + "22",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Ionicons
                name={pendingDecision === "accepted" ? "checkmark" : "close"}
                size={moderateScale(26)}
                color={pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue}
              />
            </View>

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
                marginTop: 16,
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
                  height: moderateScale(48),
                  borderRadius: 12,
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
                  height: moderateScale(48),
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue,
                  opacity: deciding ? 0.7 : 1,
                }}
              >
                {deciding ? (
                  <ActivityIndicator color={colors.base.surfaceL1} />
                ) : (
                  <Text style={{ ...typography.body, color: colors.base.surfaceL1, fontFamily: "Poppins-SemiBold" }}>
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