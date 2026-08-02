// components/CalendarView.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Text, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { useRouter } from "expo-router";
import { wp, moderateScale } from "../../utils/responsive";
import { supabase } from "../../lib/supabase";
import CalendarScreenSkeleton from "../skeletonScreens/Calendar/CalendarScreenSkeleton";
import { authFetch } from "../../utils/authFetch";
import {
  DAYS, MONTH_NAMES, Task, TaskCategory, TaskRow,
  toDateString, buildGrid, groupTasksByDate,
} from "../../utils/calendarGrid";
import { getFreshChannel } from "../../services/realtimeService";

interface ChannelConfig { name: string; table: string; filter: string }

interface CalendarViewProps {
  taskDetailRoute: string;
  // given the /me response, return which realtime channels to open
  buildChannels: (currentUser: any) => ChannelConfig[];
}

export default function CalendarView({ taskDetailRoute, buildChannels }: CalendarViewProps) {
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
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const fetchTasks = async () => {
      const res = await authFetch("/calendar-tasks");
      if (!res.ok) { console.error("Error fetching calendar tasks:", res.status); return; }
      const data = await res.json();
      if (isMounted) setTasksMap(groupTasksByDate((data ?? []) as TaskRow[]));
    };

    const init = async () => {
      setLoading(true);
      const meRes = await authFetch("/me");
      if (!meRes.ok) { if (isMounted) setLoading(false); return; }
      const currentUser = await meRes.json();
      readyRef.current = true;
      if (isMounted) setReady(true);

      await fetchTasks();
      if (isMounted) setLoading(false);

      buildChannels(currentUser).forEach((cfg) => {
        const ch = getFreshChannel(cfg.name)
          .on("postgres_changes", { event: "*", schema: "public", table: cfg.table, filter: cfg.filter }, () => fetchTasks())
          .subscribe();
        channels.push(ch);
      });
    };

    init();
    return () => { isMounted = false; channels.forEach((c) => supabase.removeChannel(c)); };
  }, []);

  const onRefresh = useCallback(async () => {
    if (!readyRef.current) return;
    setRefreshing(true);
    const res = await authFetch("/calendar-tasks");
    if (!res.ok) console.error("Error refreshing calendar tasks:", res.status);
    else setTasksMap(groupTasksByDate(((await res.json()) ?? []) as TaskRow[]));
    setRefreshing(false);
  }, [ready]);

  const categoryColor: Record<TaskCategory, string> = { completed: status.completed, inReview: status.inReview, pending: status.pending, overdue: status.overdue };
  const categoryLabel: Record<TaskCategory, string> = { completed: "Completed", inReview: "In Review", pending: "Pending", overdue: "Overdue" };

  function getCats(ds: string): TaskCategory[] {
    const t = tasksMap[ds];
    return t ? Array.from(new Set(t.map((x) => x.category))) : [];
  }
  function goPrev() { if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); } else setViewMonth((m) => m - 1); }
  function goNext() { if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); } else setViewMonth((m) => m + 1); }

  const grid = buildGrid(viewYear, viewMonth);
  const curPrefix = toDateString(viewYear, viewMonth, 1).slice(0, 7);
  const rowCount = grid.slice(35, 42).every((ds) => ds.slice(0, 7) !== curPrefix) ? 5 : 6;

  if (loading) return <CalendarScreenSkeleton />;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: base.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.accent} colors={[brand.accent]} />}
    >
      <View style={s.header}>
        <Text style={[typography.heading, { color: text.primary }]}>Calendar</Text>
      </View>

      <View style={s.calendarBlock}>
        <View style={[s.calendarCard, { backgroundColor: base.surfaceL1, borderColor: base.border }]}>
          <View style={s.monthRow}>
            <Pressable onPress={goPrev} hitSlop={12}><Text style={[s.arrow, { color: brand.accent }]}>‹</Text></Pressable>
            <Text style={[s.monthTitle, { color: text.primary }]}>{MONTH_NAMES[viewMonth - 1]} {viewYear}</Text>
            <Pressable onPress={goNext} hitSlop={12}><Text style={[s.arrow, { color: brand.accent }]}>›</Text></Pressable>
          </View>

          <View style={[s.monthDivider, { backgroundColor: base.border }]} />

          <View style={[s.weekRow, { borderBottomColor: base.border }]}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[s.weekDay, { color: text.secondary }, i === 6 && { color: status.overdue, fontFamily: "Poppins-SemiBold" }]}>{d}</Text>
            ))}
          </View>

          <View style={s.grid}>
            {Array.from({ length: rowCount }).map((_, rowIdx) => {
              const isLastRow = rowIdx === rowCount - 1;
              return (
                <View key={rowIdx} style={[s.gridRow, { borderBottomColor: base.border }, isLastRow && { borderBottomWidth: 0 }]}>
                  {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((ds, colIdx) => {
                    const isCurrent = ds.slice(0, 7) === curPrefix;
                    const isToday = ds === todayISO;
                    const isSel = ds === selected;
                    const cats = getCats(ds);
                    const hasTasks = cats.length > 0 && isCurrent;
                    const isLastCol = colIdx === 6;
                    const isFirstCol = colIdx === 0;

                    const onPress = () => {
                      const y = parseInt(ds.slice(0, 4), 10);
                      const m = parseInt(ds.slice(5, 7), 10);
                      if (y !== viewYear || m !== viewMonth) { setViewYear(y); setViewMonth(m); }
                      setSelected(ds);
                    };

                    return (
                      <Pressable key={ds} onPress={onPress} style={[s.cell, { borderRightColor: base.border, borderRightWidth: isLastCol ? 0 : 1 }]}>
                        {isToday && (
                          <View pointerEvents="none" style={[s.todayBox, { backgroundColor: brand.accent }, isLastRow && { bottom: 0 }, isFirstCol && { left: 0 }, isLastCol && { right: 0 }]} />
                        )}
                        {isSel && isCurrent && !isToday && (
                          <View pointerEvents="none" style={[s.selectedBox, { borderColor: brand.accent }, isLastRow && { bottom: 0 }, isFirstCol && { left: 0 }, isLastCol && { right: 0 }]} />
                        )}
                        <View style={s.cellInner}>
                          <Text style={[
                            s.cellNum,
                            { color: isCurrent ? text.primary : text.secondary },
                            !isCurrent && { opacity: 0.28 },
                            colIdx === 6 && isCurrent && { color: status.overdue, fontFamily: "Poppins-SemiBold" },
                            isToday && { color: "#FFFFFF", fontFamily: "Poppins-SemiBold" },
                          ]}>{parseInt(ds.slice(8), 10)}</Text>
                          {hasTasks && (
                            <View style={s.dotsRow}>
                              {cats.map((cat) => <View key={cat} style={[s.dot, { backgroundColor: categoryColor[cat] }]} />)}
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

          <View style={[s.legend, { borderTopColor: base.border }]}>
            {(Object.keys(categoryColor) as TaskCategory[]).map((cat) => (
              <View key={cat} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: categoryColor[cat] }]} />
                <Text style={[s.legendLabel, { color: text.secondary }]}>{categoryLabel[cat]}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={s.taskSection}>
        <Text style={[s.taskHeading, { color: brand.secprimary }]}>{selected === todayISO ? "Today" : selected}</Text>
        <View style={s.taskScroll}>
          {tasksMap[selected]?.length ? (
            tasksMap[selected].map((task, i) => (
              <Pressable
                key={task.id ?? i}
                onPress={() => router.push({ pathname: taskDetailRoute as any, params: { taskId: task.id } })}
                style={[s.taskCard, { backgroundColor: base.surfaceL1, borderColor: base.border, borderLeftColor: categoryColor[task.category] }]}
              >
                <View style={s.taskCardHeader}>
                  <Text style={[s.taskTitle, { color: text.primary }]}>{task.title}</Text>
                  <View style={[s.badge, { backgroundColor: `${categoryColor[task.category]}22` }]}>
                    <Text style={[s.badgeText, { color: categoryColor[task.category] }]}>{categoryLabel[task.category]}</Text>
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

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { height: moderateScale(60), justifyContent: "center", paddingLeft: 22, marginTop: Platform.OS === "android" ? 22 : 30 },
  calendarBlock: { paddingHorizontal: wp(3.2), paddingTop: 8, paddingBottom: 4 },
  calendarCard: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp(3.7), paddingTop: 8, paddingBottom: 4 },
  arrow: { fontSize: moderateScale(34), lineHeight: 36, fontFamily: "Poppins-Regular" },
  monthTitle: { fontSize: moderateScale(28), fontFamily: "Poppins-SemiBold" },
  weekRow: { flexDirection: "row", borderBottomWidth: 1 },
  weekDay: { flex: 1, textAlign: "center", fontSize: moderateScale(10), fontFamily: "Poppins-Medium", paddingVertical: 4 },
  grid: {},
  gridRow: { flexDirection: "row", borderBottomWidth: 1 },
  monthDivider: { height: 1, marginHorizontal: 0, marginBottom: 8 },
  cell: { flex: 1, height: moderateScale(46), justifyContent: "center", alignItems: "center", paddingTop: 0, paddingLeft: 0, position: "relative" },
  todayBox: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderRadius: 4 },
  selectedBox: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2, borderRadius: 4 },
  cellInner: { alignItems: "center", justifyContent: "center", gap: 3 },
  cellNum: { fontSize: moderateScale(12), fontFamily: "Poppins-Regular", lineHeight: 15, textAlign: "center" },
  dotsRow: { flexDirection: "row", gap: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: moderateScale(4), height: moderateScale(4), borderRadius: 2 },
  legend: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 7, borderTopWidth: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: moderateScale(7), height: moderateScale(7), borderRadius: 4 },
  legendLabel: { fontSize: moderateScale(10), fontFamily: "Poppins-Regular" },
  taskSection: { flex: 1, paddingHorizontal: wp(3.2), paddingTop: 10 },
  taskHeading: { fontSize: moderateScale(15), fontFamily: "Poppins-SemiBold", marginBottom: 8 },
  taskScroll: { paddingBottom: 24 },
  taskCard: {
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderLeftWidth: 4,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  taskCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 },
  taskTitle: { fontSize: moderateScale(14), fontFamily: "Poppins-Medium", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: moderateScale(10), fontFamily: "Poppins-Medium" },
  taskDesc: { fontSize: moderateScale(12), fontFamily: "Poppins-Regular", lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 32, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, marginTop: 8 },
  emptyTitle: { fontSize: moderateScale(14), fontFamily: "Poppins-Medium" },
  emptySubtitle: { fontSize: moderateScale(12), fontFamily: "Poppins-Regular", marginTop: 4, opacity: 0.6 },
});