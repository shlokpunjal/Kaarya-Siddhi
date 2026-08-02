import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import AdminRequestReviewSkeleton from "../../components/skeletonScreens/Admin/AdminRequestReviewSkeleton";
import { authFetch } from "../../utils/authFetch";
import ScreenHeader from "../../components/notifications/ScreenHeader";
import StatusHero from "../../components/notifications/StatusHero";
import DecisionButtons from "../../components/notifications/DecisionButtons";
import { cardShadow } from "../../utils/notifications/cardShadow";
import { formatDateIN } from "../../utils/notifications/formatDate";
import { getPriorityMeta } from "../../utils/notifications/notificationMeta";
import { useRealtimeTable } from "../../hooks/notifications/useRealtimeTable";

export default function AdminRequestReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { showToast } = useToast();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<
    "accepted" | "rejected" | null
  >(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchRequest = async () => {
    const res = await authFetch(`/extension-requests/${requestId}`);
    if (!res.ok) {
      console.error("Error fetching request:", res.status);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    fetchRequest();
  }, [requestId]);

  useRealtimeTable(
    requestId ? `extension_request_${requestId}` : null,
    "extension_requests",
    requestId ? `id=eq.${requestId}` : null,
    fetchRequest,
  );

  if (loading) {
    return <AdminRequestReviewSkeleton />;
  }

  if (!request) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.base.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.text.secondary}
        />
        <Text
          style={{
            ...typography.body,
            color: colors.text.primary,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Request not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.brand.accent, ...typography.body }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priority = getPriorityMeta(colors, request.tasks?.priority);
  // Only needed here for the "Your Note" panel border/text tint once a
  // decision has been made — StatusHero owns the icon/label version of this.
  const statusColor =
    request.status === "accepted"
      ? colors.status.completed
      : request.status === "rejected"
      ? colors.status.overdue
      : colors.status.pending;

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
    const res = await authFetch(`/extension-requests/${request.id}/decide`, {
      method: "POST",
      body: JSON.stringify({
        decision: pendingDecision,
        admin_note: noteToSave,
      }),
    });

    setDeciding(false);
    setModalVisible(false);

    if (!res.ok) {
      showToast("Could not update request", "error");
      return;
    }

    setRequest((prev: any) => ({
      ...prev,
      status: pendingDecision,
      admin_note: noteToSave,
      decided_at: decidedAt,
    }));
    showToast("The employee will be notified.", "success");
    setTimeout(() => router.back(), 900);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader title="Review Request" />

      <ScrollView
        contentContainerStyle={{ padding: wp(5.3), paddingBottom: 40 }}
      >
        <StatusHero
          status={request.status}
          subtitle={request.decided_at ? `Decided on ${formatDateIN(request.decided_at)}` : undefined}
        />

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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                ...typography.label,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
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
              <View
                style={{
                  height: 6,
                  width: 6,
                  borderRadius: 3,
                  backgroundColor: priority.color,
                }}
              />
              <Text
                style={{
                  ...typography.label,
                  color: priority.color,
                  fontSize: 11,
                }}
              >
                {priority.label}
              </Text>
            </View>
          </View>
          <Text
            style={{
              ...typography.heading,
              color: colors.text.primary,
              marginBottom: 4,
            }}
          >
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
          <Text
            style={{
              ...typography.label,
              color: colors.text.secondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 14,
            }}
          >
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
                <Ionicons
                  name="calendar-outline"
                  size={moderateScale(20)}
                  color={colors.text.secondary}
                />
              </View>
              <Text
                style={{
                  ...typography.label,
                  color: colors.text.secondary,
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                CURRENT
              </Text>
              <Text style={{ ...typography.body, color: colors.text.primary }}>
                {formatDateIN(request.current_deadline)}
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.brand.accent}
              style={{ marginHorizontal: 8 }}
            />

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
                <Ionicons
                  name="calendar"
                  size={moderateScale(20)}
                  color={colors.brand.accent}
                />
              </View>
              <Text
                style={{
                  ...typography.label,
                  color: colors.brand.accent,
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                REQUESTED
              </Text>
              <Text
                style={{
                  ...typography.body,
                  color: colors.brand.accent,
                  fontFamily: "Poppins-SemiBold",
                }}
              >
                {formatDateIN(request.requested_deadline)}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={16}
              color={colors.text.secondary}
            />
            <Text
              style={{
                ...typography.label,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Employee's Reason
            </Text>
          </View>
          <Text
            style={{
              ...typography.body,
              color: colors.text.primary,
              lineHeight: 21,
            }}
          >
            {request.reason}
          </Text>
        </View>

        {/* ── Admin note — shown once decided ── */}
        {request.status !== "pending" && (
          <View
            style={{
              backgroundColor: statusColor + "12",
              borderColor: statusColor + "33",
              borderWidth: 1,
              borderRadius: 18,
              padding: 20,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Ionicons name="create-outline" size={16} color={statusColor} />
              <Text
                style={{
                  ...typography.label,
                  color: statusColor,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Your Note
              </Text>
            </View>
            {request.admin_note ? (
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.primary,
                  lineHeight: 21,
                }}
              >
                {request.admin_note}
              </Text>
            ) : (
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.secondary,
                  fontStyle: "italic",
                }}
              >
                No note was left.
              </Text>
            )}
          </View>
        )}

        {/* ── Accept / Reject — only while pending ── */}
        {request.status === "pending" && (
          <View style={{ marginTop: 12 }}>
            <DecisionButtons
              onAccept={() => openConfirm("accepted")}
              onReject={() => openConfirm("rejected")}
            />
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
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
                  (pendingDecision === "accepted"
                    ? colors.status.completed
                    : colors.status.overdue) + "22",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Ionicons
                name={pendingDecision === "accepted" ? "checkmark" : "close"}
                size={moderateScale(26)}
                color={
                  pendingDecision === "accepted"
                    ? colors.status.completed
                    : colors.status.overdue
                }
              />
            </View>

            <Text
              style={{ ...typography.heading3, color: colors.text.primary }}
            >
              {pendingDecision === "accepted"
                ? "Confirm acceptance"
                : "Confirm rejection"}
            </Text>
            <Text
              style={{
                ...typography.label,
                color: colors.text.secondary,
                marginTop: 6,
              }}
            >
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
                <Text
                  style={{ ...typography.body, color: colors.text.primary }}
                >
                  Cancel
                </Text>
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
                  <Text
                    style={{
                      ...typography.body,
                      color: colors.base.surfaceL1,
                      fontFamily: "Poppins-SemiBold",
                    }}
                  >
                    {pendingDecision === "accepted"
                      ? "Confirm Accept"
                      : "Confirm Reject"}
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