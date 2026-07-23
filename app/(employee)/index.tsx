import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { Task } from "../../types/task";
import { getGreeting } from "../../utils/greeting";
import NoTaskEmp from "../(task)/notaskEmp";
import { wp, hp, moderateScale } from "../../utils/responsive";
import DashboardSkeleton from "../../components/DashboardSkeleton";
import { authFetch } from '../../utils/authFetch';
// Matches the actual `tasks` table columns
type TaskRow = {
  id: string;
  title: string;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: "low" | "medium" | "high";
  assigned_to: string;
  created_by: string;
  deadline: string;
};

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status === "in_review" ? "inReview" : row.status,
    priority: row.priority,
    label: "General",
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
  const [decidedRequestCount, setDecidedRequestCount] = useState(0);
  // Cache the resolved user id so the badge effect doesn't need to re-look it up
  // via email on every focus.
  const [userId, setUserId] = useState<string | null>(null);

  // ── Fetch tasks for the logged-in employee. Shared by initial load and pull-to-refresh ──
  const checkUserAndFetchTasks = useCallback(
    async (isMounted: () => boolean = () => true) => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        console.error("No active session found, redirecting...");
        if (isMounted()) router.replace("/(auth)/LoginChoice");
        return;
      }

      const meRes = await authFetch("/me");
      if (!meRes.ok) {
        console.error("Could not resolve current user.");
        return;
      }
      const currentUser = await meRes.json();
      if (isMounted()) setUserId(currentUser.id);

      const res = await authFetch("/tasks");
      if (!res.ok) {
        console.error("Error fetching tasks:", res.status);
      } else if (isMounted()) {
        const data = await res.json();
        setTasks((data ?? []).map(mapRowToTask));
      }
    },
    [router],
  );

  // ── Initial task fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    checkUserAndFetchTasks(() => mounted).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [checkUserAndFetchTasks]);

  // ── Refetch tasks whenever the dashboard regains focus (e.g. coming back
  // from task-detail after "Ask to Review" or "Review or Complete") so the
  // Overdue/Pending/In Review/Completed buckets reflect the latest status
  // without requiring a manual pull-to-refresh. Skips the very first mount
  // since the effect above already handles that fetch + the loading state. ──
  const isFirstFocus = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      let mounted = true;
      checkUserAndFetchTasks(() => mounted);
      return () => {
        mounted = false;
      };
    }, [checkUserAndFetchTasks]),
  );

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkUserAndFetchTasks();
    setRefreshing(false);
  }, [checkUserAndFetchTasks]);

  // ── Bell badge: count of admin-decided requests, refreshed on focus ──────────
  // `requested_by` stores a user id (uuid), not an email, so we filter by the
  // resolved userId rather than the raw AsyncStorage email.
  // ── Bell badge: count of notifications still sitting in the list, refreshed
  // on focus AND via realtime. Matches exactly what employee.tsx's
  // Notifications page shows (and clears), so the badge and list stay in sync.
  const fetchDecidedRequestCount = useCallback(async () => {
    if (!userId) return;
    const res = await authFetch('/dashboard-counts');
    if (!res.ok) return;
    const data = await res.json();
    setDecidedRequestCount(data.count ?? 0);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchDecidedRequestCount();
    }, [fetchDecidedRequestCount]),
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`employee_badge_notifs_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchDecidedRequestCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDecidedRequestCount]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const todayDateStr = new Date().toISOString().slice(0, 10);

  const overdueTasks = tasks.filter(
    (t) => t.status === "pending" && t.dueDate?.slice(0, 10) < todayDateStr,
  );
  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" && t.dueDate?.slice(0, 10) >= todayDateStr,
  );
  const reviewTasks = tasks.filter((t) => t.status === "inReview");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  // ── If every category is empty, show the NoTasks screen instead ──
  if (
    overdueTasks.length === 0 &&
    pendingTasks.length === 0 &&
    reviewTasks.length === 0 &&
    completedTasks.length === 0
  ) {
    return <NoTaskEmp decidedRequestCount={decidedRequestCount} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.accent}
            colors={[colors.brand.accent]}
          />
        }
      >
        {/* ── Header Block ── */}
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingRight: wp(4),
            }}
          >
            {/* Greeting */}
            <View>
              <Text
                style={{
                  ...typography.subheading,
                  marginTop: hp(2.5),
                  marginLeft: wp(4),
                  color: colors.text.secondary,
                }}
              >
                {getGreeting()}
              </Text>
              <Text
                style={{
                  ...typography.heading,
                  marginTop: 5,
                  marginLeft: wp(4),
                  color: colors.text.primary,
                }}
              >
                Your Task Overview
              </Text>
            </View>

            {/* Bell icon */}
            <TouchableOpacity
              onPress={() => router.push("/notifications/employee")}
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
              <Ionicons
                name="notifications-outline"
                size={24}
                color={colors.brand.accent}
              />
              {decidedRequestCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    height: moderateScale(10),
                    width: moderateScale(10),
                    borderRadius: moderateScale(5),
                    backgroundColor: colors.status.completed,
                  }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Metrics Matrix Container */}
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              marginTop: hp(3),
              marginHorizontal: wp(5.3),
              height: moderateScale(140),
              borderRadius: 25,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-around",
              borderColor: colors.base.border,
              borderWidth: 1.5,
            }}
          >
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  marginLeft: wp(3.2),
                  height: moderateScale(63),
                  width: moderateScale(63),
                  borderRadius: moderateScale(40),
                  backgroundColor: "rgba(239,133,143,0.4)",
                  borderColor: colors.status.overdue,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    ...typography.heading,
                    color: colors.status.overdue,
                  }}
                >
                  {overdueTasks.length}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.body,
                  marginTop: 10,
                  color: colors.status.overdue,
                  marginLeft: 13,
                }}
              >
                Overdue
              </Text>
            </View>

            {/* Pending */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  height: moderateScale(63),
                  width: moderateScale(63),
                  borderRadius: moderateScale(40),
                  backgroundColor: "rgba(255, 192, 104, 0.3)",
                  borderColor: colors.status.pending,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    ...typography.heading,
                    color: colors.status.pending,
                  }}
                >
                  {pendingTasks.length}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.body,
                  marginTop: 10,
                  color: colors.status.pending,
                }}
              >
                Pending
              </Text>
            </View>

            {/* In Review */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  height: moderateScale(63),
                  width: moderateScale(63),
                  borderRadius: moderateScale(40),
                  backgroundColor: "rgba(100,150,255,0.2)",
                  borderColor: colors.status.inReview,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    ...typography.heading,
                    color: colors.status.inReview,
                  }}
                >
                  {reviewTasks.length}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.body,
                  marginTop: 10,
                  color: colors.status.inReview,
                }}
              >
                In Review
              </Text>
            </View>

            {/* Completed */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  height: moderateScale(63),
                  width: moderateScale(63),
                  borderRadius: moderateScale(40),
                  backgroundColor: "rgba(100,220,120,0.2)",
                  borderColor: colors.status.completed,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    ...typography.heading,
                    color: colors.status.completed,
                  }}
                >
                  {completedTasks.length}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.body,
                  marginTop: 10,
                  color: colors.status.completed,
                }}
              >
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* ── Action Buttons Row ── */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginHorizontal: wp(8.8), flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push("(task)/newtaskemp")}
              style={{
                backgroundColor: colors.brand.accent,
                padding: 14,
                width: "100%",
                height: moderateScale(60),
                borderRadius: 32,
                flexDirection: "row",
                marginTop: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                style={{ marginRight: 10 }}
                name="add"
                size={28}
                color={colors.base.surfaceL1}
              />
              <Text
                style={{
                  ...typography.subheading,
                  color: colors.base.surfaceL1,
                  textAlign: "center",
                }}
              >
                Add a New Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Overdue Accordion ── */}
        <View
          style={{
            marginHorizontal: wp(8.8),
            marginTop: hp(3.7),
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 19,
            backgroundColor: colors.base.surfaceL1,
          }}
        >
          <View
            style={{
              height: moderateScale(60),
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{ ...typography.subheading, color: colors.status.overdue }}
            >
              Overdue
            </Text>
            <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
              <Ionicons
                name={
                  showOverdue ? "chevron-up-outline" : "chevron-down-outline"
                }
                size={30}
                color={colors.base.surfaceL1}
                style={{
                  backgroundColor: colors.status.overdue,
                  borderRadius: 10,
                  padding: 2,
                }}
              />
            </TouchableOpacity>
          </View>
          {showOverdue && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {overdueTasks.length === 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 20,
                    marginHorizontal: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: colors.base.border,
                    backgroundColor: colors.base.surfaceL2,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={colors.status.overdue}
                    style={{ opacity: 0.6, marginRight: 8 }}
                  />
                  <Text
                    style={{ ...typography.body, color: colors.text.secondary }}
                  >
                    No tasks are overdue
                  </Text>
                </View>
              ) : (
                overdueTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(task)/task-detail",
                        params: { taskId: task.id },
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      gap: 12,
                      borderColor: colors.base.border,
                      borderWidth: 1,
                      margin: 10,
                    }}
                  >
                    <View
                      style={{
                        height: moderateScale(24),
                        width: moderateScale(24),
                        borderRadius: moderateScale(12),
                        borderWidth: 2,
                        borderColor: colors.status.overdue,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          height: moderateScale(12),
                          width: moderateScale(12),
                          borderRadius: moderateScale(6),
                          backgroundColor: colors.status.overdue,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                      }}
                    >
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* ── Pending Accordion ── */}
        <View
          style={{
            marginHorizontal: wp(8.8),
            marginTop: hp(2.5),
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 19,
            backgroundColor: colors.base.surfaceL1,
          }}
        >
          <View
            style={{
              height: moderateScale(60),
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{ ...typography.subheading, color: colors.status.pending }}
            >
              Pending
            </Text>
            <TouchableOpacity onPress={() => setShowPending(!showPending)}>
              <Ionicons
                name={
                  showPending ? "chevron-up-outline" : "chevron-down-outline"
                }
                size={30}
                color={colors.base.surfaceL1}
                style={{
                  backgroundColor: colors.status.pending,
                  borderRadius: 10,
                  padding: 2,
                }}
              />
            </TouchableOpacity>
          </View>
          {showPending && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {pendingTasks.length === 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 20,
                    marginHorizontal: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: colors.base.border,
                    backgroundColor: colors.base.surfaceL2,
                  }}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={22}
                    color={colors.status.pending}
                    style={{ opacity: 0.6, marginRight: 8 }}
                  />
                  <Text
                    style={{ ...typography.body, color: colors.text.secondary }}
                  >
                    Nothing pending right now
                  </Text>
                </View>
              ) : (
                pendingTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(task)/task-detail",
                        params: { taskId: task.id },
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      gap: 12,
                      borderColor: colors.base.border,
                      borderWidth: 1,
                      margin: 10,
                    }}
                  >
                    <View
                      style={{
                        height: moderateScale(24),
                        width: moderateScale(24),
                        borderRadius: moderateScale(12),
                        borderWidth: 2,
                        borderColor: colors.status.pending,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          height: moderateScale(12),
                          width: moderateScale(12),
                          borderRadius: moderateScale(6),
                          backgroundColor: colors.status.pending,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                      }}
                    >
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* ── In Review Accordion ── */}
        <View
          style={{
            marginHorizontal: wp(8.8),
            marginTop: hp(2.5),
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 19,
            backgroundColor: colors.base.surfaceL1,
          }}
        >
          <View
            style={{
              height: moderateScale(60),
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                ...typography.subheading,
                color: colors.status.inReview,
              }}
            >
              In Review
            </Text>
            <TouchableOpacity onPress={() => setShowReview(!showReview)}>
              <Ionicons
                name={
                  showReview ? "chevron-up-outline" : "chevron-down-outline"
                }
                size={30}
                color={colors.base.surfaceL1}
                style={{
                  backgroundColor: colors.status.inReview,
                  borderRadius: 10,
                  padding: 2,
                }}
              />
            </TouchableOpacity>
          </View>
          {showReview && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {reviewTasks.length === 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 20,
                    marginHorizontal: 10,
                    marginBottom: 8,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: colors.base.border,
                    backgroundColor: colors.base.surfaceL2,
                  }}
                >
                  <Ionicons
                    name="eye-outline"
                    size={22}
                    color={colors.status.inReview}
                    style={{ opacity: 0.6, marginRight: 8 }}
                  />
                  <Text
                    style={{ ...typography.body, color: colors.text.secondary }}
                  >
                    Nothing in review
                  </Text>
                </View>
              ) : (
                reviewTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(task)/task-detail",
                        params: { taskId: task.id },
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      gap: 12,
                      borderColor: colors.base.border,
                      borderWidth: 1,
                      margin: 10,
                    }}
                  >
                    <View
                      style={{
                        height: moderateScale(24),
                        width: moderateScale(24),
                        borderRadius: moderateScale(12),
                        borderWidth: 2,
                        borderColor: colors.status.inReview,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          height: moderateScale(12),
                          width: moderateScale(12),
                          borderRadius: moderateScale(6),
                          backgroundColor: colors.status.inReview,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                      }}
                    >
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* ── Completed Accordion ── */}
        <View
          style={{
            marginHorizontal: wp(8.8),
            marginTop: hp(2.5),
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 19,
            backgroundColor: colors.base.surfaceL1,
          }}
        >
          <View
            style={{
              height: moderateScale(60),
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                ...typography.subheading,
                color: colors.status.completed,
              }}
            >
              Completed
            </Text>
            <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
              <Ionicons
                name={
                  showCompleted ? "chevron-up-outline" : "chevron-down-outline"
                }
                size={30}
                color={colors.base.surfaceL1}
                style={{
                  backgroundColor: colors.status.completed,
                  borderRadius: 10,
                  padding: 2,
                }}
              />
            </TouchableOpacity>
          </View>
          {showCompleted && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {completedTasks.length === 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 20,
                    marginHorizontal: 10,
                    marginBottom: 8,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: colors.base.border,
                    backgroundColor: colors.base.surfaceL2,
                  }}
                >
                  <Ionicons
                    name="trophy-outline"
                    size={22}
                    color={colors.status.completed}
                    style={{ opacity: 0.6, marginRight: 8 }}
                  />
                  <Text
                    style={{ ...typography.body, color: colors.text.secondary }}
                  >
                    No completed tasks yet
                  </Text>
                </View>
              ) : (
                completedTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(task)/task-detail",
                        params: { taskId: task.id },
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      gap: 12,
                      borderColor: colors.base.border,
                      borderWidth: 1,
                      margin: 10,
                    }}
                  >
                    <View
                      style={{
                        height: moderateScale(24),
                        width: moderateScale(24),
                        borderRadius: moderateScale(12),
                        borderWidth: 2,
                        borderColor: colors.status.completed,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          height: moderateScale(12),
                          width: moderateScale(12),
                          borderRadius: moderateScale(6),
                          backgroundColor: colors.status.completed,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                      }}
                    >
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
