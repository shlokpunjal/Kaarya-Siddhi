import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Text,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { useRouter } from "expo-router";
import { wp, moderateScale } from "../../utils/responsive";
import { supabase } from "../../lib/supabase";
import CalendarScreenSkeleton from "../../components/CalendarScreenSkeleton";



// Removes any existing channel with this name before creating a new one —
// prevents "cannot add postgres_changes callbacks... after subscribe()"
// errors caused by Strict Mode / Fast Refresh double-invoking effects.
function getFreshChannel(name: string) {
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}
type TaskCategory = "completed" | "inReview" | "pending" | "overdue";
interface Task { id: string; title: string; descp: string; category: TaskCategory; }

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number): string[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDow + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: string[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push(toDateString(prevYear, prevMonth, daysInPrev - i));
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(toDateString(year, month, d));
  let nd = 1;
  while (cells.length < 42)
    cells.push(toDateString(nextYear, nextMonth, nd++));
  return cells;
}

// ── Supabase row → Task mapping ────────────────────────────────────────────

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: string;
  assigned_to: string;
  created_by: string;
  deadline: string; // timestamp
  workspace_id: string;
};

function mapStatusToCategory(status: TaskRow["status"], deadline: string): TaskCategory {
  if (status === "completed") return "completed";
  if (status === "in_review") return "inReview";

  // Compare calendar dates only (not exact timestamps) so a task stays
  // "pending" for the entirety of its deadline day, and only becomes
  // "overdue" starting the day after.
  const deadlineDate = deadline ? deadline.slice(0, 10) : null;
  const todayDate = new Date().toISOString().slice(0, 10);
  const isPastDeadline = deadlineDate ? deadlineDate < todayDate : false;
  return isPastDeadline ? "overdue" : "pending";
}

function groupTasksByDate(rows: TaskRow[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  rows.forEach((row) => {
    if (!row.deadline) return;
    const dateKey = row.deadline.slice(0, 10); // YYYY-MM-DD from timestamp
    const task: Task = {
      id: row.id,
      title: row.title,
      descp: row.description ?? "",
      category: mapStatusToCategory(row.status, row.deadline),
    };
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(task);
  });
  return map;
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { brand, base, text, status } = colors;
  const router = useRouter();
  const todayISO = new Date().toISOString().split("T")[0];
  const todayY = parseInt(todayISO.slice(0, 4), 10);
  const todayM = parseInt(todayISO.slice(5, 7), 10);

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM);
  const [selected, setSelected] = useState(todayISO);

  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // ── Resolve employee's user id, fetch their tasks, realtime subscribe ───
  useEffect(() => {
    let isMounted = true;
    let tasksChannel: ReturnType<typeof supabase.channel> | null = null;
    let createdTasksChannel: ReturnType<typeof supabase.channel> | null = null;
    let extensionsChannel: ReturnType<typeof supabase.channel> | null = null;
    const fetchTasks = async (userId: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

      if (error) {
        console.error("Error fetching calendar tasks:", error.message);
        return;
      }
      if (isMounted) setTasksMap(groupTasksByDate((data ?? []) as TaskRow[]));
    };

    const init = async () => {
      setLoading(true);
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userError || !userRow) {
        console.error("Error resolving employee id:", userError?.message);
        if (isMounted) setLoading(false);
        return;
      }

      const userId = userRow.id as string;
      if (isMounted) setEmployeeId(userId);

      await fetchTasks(userId);
      if (isMounted) setLoading(false);

      tasksChannel = getFreshChannel("employee-calendar-tasks-assigned")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${userId}` },
          () => { fetchTasks(userId); }
        )
        .subscribe();

      createdTasksChannel = getFreshChannel("employee-calendar-tasks-created")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `created_by=eq.${userId}` },
          () => { fetchTasks(userId); }
        )
        .subscribe();

      extensionsChannel = getFreshChannel("employee-calendar-extension-requests")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "extension_requests", filter: `requested_by=eq.${userId}` },
          () => { fetchTasks(userId); }
        )
        .subscribe();
         };
    init();

    return () => {
      isMounted = false;
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (createdTasksChannel) supabase.removeChannel(createdTasksChannel);
      if (extensionsChannel) supabase.removeChannel(extensionsChannel);
    };
  }, []);

  // ── Pull-to-refresh: re-fetch on demand ──────────────────────────────────
  const onRefresh = useCallback(async () => {
    if (!employeeId) return;
    setRefreshing(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`assigned_to.eq.${employeeId},created_by.eq.${employeeId}`);
    if (error) {
      console.error("Error refreshing calendar tasks:", error.message);
    } else {
      setTasksMap(groupTasksByDate((data ?? []) as TaskRow[]));
    }
    setRefreshing(false);
  }, [employeeId]);

  const categoryColor: Record<TaskCategory, string> = {
    completed: status.completed,
    inReview: status.inReview,
    pending: status.pending,
    overdue: status.overdue,
  };
  const categoryLabel: Record<TaskCategory, string> = {
    completed: "Completed",
    inReview: "In Review",
    pending: "Pending",
    overdue: "Overdue",
  };

  function getCats(ds: string): TaskCategory[] {
    const t = tasksMap[ds];
    if (!t) return [];
    return Array.from(new Set(t.map(x => x.category)));
  }

  function goPrev() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function goNext() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  const grid = buildGrid(viewYear, viewMonth);
  const curPrefix = toDateString(viewYear, viewMonth, 1).slice(0, 7);
  // Hide 6th row if fully overflow
  const rowCount = grid.slice(35, 42).every(ds => ds.slice(0, 7) !== curPrefix) ? 5 : 6;

  if (loading) {
    return (
      <CalendarScreenSkeleton />
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: base.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} colors={[brand.accent]} />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header]}>
        <Text style={[typography.heading, { color: text.primary }]}>Calendar</Text>
      </View>

      {/* ── Calendar card ──────────────────────────────────────────────── */}
      <View style={s.calendarBlock}>
        <View style={[s.calendarCard, { backgroundColor: base.surfaceL1, borderColor: base.border }]}>

          {/* Month nav */}
          <View style={s.monthRow}>
            <Pressable onPress={goPrev} hitSlop={12}>
              <Text style={[s.arrow, { color: brand.accent }]}>‹</Text>
            </Pressable>
            <Text style={[s.monthTitle, { color: text.primary }]}>
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </Text>
            <Pressable onPress={goNext} hitSlop={12}>
              <Text style={[s.arrow, { color: brand.accent }]}>›</Text>
            </Pressable>
          </View>
          {/* Divider between month nav and weekday labels */}
          <View style={[s.monthDivider, { backgroundColor: base.border }]} />

          {/* Weekday labels row — no individual borders, just a bottom divider */}
          <View style={[s.weekRow, { borderBottomColor: base.border }]}>
            {DAYS.map((d, i) => (
              <Text
                key={i}
                style={[
                  s.weekDay,
                  { color: text.secondary },
                  i === 6 && { color: status.overdue, fontFamily: "Poppins-SemiBold" },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Grid — solid table, dividers only between rows and columns */}
          <View style={s.grid}>
            {Array.from({ length: rowCount }).map((_, rowIdx) => {
              const isLastRow = rowIdx === rowCount - 1;
              return (
                <View
                  key={rowIdx}
                  style={[
                    s.gridRow,
                    { borderBottomColor: base.border },
                    isLastRow && { borderBottomWidth: 0 },
                  ]}
                >
                  {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((ds, colIdx) => {
                    const isCurrent = ds.slice(0, 7) === curPrefix;
                    const isToday = ds === todayISO;
                    const isSel = ds === selected;
                    const cats = getCats(ds);
                    const hasTasks = cats.length > 0 && isCurrent;
                    const isLastCol = colIdx === 6;
                    const isFirstCol = colIdx === 0;
                    const cellIsLastRow = isLastRow;

                    const onPress = () => {
                      const y = parseInt(ds.slice(0, 4), 10);
                      const m = parseInt(ds.slice(5, 7), 10);
                      if (y !== viewYear || m !== viewMonth) {
                        setViewYear(y);
                        setViewMonth(m);
                      }
                      setSelected(ds);
                    };

                    return (
                      <Pressable
                        key={ds}
                        onPress={onPress}
                        style={[
                          s.cell,
                          {
                            borderRightColor: base.border,
                            borderRightWidth: isLastCol ? 0 : 1,
                          },
                        ]}
                      >
                        {isToday && (
                          <View
                            pointerEvents="none"
                            style={[
                              s.todayBox,
                              { backgroundColor: brand.accent },
                              cellIsLastRow && { bottom: 0 },
                              isFirstCol && { left: 0 },
                              isLastCol && { right: 0 },
                            ]}
                          />
                        )}

                        {isSel && isCurrent && !isToday && (
                          <View
                            pointerEvents="none"
                            style={[
                              s.selectedBox,
                              { borderColor: brand.accent },
                              cellIsLastRow && { bottom: 0 },
                              isFirstCol && { left: 0 },
                              isLastCol && { right: 0 },
                            ]}
                          />
                        )}
                        {/* Date number — centered, dots stacked below */}
                        <View style={s.cellInner}>
                          <Text
                            style={[
                              s.cellNum,
                              { color: isCurrent ? text.primary : text.secondary },
                              !isCurrent && { opacity: 0.28 },
                              colIdx === 6 && isCurrent && {
                                color: status.overdue,
                                fontFamily: "Poppins-SemiBold",
                              },
                              isToday && { color: "#FFFFFF", fontFamily: "Poppins-SemiBold" },
                            ]}
                          >
                            {parseInt(ds.slice(8), 10)}
                          </Text>

                          {/* Category dots — below number */}
                          {hasTasks && (
                            <View style={s.dotsRow}>
                              {cats.map(cat => (
                                <View
                                  key={cat}
                                  style={[s.dot, { backgroundColor: categoryColor[cat] }]}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={[s.legend, { borderTopColor: base.border }]}>
            {(Object.keys(categoryColor) as TaskCategory[]).map(cat => (
              <View key={cat} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: categoryColor[cat] }]} />
                <Text style={[s.legendLabel, { color: text.secondary }]}>
                  {categoryLabel[cat]}
                </Text>
              </View>
            ))}
          </View>

        </View>
      </View>

      {/* ── Task section ───────────────────────────────────────────────── */}
      <View style={s.taskSection}>
        <Text style={[s.taskHeading, { color: brand.secprimary }]}>
          {selected === todayISO ? "Today" : selected}
        </Text>

        <View style={s.taskScroll}>
          {tasksMap[selected]?.length ? (
            tasksMap[selected].map((task, i) => (
              <Pressable
                key={task.id ?? i}
                onPress={() =>
                  router.push({ pathname: "/(task)/task-detail", params: { taskId: task.id } })
                }
                style={[
                  s.taskCard,
                  {
                    backgroundColor: base.surfaceL1,
                    borderColor: base.border,
                    borderLeftColor: categoryColor[task.category],
                  },
                ]}
              >
                <View style={s.taskCardHeader}>
                  <Text style={[s.taskTitle, { color: text.primary }]}>{task.title}</Text>
                  <View style={[s.badge, { backgroundColor: `${categoryColor[task.category]}22` }]}>
                    <Text style={[s.badgeText, { color: categoryColor[task.category] }]}>
                      {categoryLabel[task.category]}
                    </Text>
                  </View>
                </View>
                <Text style={[s.taskDesc, { color: text.secondary }]}>{task.descp}</Text>
              </Pressable>
            ))
          ) : (
            <View style={[s.emptyState, { borderColor: base.border }]}>
              <Text style={[s.emptyTitle, { color: text.secondary }]}>No tasks scheduled</Text>
              <Text style={[s.emptySubtitle, { color: text.secondary }]}>This day is clear</Text>
            </View>
          )}
        </View>
      </View>

    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    height: moderateScale(60),
    justifyContent: "center",
    paddingLeft: 22,
    marginTop: Platform.OS === "android" ? 22 : 30,
  },
  headerText: { fontFamily: "Poppins-SemiBold" },

  /* Calendar card */
  calendarBlock: { paddingHorizontal: wp(3.2), paddingTop: 1, paddingBottom: 4 },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },

  /* Month nav */
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(3.7),
    paddingTop: 8,
    paddingBottom: 4,
  },
  arrow: { fontSize: moderateScale(34), lineHeight: 36, fontFamily: "Poppins-Regular" },
  monthTitle: { fontSize: moderateScale(28), fontFamily: "Poppins-SemiBold" },

  /* Weekday header */
  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: moderateScale(10),
    fontFamily: "Poppins-Medium",
    paddingVertical: 4,
  },

  /* Grid — no outer padding so cells touch card edges */
  grid: {},

  /* One week row — bottom border acts as horizontal divider */
  gridRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  /* Divider line between month nav and weekday labels */
  monthDivider: {
    height: 1,
    marginHorizontal:0,
    marginBottom: 8,
  },
  cell: {
    flex: 1,
    height: moderateScale(46),
    justifyContent: "center",   // vertically center content
    alignItems: "center",       // horizontally center content
    paddingTop: 0,
    paddingLeft: 0,
    position: "relative",
  },

  /* Today — bleeds 1px past the cell's own edges so it fully covers the
     grid divider lines instead of leaving a sliver visible around it */
  todayBox: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 4,
  },

  /* Selected (non-today) — same 1px bleed, border only, no fill */
  selectedBox: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderRadius: 4,
  },
  /* Date + dots column, centered in cell */
  cellInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  /* Date number */
  cellNum: {
    fontSize: moderateScale(12),
    fontFamily: "Poppins-Regular",
    lineHeight: 15,
    textAlign: "center",
  },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: moderateScale(4), height: moderateScale(4), borderRadius: 2 },

  /* Legend */
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: moderateScale(7), height: moderateScale(7), borderRadius: 4 },
  legendLabel: { fontSize: moderateScale(10), fontFamily: "Poppins-Regular" },

  /* Task section */
  taskSection: { flex: 1, paddingHorizontal: wp(3.2), paddingTop: 10 },
  taskHeading: { fontSize: moderateScale(15), fontFamily: "Poppins-SemiBold", marginBottom: 8 },
  taskScroll: { paddingBottom: 24 },

  taskCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  taskCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  taskTitle: { fontSize: moderateScale(14), fontFamily: "Poppins-Medium", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: moderateScale(10), fontFamily: "Poppins-Medium" },
  taskDesc: { fontSize: moderateScale(12), fontFamily: "Poppins-Regular", lineHeight: 18 },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 8,
  },
  emptyTitle: { fontSize: moderateScale(14), fontFamily: "Poppins-Medium" },
  emptySubtitle: { fontSize: moderateScale(12), fontFamily: "Poppins-Regular", marginTop: 4, opacity: 0.6 },
});
