import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import EmployeeRequestDetailSkeleton from "../../components/skeletonScreens/EmployeeRequestDetailSkeleton";
import { authFetch } from "../../utils/authFetch";
import ScreenHeader from "../../components/notifications/ScreenHeader";
import { useRealtimeTable } from "../../hooks/notifications/useRealtimeTable";
import { formatDateIN } from "../../utils/notifications/formatDate";
import { getStatusMeta } from "../../utils/notifications/notificationMeta";

export default function EmployeeRequestDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    requestId ? `extension_request_${requestId}_employee` : null,
    "extension_requests",
    requestId ? `id=eq.${requestId}` : null,
    fetchRequest,
  );

  if (loading) {
    return <EmployeeRequestDetailSkeleton />;
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

  // "outline" icon set + short "Pending" label match this screen's inline
  // badge — the original had its own statusMeta that diverged slightly
  // from the admin screens' (see notificationMeta.ts for details).
  const meta = getStatusMeta(colors, request.status, "outline", true);

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
      <ScreenHeader title="Request Details" />

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
            value={formatDateIN(request.current_deadline)}
          />
          <Row
            icon="calendar"
            label="Requested Deadline"
            value={formatDateIN(request.requested_deadline)}
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
                    Decided on {formatDateIN(request.decided_at)}
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
            height: moderateScale(50),
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