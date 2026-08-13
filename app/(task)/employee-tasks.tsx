import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, hp, moderateScale } from "../../utils/responsive";
import DashboardSkeleton from "../../components/skeletonScreens/Dashboard/DashboardSkeleton";
import TaskAccordion from "../../components/dashboard/TaskAccordion";
import { useDashboardTasks } from "../../hooks/useDashboardTasks";

// If your actual file is named differently (e.g. "taskDetailAdmin"),
// change this one line — every task press below uses this constant now,
// so there's only one place that can go stale.
const TASK_DETAIL_ROUTE = "/(task)/task-detail-admin";

type StatusKey = "overdue" | "pending" | "inReview" | "completed";

export default function EmployeeTasks() {
  const { colors } = useTheme();
  const router = useRouter();
  const { employeeEmail, employeeName } = useLocalSearchParams<{
    employeeEmail: string;
    employeeName: string;
  }>();

  // Same hook the employee's own dashboard uses — just pointed at a
  // specific employee's tasks instead of the logged-in user's own.
  const { tasks, loading, refreshing, onRefresh } = useDashboardTasks("admin", employeeEmail);

  // Single source of truth for which accordion(s) are open, keyed by status.
  const [expanded, setExpanded] = useState<Record<StatusKey, boolean>>({
    overdue: false,
    pending: false,
    inReview: false,
    completed: false,
  });

  const toggleExpanded = (key: StatusKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Circles always EXPAND (not toggle) — clicking a circle should reveal
  // that section, matching user instinct, even if it's already open.
  const expandSection = (key: StatusKey) => {
    setExpanded((prev) => ({ ...prev, [key]: true }));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const overdueTasks = tasks.filter((t) => t.status === "overdue");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const reviewTasks = tasks.filter((t) => t.status === "inReview");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Drives both the circles above and the TaskAccordion list below, so
  // they can't drift out of sync with each other.
  const sections: {
    key: StatusKey;
    label: string;
    color: string;
    circleBg: string;
    tasksForStatus: typeof tasks;
    emptyIcon: keyof typeof Ionicons.glyphMap;
    emptyMessage: string;
  }[] = [
    {
      key: "overdue",
      label: "Overdue",
      color: colors.status.overdue,
      circleBg: "rgba(239,133,143,0.4)",
      tasksForStatus: overdueTasks,
      emptyIcon: "checkmark-circle-outline",
      emptyMessage: "No tasks are overdue",
    },
    {
      key: "pending",
      label: "Pending",
      color: colors.status.pending,
      circleBg: "rgba(255, 192, 104, 0.3)",
      tasksForStatus: pendingTasks,
      emptyIcon: "hourglass-outline",
      emptyMessage: "Nothing pending right now",
    },
    {
      key: "inReview",
      label: "In Review",
      color: colors.status.inReview,
      circleBg: "rgba(100,150,255,0.2)",
      tasksForStatus: reviewTasks,
      emptyIcon: "eye-outline",
      emptyMessage: "Nothing in review",
    },
    {
      key: "completed",
      label: "Completed",
      color: colors.status.completed,
      circleBg: "rgba(100,220,120,0.2)",
      tasksForStatus: completedTasks,
      emptyIcon: "trophy-outline",
      emptyMessage: "No completed tasks yet",
    },
  ];

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
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: wp(4), padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ marginLeft: wp(2) }}>
            <Text style={{ ...typography.subheading, color: colors.text.secondary }}>Tasks assigned to</Text>
            <Text style={{ ...typography.heading, color: colors.text.primary, marginTop: 2 }}>
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
          {sections.map((section) => (
            <TouchableOpacity
              key={section.key}
              activeOpacity={0.7}
              onPress={() => expandSection(section.key)}
              style={{ alignItems: "center" }}
            >
              <View
                style={{
                  height: moderateScale(63),
                  width: moderateScale(63),
                  borderRadius: moderateScale(40),
                  backgroundColor: section.circleBg,
                  borderColor: section.color,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ ...typography.heading, color: section.color }}>
                  {section.tasksForStatus.length}
                </Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: section.color }}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tasks.length === 0 && (
          <View style={{ alignItems: "center", marginTop: hp(6), paddingHorizontal: wp(10) }}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.text.secondary} />
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

        {/* ── Status Accordions — same component the employee's own dashboard uses ── */}
        {sections.map((section, index) => (
          <TaskAccordion
            key={section.key}
            isFirst={index === 0}
            label={section.label}
            color={section.color}
            tasks={section.tasksForStatus}
            expanded={expanded[section.key]}
            onToggle={() => toggleExpanded(section.key)}
            taskDetailRoute={TASK_DETAIL_ROUTE}
            emptyIcon={section.emptyIcon}
            emptyMessage={section.emptyMessage}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}