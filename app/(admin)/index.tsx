import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';
import { Task } from '../../types/task';
import { getGreeting } from '../../utils/greeting';
import NoTasksAdmin from '../(task)/notasksAdmin';
import { wp, hp, moderateScale } from '../../utils/responsive';
import DashboardSkeleton from '../../components/DashboardSkeleton';

// Matches the actual `tasks` table columns
type TaskRow = {
  id: string;
  title: string;
  status: 'overdue' | 'pending' | 'in_review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  created_by: string;
  deadline: string;
};

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status === 'in_review' ? 'inReview' : row.status,
    priority: row.priority,
    label: 'General',
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    dueDate: row.deadline,
    suggestion: undefined,
  };
}

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();

  const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // For admins, the badge counts requests still awaiting THEIR review — not
  // requests they themselves filed (admins don't file extension requests).
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // ── Fetch tasks for the logged-in admin. Shared by initial load and pull-to-refresh ──
  const checkUserAndFetchTasks = useCallback(async (isMounted: () => boolean = () => true) => {
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) {
      console.error('No active session found, redirecting...');
      if (isMounted()) router.replace('/(auth)/LoginChoice');
      return;
    }

    const { data: currentUser, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userLookupError || !currentUser) {
      console.error('Could not resolve user id for email:', email);
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', currentUser.id)
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error.message);
    } else if (isMounted()) {
      setTasks((data ?? []).map(mapRowToTask));
    }
  }, [router]);

  // ── Initial task fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    checkUserAndFetchTasks(() => mounted).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [checkUserAndFetchTasks]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkUserAndFetchTasks();
    setRefreshing(false);
  }, [checkUserAndFetchTasks]);

  // ── Bell badge: count of requests still pending admin review, refreshed on focus ──
  // Scoped to this admin's own workspace — otherwise it counts every pending
  // request across every admin's team.
  // Replace the pendingRequestCount useFocusEffect block with this:

const fetchPendingRequestCount = useCallback(async () => {
  const email = await AsyncStorage.getItem('userEmail');
  if (!email) return;

  const { data: userRow } = await supabase
    .from('users')
    .select('id, workspace_id')
    .eq('email', email)
    .single();

  if (!userRow?.workspace_id) {
    setPendingRequestCount(0);
    return;
  }

  const { count: connCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userRow.id)
    .eq('type', 'connection_request');

  const { count: extCount } = await supabase
    .from('extension_requests')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', userRow.workspace_id)
    .eq('status', 'pending');

  setPendingRequestCount((connCount ?? 0) + (extCount ?? 0));
}, []);

useFocusEffect(useCallback(() => { fetchPendingRequestCount(); }, [fetchPendingRequestCount]));

// New: realtime, so the dot updates instantly instead of waiting for focus.
useEffect(() => {
  let notifChannel: any;
  let extensionChannel: any;

  (async () => {
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) return;
    const { data: userRow } = await supabase
      .from('users')
      .select('id, workspace_id')
      .eq('email', email)
      .single();
    if (!userRow) return;

    notifChannel = supabase
      .channel(`dashboard_badge_notifs_${userRow.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userRow.id}` },
        () => fetchPendingRequestCount()
      )
      .subscribe();

    if (userRow.workspace_id) {
      extensionChannel = supabase
        .channel(`dashboard_badge_ext_${userRow.workspace_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'extension_requests', filter: `workspace_id=eq.${userRow.workspace_id}` },
          () => fetchPendingRequestCount()
        )
        .subscribe();
    }
  })();

  return () => {
    if (notifChannel) supabase.removeChannel(notifChannel);
    if (extensionChannel) supabase.removeChannel(extensionChannel);
  };
  }, [fetchPendingRequestCount]);
  
  if (loading) {
    return (
      <DashboardSkeleton/>
    );
  }

  const overdueTasks = tasks.filter(t => t.status === "overdue");
  const pendingTasks = tasks.filter(t => t.status === "pending");
  const reviewTasks = tasks.filter(t => t.status === "inReview");
  const completedTasks = tasks.filter(t => t.status === "completed");

  // ── If every category is empty, show the NoTasks screen instead ──
  if (
    overdueTasks.length === 0 &&
    pendingTasks.length === 0 &&
    reviewTasks.length === 0 &&
    completedTasks.length === 0
  ) {
    return <NoTasksAdmin />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.accent} colors={[colors.brand.accent]} />
        }
      >

        {/* ── Header Block ── */}
        <View>
          <View style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingRight: wp(4),
          }}>
            {/* Greeting */}
            <View>
              <Text style={{
                ...typography.subheading,
                marginTop: hp(2.5), marginLeft: wp(4),
                color: colors.text.secondary,
              }}>{getGreeting()}</Text>
              <Text style={{
                ...typography.heading,
                marginTop: 5, marginLeft: wp(4),
                color: colors.text.primary,
              }}>Your Task Overview</Text>
            </View>

            {/* Bell icon */}
            <TouchableOpacity
              onPress={() => router.push("/notifications/admin")}
              style={{
                position: "relative",
                marginTop: hp(2.7),
                height: moderateScale(48),
                width: moderateScale(48),
                borderRadius: moderateScale(24),
                backgroundColor: colors.base.surfaceL2,
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0px 0px 5px gray",
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.brand.accent} />
              {pendingRequestCount > 0 && (
                <View style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  height: moderateScale(10),
                  width: moderateScale(10),
                  borderRadius: moderateScale(5),
                  backgroundColor: colors.status.pending,
                }} />
              )}
            </TouchableOpacity>
          </View>

          {/* Metrics Matrix Container */}
          <View style={{
            backgroundColor: colors.base.surfaceL1, marginTop: hp(3), marginHorizontal: wp(5.3), height: moderateScale(140), borderRadius: 25,
            flexDirection: "row", alignItems: "center", justifyContent: "space-around",
            borderColor: colors.base.border, borderWidth: 1.5,
          }}>
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                marginLeft: wp(3.2), height: moderateScale(63), width: moderateScale(63), borderRadius: moderateScale(40),
                backgroundColor: "rgba(239,133,143,0.4)", borderColor: colors.status.overdue,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.overdue }}>{overdueTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.overdue, marginLeft: 13 }}>Overdue</Text>
            </View>

            {/* Pending */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: moderateScale(63), width: moderateScale(63), borderRadius: moderateScale(40),
                backgroundColor: "rgba(255, 192, 104, 0.3)", borderColor: colors.status.pending,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.pending }}>{pendingTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.pending }}>Pending</Text>
            </View>

            {/* In Review */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: moderateScale(63), width: moderateScale(63), borderRadius: moderateScale(40),
                backgroundColor: "rgba(100,150,255,0.2)", borderColor: colors.status.inReview,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.inReview }}>{reviewTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.inReview }}>In Review</Text>
            </View>

            {/* Completed */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: moderateScale(63), width: moderateScale(63), borderRadius: moderateScale(40),
                backgroundColor: "rgba(100,220,120,0.2)", borderColor: colors.status.completed,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.completed }}>{completedTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.completed }}>Completed</Text>
            </View>
          </View>
        </View>

        {/* ── Action Buttons Row ── */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginHorizontal: wp(8.8), flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push("/newtask")}
              style={{
                backgroundColor: colors.brand.accent, padding: 14,
                width: "100%", height: moderateScale(60), borderRadius: 32,
                flexDirection: "row", marginTop: 20, justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Ionicons style={{ marginRight: 10 }} name="add" size={28} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, textAlign: "center" }}>Add a New Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Overdue Accordion ── */}
        <View style={{ marginHorizontal: wp(8.8), marginTop: hp(3.7), borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: moderateScale(60), borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
            <Text style={{ ...typography.subheading, color: colors.status.overdue }}>Overdue</Text>
            <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
              <Ionicons name={showOverdue ? "chevron-up-outline" : "chevron-down-outline"} size={30} color={colors.base.surfaceL1} style={{ backgroundColor: colors.status.overdue, borderRadius: 10, padding: 2 }} />
            </TouchableOpacity>
          </View>
          {showOverdue && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {overdueTasks.map((task) => (
                <TouchableOpacity key={task.id} onPress={() => router.push({ pathname: '/(task)/taskDetailAdmin', params: { taskId: task.id } })}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.base.surfaceL2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10 }}>
                  <View style={{ height: moderateScale(24), width: moderateScale(24), borderRadius: moderateScale(12), borderWidth: 2, borderColor: colors.status.overdue, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: moderateScale(12), width: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: colors.status.overdue }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Pending Accordion ── */}
        <View style={{ marginHorizontal: wp(8.8), marginTop: hp(2.5), borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: moderateScale(60), borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
            <Text style={{ ...typography.subheading, color: colors.status.pending }}>Pending</Text>
            <TouchableOpacity onPress={() => setShowPending(!showPending)}>
              <Ionicons name={showPending ? "chevron-up-outline" : "chevron-down-outline"} size={30} color={colors.base.surfaceL1} style={{ backgroundColor: colors.status.pending, borderRadius: 10, padding: 2 }} />
            </TouchableOpacity>
          </View>
          {showPending && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {pendingTasks.map((task) => (
                <TouchableOpacity key={task.id} onPress={() => router.push({ pathname: '/(task)/task-detail', params: { taskId: task.id } })}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.base.surfaceL2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10 }}>
                  <View style={{ height: moderateScale(24), width: moderateScale(24), borderRadius: moderateScale(12), borderWidth: 2, borderColor: colors.status.pending, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: moderateScale(12), width: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: colors.status.pending }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── In Review Accordion ── */}
        <View style={{ marginHorizontal: wp(8.8), marginTop: hp(2.5), borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: moderateScale(60), borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
            <Text style={{ ...typography.subheading, color: colors.status.inReview }}>In Review</Text>
            <TouchableOpacity onPress={() => setShowReview(!showReview)}>
              <Ionicons name={showReview ? "chevron-up-outline" : "chevron-down-outline"} size={30} color={colors.base.surfaceL1} style={{ backgroundColor: colors.status.inReview, borderRadius: 10, padding: 2 }} />
            </TouchableOpacity>
          </View>
          {showReview && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {reviewTasks.map((task) => (
                <TouchableOpacity key={task.id} onPress={() => router.push({ pathname: '/(task)/task-detail', params: { taskId: task.id } })}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.base.surfaceL2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10 }}>
                  <View style={{ height: moderateScale(24), width: moderateScale(24), borderRadius: moderateScale(12), borderWidth: 2, borderColor: colors.status.inReview, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: moderateScale(12), width: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: colors.status.inReview }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Completed Accordion ── */}
        <View style={{ marginHorizontal: wp(8.8), marginTop: hp(2.5), borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: moderateScale(60), borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
            <Text style={{ ...typography.subheading, color: colors.status.completed }}>Completed</Text>
            <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
              <Ionicons name={showCompleted ? "chevron-up-outline" : "chevron-down-outline"} size={30} color={colors.base.surfaceL1} style={{ backgroundColor: colors.status.completed, borderRadius: 10, padding: 2 }} />
            </TouchableOpacity>
          </View>
          {showCompleted && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {completedTasks.map((task) => (
                <TouchableOpacity key={task.id} onPress={() => router.push({ pathname: '/(task)/task-detail', params: { taskId: task.id } })}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.base.surfaceL2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10 }}>
                  <View style={{ height: moderateScale(24), width: moderateScale(24), borderRadius: moderateScale(12), borderWidth: 2, borderColor: colors.status.completed, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: moderateScale(12), width: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: colors.status.completed }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView >
  );
}