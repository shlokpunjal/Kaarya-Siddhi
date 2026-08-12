import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ImageSourcePropType } from "react-native";
import { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { getGreeting } from "../../utils/greeting";
import { wp, hp, moderateScale } from "../../utils/responsive";
import DashboardSkeleton from "../skeletonScreens/Dashboard/DashboardSkeleton";
import EmptyTasksScreen from "./EmptyTasksScreen";
import TaskAccordion from "./TaskAccordion";
import { useDashboardTasks } from "../../hooks/useDashboardTasks";

type Role = "employee" | "admin";

type TaskDashboardProps = {
  role: Role;
  newTaskRoute: string;
  notificationsRoute: string;
  taskDetailRoute: string;
  emptyIllustration: ImageSourcePropType;
};

export default function TaskDashboard({
  role,
  newTaskRoute,
  notificationsRoute,
  taskDetailRoute,
  emptyIllustration,
}: TaskDashboardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { tasks, loading, refreshing, onRefresh, badgeCount } = useDashboardTasks(role);

const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const overdueRef = useRef<View>(null);
  const pendingRef = useRef<View>(null);
  const reviewRef = useRef<View>(null);
  const completedRef = useRef<View>(null);

  const sectionMap = {
    Overdue: { setShow: setShowOverdue, ref: overdueRef },
    Pending: { setShow: setShowPending, ref: pendingRef },
    "In Review": { setShow: setShowReview, ref: reviewRef },
    Completed: { setShow: setShowCompleted, ref: completedRef },
  };

  const sectionOffsets = useRef<Record<string, number>>({});

  const handleSectionLayout = (label: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionOffsets.current[label] = e.nativeEvent.layout.y;
  };

  const handleMetricPress = (label: string) => {
    const section = sectionMap[label as keyof typeof sectionMap];
    if (!section) return;

    section.setShow(true); // auto-open the dropdown

    // wait a tick for the expand animation/re-render, then scroll using the last known offset
    setTimeout(() => {
      const y = sectionOffsets.current[label];
      if (y !== undefined) {
        scrollViewRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
      }
    }, 100);
  };
  if (loading) return <DashboardSkeleton />;

  const overdueTasks = tasks.filter((t) => t.status === "overdue");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const reviewTasks = tasks.filter((t) => t.status === "inReview");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (
    overdueTasks.length === 0 &&
    pendingTasks.length === 0 &&
    reviewTasks.length === 0 &&
    completedTasks.length === 0
  ) {
    return (
      <EmptyTasksScreen
        badgeCount={badgeCount}
        illustration={emptyIllustration}
        notificationsRoute={notificationsRoute}
        newTaskRoute={newTaskRoute}
      />
    );
  }

  const metrics = [
    { count: overdueTasks.length, label: "Overdue", color: colors.status.overdue, bg: "rgba(239,133,143,0.4)" },
    { count: pendingTasks.length, label: "Pending", color: colors.status.pending, bg: "rgba(255,192,104,0.3)" },
    { count: reviewTasks.length, label: "In Review", color: colors.status.inReview, bg: "rgba(100,150,255,0.2)" },
    { count: completedTasks.length, label: "Completed", color: colors.status.completed, bg: "rgba(100,220,120,0.2)" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView
        ref={scrollViewRef}
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
        {/* ── Header ── */}
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingRight: wp(4),
            }}
          >
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

            <TouchableOpacity
              onPress={() => router.push(notificationsRoute)}
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
              {badgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    height: moderateScale(10),
                    width: moderateScale(10),
                    borderRadius: moderateScale(5),
                    backgroundColor: colors.status.pending,
                  }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* ── Metrics ── */}
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
            {metrics.map((metric, i) => (
              <TouchableOpacity
                key={metric.label}
                activeOpacity={0.7}
                onPress={() => handleMetricPress(metric.label)}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    marginLeft: i === 0 ? wp(3.2) : 0,
                    height: moderateScale(63),
                    width: moderateScale(63),
                    borderRadius: moderateScale(40),
                    backgroundColor: metric.bg,
                    borderColor: metric.color,
                    borderWidth: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ ...typography.heading, color: metric.color }}>{metric.count}</Text>
                </View>
                <Text
                  style={{
                    ...typography.body,
                    marginTop: 10,
                    color: metric.color,
                    marginLeft: i === 0 ? 13 : 0,
                  }}
                >
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Add task ── */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginHorizontal: wp(8.8), flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push(newTaskRoute)}
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
              <Ionicons style={{ marginRight: 10 }} name="add" size={28} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, textAlign: "center" }}>
                Add a New Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Accordions ── */}
        <View ref={overdueRef} onLayout={handleSectionLayout("Overdue")}>
          <TaskAccordion
            isFirst
            label="Overdue"
            color={colors.status.overdue}
            tasks={overdueTasks}
            expanded={showOverdue}
            onToggle={() => setShowOverdue(!showOverdue)}
            taskDetailRoute={taskDetailRoute}
            emptyIcon="checkmark-circle-outline"
            emptyMessage="No tasks are overdue"
          />
        </View>
       <View ref={pendingRef} onLayout={handleSectionLayout("Pending")}>
          <TaskAccordion
            label="Pending"
            color={colors.status.pending}
            tasks={pendingTasks}
            expanded={showPending}
            onToggle={() => setShowPending(!showPending)}
            taskDetailRoute={taskDetailRoute}
            emptyIcon="hourglass-outline"
            emptyMessage="Nothing pending right now"
          />
        </View>
        <View ref={reviewRef} onLayout={handleSectionLayout("In Review")}>
          <TaskAccordion
            label="In Review"
            color={colors.status.inReview}
            tasks={reviewTasks}
            expanded={showReview}
            onToggle={() => setShowReview(!showReview)}
            taskDetailRoute={taskDetailRoute}
            emptyIcon="eye-outline"
            emptyMessage="Nothing in review"
          />
        </View>
        <View ref={completedRef} onLayout={handleSectionLayout("Completed")}>
          <TaskAccordion
            label="Completed"
            color={colors.status.completed}
            tasks={completedTasks}
            expanded={showCompleted}
            onToggle={() => setShowCompleted(!showCompleted)}
            taskDetailRoute={taskDetailRoute}
            emptyIcon="trophy-outline"
            emptyMessage="No completed tasks yet"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}