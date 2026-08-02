import React, { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { moderateScale } from "../../utils/responsive";
import AdminNotificationsSkeleton from "../../components/skeletonScreens/AdminNotificationSkeleton";
import { authFetch } from "../../utils/authFetch";
import ScreenHeader from "../../components/notifications/ScreenHeader";
import EmptyState from "../../components/notifications/EmptyState";
import { useCurrentUser } from "../../hooks/notifications/useCurrentUser";
import { useRealtimeTable } from "../../hooks/notifications/useRealtimeTable";
import { formatDateIN } from "../../utils/notifications/formatDate";

type OtherNotif = {
  id: string;
  type: string;
  message: string;
  created_at: string;
  task_id: string | null;
  metadata: any;
};

export default function AdminNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userId: adminUserId, workspaceId } = useCurrentUser();
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [otherNotifications, setOtherNotifications] = useState<OtherNotif[]>([]);

  const fetchOtherNotifications = useCallback(async () => {
    try {
      const res = await authFetch("/notifications?types=task_in_review,overdue,eoffice_pending");
      if (!res.ok) {
        console.error("Error fetching other notifications:", res.status);
        return;
      }
      const data = await res.json();
      setOtherNotifications((data as OtherNotif[]) ?? []);
    } catch (err) {
      console.error("Error fetching other notifications:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOtherNotifications();
    }, [fetchOtherNotifications]),
  );

  const clearOtherNotifications = async () => {
    if (otherNotifications.length === 0) return;
    try {
      const ids = otherNotifications.map((n) => n.id).join(",");
      const res = await authFetch(`/notifications?ids=${ids}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to clear notifications:", res.status);
        return;
      }
      setOtherNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await authFetch("/dashboard-counts");
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount(data.count ?? 0);
    } catch (err) {
      console.error("Failed to fetch pending count:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [fetchPendingCount]),
  );

  // Realtime — single subscription for the `notifications` table, scoped
  // to this admin's own user id. Both the "Requests" pending-count badge
  // and the "Other Notifications" list need to react to the same
  // underlying event (a row changing for this user); previously these
  // were two separate Realtime channels on the identical table+filter+
  // event, each doing its own fetch. One subscription, two refetches.
  const handleNotificationsChange = useCallback(() => {
    fetchPendingCount();
    fetchOtherNotifications();
  }, [fetchPendingCount, fetchOtherNotifications]);

  useRealtimeTable(
    adminUserId ? `notifications_admin_${adminUserId}` : null,
    "notifications",
    adminUserId ? `user_id=eq.${adminUserId}` : null,
    handleNotificationsChange,
  );

  // Realtime: extension requests via extension_requests, scoped to workspace.
  useRealtimeTable(
    workspaceId ? `extension_requests_admin_badge_${workspaceId}` : null,
    "extension_requests",
    workspaceId ? `workspace_id=eq.${workspaceId}` : null,
    fetchPendingCount,
  );

  useEffect(() => {
    (async () => {
      await Promise.all([fetchPendingCount(), fetchOtherNotifications()]);
      setPageLoading(false);
    })();
  }, []);

  if (pageLoading) {
    return <AdminNotificationsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader title="Notifications" />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        {/* ---------- Requests box ---------- */}
        <TouchableOpacity
          onPress={() => router.push("/notifications/admin-requests-list")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: moderateScale(40),
              width: moderateScale(40),
              borderRadius: moderateScale(20),
              backgroundColor: colors.brand.onPrimary + "22",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="mail" size={20} color={colors.brand.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Requests
            </Text>
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 2 }}>
              Connection & extend deadline requests
            </Text>
          </View>

          {pendingCount > 0 && (
            <View
              style={{
                backgroundColor: colors.status.pending + "22",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginRight: 10,
              }}
            >
              <Text style={{ ...typography.label, color: colors.status.pending }}>
                {pendingCount} pending
              </Text>
            </View>
          )}

          <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* ---------- Other Notifications ---------- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
            <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
              Other Notifications
            </Text>
          </View>
          {otherNotifications.length > 0 && (
            <TouchableOpacity onPress={clearOtherNotifications}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {otherNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          otherNotifications.map((n) => {
            const taskId = n.task_id ?? n.metadata?.taskId;
            const isEoffice = n.type === "eoffice_pending";
            return (
              <TouchableOpacity
                key={n.id}
                disabled={!isEoffice && !taskId}
                onPress={() =>
                  isEoffice
                    ? router.push("/reports/eoffice")
                    : router.push({
                        pathname: "/(task)/task-detail-admin",
                        params: { taskId },
                      })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  backgroundColor: colors.base.surfaceL1,
                  borderColor: colors.base.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  gap: 12,
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={colors.brand.accent}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.text.primary }}>
                    {n.message}
                  </Text>
                  <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                    {formatDateIN(n.created_at)}
                  </Text>
                </View>
                {taskId && (
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}