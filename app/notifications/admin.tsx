import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { moderateScale } from "../../utils/responsive";
import AdminNotificationsSkeleton from "../../components/skeletonScreens/Admin/AdminNotificationSkeleton";
import { authFetch } from "../../utils/authFetch";
import { subscribeToTableChanges } from "../../services/realtimeService";

export default function AdminNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const extensionChannelRef = useRef<RealtimeChannel | null>(null);
  type OtherNotif = {
    id: string;
    type: string;
    message: string;
    created_at: string;
    task_id: string | null;
    metadata: any;
  };

  const [otherNotifications, setOtherNotifications] = useState<OtherNotif[]>(
    [],
  );

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

  useEffect(() => {
    (async () => {
      const res = await authFetch("/me");
      if (!res.ok) {
        console.error("Could not resolve admin user.");
        return;
      }
      const data = await res.json();
      setAdminUserId(data.id);
      setWorkspaceId(data.workspace_id);
    })();
  }, []);

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
  useEffect(() => {
    if (!adminUserId) return;

    const channel = subscribeToTableChanges(
      `notifications_admin_${adminUserId}`,
      "notifications",
      `user_id=eq.${adminUserId}`,
      () => {
        fetchPendingCount();
        fetchOtherNotifications();
      },
    );

    notifChannelRef.current = channel;

    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [adminUserId, fetchPendingCount, fetchOtherNotifications]);

  // Realtime: extension requests via extension_requests, scoped to workspace.
  useEffect(() => {
    if (!workspaceId) return;

    const channel = subscribeToTableChanges(
      `extension_requests_admin_badge_${workspaceId}`,
      "extension_requests",
      `workspace_id=eq.${workspaceId}`,
      () => fetchPendingCount(),
    );

    extensionChannelRef.current = channel;

    return () => {
      if (extensionChannelRef.current) {
        supabase.removeChannel(extensionChannelRef.current);
        extensionChannelRef.current = null;
      }
    };
  }, [workspaceId, fetchPendingCount]);

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
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={moderateScale(26)}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            marginLeft: 15,
          }}
        >
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
        }}
      >
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
            <Text
              style={{ ...typography.heading3, color: colors.text.primary }}
            >
              Requests
            </Text>
            <Text
              style={{
                ...typography.label,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
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
              <Text
                style={{ ...typography.label, color: colors.status.pending }}
              >
                {pendingCount} pending
              </Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.secondary}
          />
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
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.text.secondary}
            />
            <Text
              style={{ ...typography.heading3, color: colors.text.secondary }}
            >
              Other Notifications
            </Text>
          </View>
          {otherNotifications.length > 0 && (
            <TouchableOpacity onPress={clearOtherNotifications}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {otherNotifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 32,
              marginTop: -35, // adjust if needed
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(0, 0, 0, 0.08)", // subtle circle behind icon
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={32}
                color={colors.text.secondary}
              />
            </View>

            <Text
              style={{
                ...typography.subheading, // or a bold/medium variant
                color: colors.text.primary,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              You're all caught up
            </Text>

            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                textAlign: "center",
              }}
            >
              New notifications will show up here.
            </Text>
          </View>
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
                    <Text
                      style={{
                        ...typography.label,
                        color: colors.text.secondary,
                        marginTop: 4,
                      }}
                    >
                      {new Date(n.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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