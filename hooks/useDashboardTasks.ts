import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { Task } from "../types/task";
import { authFetch } from "../utils/authFetch";
import { mapRowToTask, syncOverdueStatuses, TaskRow, groupTeamTasks } from "../utils/dashboard/taskMapping";
import { getFreshChannel } from "../utils/dashboard/realTime";

type Role = "employee" | "admin";

export function useDashboardTasks(role: Role, employeeEmail?: string) {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Resolve the current user once. Both task-fetching and the realtime
  // subscriptions below need the id (and admins additionally need workspace_id).
  const resolveUser = useCallback(async () => {
    const email = await AsyncStorage.getItem("userEmail");
    if (!email) {
      console.error("No active session found, redirecting...");
      router.replace("/(auth)/LoginChoice");
      return null;
    }
    const res = await authFetch("/me");
    if (!res.ok) {
      console.error("Could not resolve current user.");
      return null;
    }
    const me = await res.json();
    setUserId(me.id);
    if (me.workspace_id) setWorkspaceId(me.workspace_id);
    return me;
  }, [router]);

  const fetchTasks = useCallback(
    async (isMounted: () => boolean = () => true) => {
      const me = await resolveUser();
      if (!me || !isMounted()) return;

      const res = await authFetch(
        employeeEmail ? `/tasks?employee_email=${encodeURIComponent(employeeEmail)}` : "/tasks",
      );
      if (!res.ok) {
        console.error("Error fetching tasks:", res.status);
        return;
      }
      const data: TaskRow[] = await res.json();
      let mapped = (data ?? []).map(mapRowToTask);
      mapped = await syncOverdueStatuses(mapped);
      mapped = groupTeamTasks(mapped)
      if (isMounted()) setTasks(mapped);
    },
    [resolveUser],
  );

  // ── Initial load ──
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTasks(() => mounted).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [fetchTasks]);

  // ── Refetch on focus, skipping the very first mount (the effect above
  // already covers that fetch + the loading state) ──
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      let mounted = true;
      fetchTasks(() => mounted);
      return () => {
        mounted = false;
      };
    }, [fetchTasks]),
  );

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  // ── Bell badge count, refreshed on focus ──
  const fetchBadgeCount = useCallback(async () => {
    const res = await authFetch("/dashboard-counts");
    if (!res.ok) return;
    const data = await res.json();
    setBadgeCount(data.count ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBadgeCount();
    }, [fetchBadgeCount]),
  );

  // ── Realtime: notifications for everyone; extension_requests too for
  // admins (workspace-scoped, so admins see review requests instantly) ──
  useEffect(() => {
    if (!userId) return;

    const notifChannel = getFreshChannel(`dashboard_badge_notifs_${userId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => fetchBadgeCount(),
    );
    notifChannel.subscribe();

    let extensionChannel: ReturnType<typeof getFreshChannel> | null = null;
    if (role === "admin" && workspaceId) {
      extensionChannel = getFreshChannel(`dashboard_badge_ext_${workspaceId}`).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extension_requests",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => fetchBadgeCount(),
      );
      extensionChannel.subscribe();
    }

    return () => {
      supabase.removeChannel(notifChannel);
      if (extensionChannel) supabase.removeChannel(extensionChannel);
    };
  }, [role, userId, workspaceId, fetchBadgeCount]);

  return { tasks, loading, refreshing, onRefresh, badgeCount };
}