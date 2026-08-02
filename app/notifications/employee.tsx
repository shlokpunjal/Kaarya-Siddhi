import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { moderateScale } from "../../utils/responsive";
import EmployeeNotificationsSkeleton from '../../components/skeletonScreens/Employee/EmployeeNotificationSkeleton';
import { authFetch } from "../../utils/authFetch";
import ScreenHeader from "../../components/notifications/ScreenHeader";
import EmptyState from "../../components/notifications/EmptyState";
import { useCurrentUser } from "../../hooks/notifications/useCurrentUser";
import { useRealtimeTable } from "../../hooks/notifications/useRealtimeTable";
import { formatDateIN } from "../../utils/notifications/formatDate";

type NotifRow = {
  id: string;
  type:
    | "connection_accepted" | "connection_rejected"
    | "extension_accepted" | "extension_rejected"
    | "task_assigned" | "task_in_review" | "task_suggestion"
    | "deadline" | "overdue" | "eoffice_pending";
  message: string;
  created_at: string;
  metadata: any;
  task_id: string | null;
};

const notifMeta = (colors: any, type: NotifRow["type"]) => {
  if (type === "connection_accepted" || type === "extension_accepted")
    return { color: colors.status.completed, icon: "checkmark-circle-outline" as const };
  if (type === "task_assigned" || type === "eoffice_pending")
    return { color: colors.brand.accent, icon: "briefcase-outline" as const };
  if (type === "task_suggestion")
    return { color: colors.status.pending, icon: "create-outline" as const };
  if (type === "deadline")
    return { color: colors.status.pending, icon: "time-outline" as const };
  if (type === "overdue")
    return { color: colors.status.overdue, icon: "alert-circle-outline" as const };
  return { color: colors.status.overdue, icon: "close-circle-outline" as const };
};

export default function EmployeeNotifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const types = "connection_accepted,connection_rejected,extension_accepted,extension_rejected,task_assigned,task_in_review,task_suggestion,deadline,overdue,eoffice_pending";
      const res = await authFetch(`/notifications?types=${types}`);

      if (!res.ok) {
        console.error("Error fetching notifications:", res.status);
        return;
      }
      const data = await res.json();
      setNotifications((data as NotifRow[]) ?? []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) fetchNotifications(userId);
    }, [userId, fetchNotifications])
  );

  const handleChange = useCallback(() => {
    if (userId) fetchNotifications(userId);
  }, [userId, fetchNotifications]);

  useRealtimeTable(
    userId ? `employee_notifs_${userId}` : null,
    "notifications",
    userId ? `user_id=eq.${userId}` : null,
    handleChange,
  );

  const clearAll = async () => {
    if (!userId || notifications.length === 0) return;
    try {
      const ids = notifications.map((n) => n.id).join(",");
      const res = await authFetch(`/notifications?ids=${ids}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to clear notifications:", res.status);
        return;
      }
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const handlePress = (n: NotifRow) => {
    if (n.type === "extension_accepted" || n.type === "extension_rejected") {
      router.push({
        pathname: "/notifications/employee-request-detail",
        params: { requestId: n.metadata?.extension_request_id },
      });
    } else if (
      n.type === "task_assigned" ||
      n.type === "task_in_review" ||
      n.type === "task_suggestion" ||
      n.type === "deadline" ||
      n.type === "overdue"
    ) {
      router.push({
        pathname: "/(task)/task-detail-employee",
        params: { taskId: n.task_id ?? n.metadata?.taskId },
      });
    } else if (n.type === "eoffice_pending") {
      // No task_id on this type — it's per e-office file, not per task.
      router.push("/reports/eoffice");
    }
    // Connection notifications have no dedicated detail screen — just informational.
  };

  if (loading && notifications.length === 0) {
    return <EmployeeNotificationsSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader title="Notifications" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 }}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {!loading && notifications.length === 0 && <EmptyState offsetY={-40} />}

        {notifications.map((n) => {
          const meta = notifMeta(colors, n.type);
          const isExtension = n.type.startsWith("extension");
          const isTappable =
            isExtension ||
            n.type === "task_assigned" ||
            n.type === "task_in_review" ||
            n.type === "task_suggestion" ||
            n.type === "deadline" ||
            n.type === "overdue" ||
            n.type === "eoffice_pending";
          return (
            <TouchableOpacity
              key={n.id}
              onPress={() => handlePress(n)}
              disabled={!isTappable}
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
              <Ionicons name={meta.icon} size={20} color={meta.color} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>{n.message}</Text>
                <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
                  {formatDateIN(n.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}