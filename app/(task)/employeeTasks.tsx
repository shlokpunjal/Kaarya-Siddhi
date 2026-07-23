import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { Task } from "../../types/task";
import { wp, hp, moderateScale } from "../../utils/responsive";
import DashboardSkeleton from "../../components/DashboardSkeleton";
import {authFetch} from "../../utils/authFetch";

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

export default function EmployeeTasks() {
  const { colors } = useTheme();
  const router = useRouter();
  const { employeeEmail, employeeName } = useLocalSearchParams<{
    employeeEmail: string;
    employeeName: string;
  }>();

  const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch tasks assigned to this specific employee ────────────────────────
  const fetchEmployeeTasks = useCallback(
    async (isMounted: () => boolean = () => true) => {
      if (!employeeEmail) return;

      const res = await authFetch(
        `/tasks?employee_email=${encodeURIComponent(employeeEmail)}`,
      );
      if (!res.ok) {
        console.error("Error fetching employee tasks:", res.status);
      } else if (isMounted()) {
        const data = await res.json();
        setTasks((data ?? []).map(mapRowToTask));
      }
    },
    [employeeEmail],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchEmployeeTasks(() => mounted).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [fetchEmployeeTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployeeTasks();
    setRefreshing(false);
  }, [fetchEmployeeTasks]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const overdueTasks = tasks.filter((t) => t.status === "overdue");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const reviewTasks = tasks.filter((t) => t.status === "inReview");
  const completedTasks = tasks.filter((t) => t.status === "completed");

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingRight: wp(4),
            marginTop: hp(2.5),
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginLeft: wp(4), padding: 4 }}
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <View style={{ marginLeft: wp(2) }}>
            <Text
              style={{ ...typography.subheading, color: colors.text.secondary }}
            >
              Tasks assigned to
            </Text>
            <Text
              style={{
                ...typography.heading,
                color: colors.text.primary,
                marginTop: 2,
              }}
            >
              {employeeName ?? "Employee"}
            </Text>
          </View>
        </View>

        {/* ── Metrics Matrix Container ── */}
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
                style={{ ...typography.heading, color: colors.status.overdue }}
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
                style={{ ...typography.heading, color: colors.status.pending }}
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
                style={{ ...typography.heading, color: colors.status.inReview }}
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

        {tasks.length === 0 && (
          <View
            style={{
              alignItems: "center",
              marginTop: hp(6),
              paddingHorizontal: wp(10),
            }}
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color={colors.text.secondary}
            />
            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              No tasks assigned to {employeeName ?? "this employee"} yet.
            </Text>
          </View>
        )}

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
              {overdueTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(task)/taskDetailAdmin",
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
              ))}
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
              {pendingTasks.map((task) => (
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
              ))}
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
              {reviewTasks.map((task) => (
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
              ))}
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
              {completedTasks.map((task) => (
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
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
