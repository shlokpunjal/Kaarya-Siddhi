import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';
import { Task } from '../../types/task';

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
  const [decidedRequestCount, setDecidedRequestCount] = useState(0);

  // ── Initial task fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const checkUserAndFetchTasks = async () => {
      setLoading(true);

      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        console.error('No active session found, redirecting...');
        if (isMounted) router.replace('/(auth)/LoginChoice');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', email)
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error.message);
      } else if (isMounted) {
        setTasks((data ?? []).map(mapRowToTask));
      }

      if (isMounted) setLoading(false);
    };

    checkUserAndFetchTasks();
    return () => { isMounted = false; };
  }, []);

  // ── Bell badge: count of admin-decided requests, refreshed on focus ──────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const email = await AsyncStorage.getItem('userEmail');
        if (!email) return;

        const { count } = await supabase
          .from('extension_requests')
          .select('*', { count: 'exact', head: true })
          .eq('requested_by', email)
          .in('status', ['accepted', 'rejected']);

        setDecidedRequestCount(count ?? 0);
      })();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand.accent} />
        <Text style={[typography.body, { marginTop: 10 }]}>Loading tasks...</Text>
      </SafeAreaView>
    );
  }

  const overdueTasks   = tasks.filter(t => t.status === "overdue");
  const pendingTasks   = tasks.filter(t => t.status === "pending");
  const reviewTasks    = tasks.filter(t => t.status === "inReview");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

        {/* ── Header Block ── */}
        <View>
          <View style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingRight: 15,
          }}>
            {/* Greeting */}
            <View>
              <Text style={{
                ...typography.subheading,
                marginTop: 20, marginLeft: 15,
                color: colors.text.secondary,
              }}>Good Morning!</Text>
              <Text style={{
                ...typography.heading,
                marginTop: 5, marginLeft: 15,
                color: colors.text.primary,
              }}>Your Task Overview</Text>
            </View>

            {/* Bell icon */}
            <TouchableOpacity
              onPress={() => router.push("/(employee)/notifications")}
              style={{
                position: "relative",
                marginTop: 22,
                height: 48,
                width: 48,
                borderRadius: 24,
                backgroundColor: colors.base.surfaceL2,
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0px 0px 5px gray",
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.brand.accent} />
              {decidedRequestCount > 0 && (
                <View style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.status.completed,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}>
                  <Text style={{
                    color: colors.base.surfaceL1,
                    fontSize: 10,
                    fontFamily: "Poppins-SemiBold",
                  }}>
                    {decidedRequestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Metrics Matrix Container */}
          <View style={{
            backgroundColor: colors.base.surfaceL1, marginTop: 25, margin: 20, height: 140, borderRadius: 25,
            flexDirection: "row", alignItems: "center", justifyContent: "space-around",
            borderColor: colors.base.border, borderWidth: 1.5,
          }}>
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                marginLeft: 12, height: 63, width: 63, borderRadius: 40,
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
                height: 63, width: 63, borderRadius: 40,
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
                height: 63, width: 63, borderRadius: 40,
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
                height: 63, width: 63, borderRadius: 40,
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
          <View style={{ marginLeft: 33, flex: 1, marginRight: 33 }}>
            <TouchableOpacity
              onPress={() => router.push("/newtask")}
              style={{
                backgroundColor: colors.brand.accent, padding: 14,
                width: "100%", height: 60, borderRadius: 32,
                flexDirection: "row", marginTop: -1, justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Ionicons style={{ marginRight: 10 }} name="add" size={28} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1, textAlign: "center" }}>Add a New Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Overdue Accordion ── */}
        <View style={{ width: 320, marginTop: 30, marginLeft: 33, borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: 60, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
            <Text style={{ ...typography.subheading, color: colors.status.overdue }}>Overdue</Text>
            <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
              <Ionicons name={showOverdue ? "chevron-up-outline" : "chevron-down-outline"} size={30} color={colors.base.surfaceL1} style={{ backgroundColor: colors.status.overdue, borderRadius: 10, padding: 2 }} />
            </TouchableOpacity>
          </View>
          {showOverdue && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {overdueTasks.map((task) => (
                <TouchableOpacity key={task.id} onPress={() => router.push({ pathname: '/(task)/task-detail', params: { taskId: task.id } })}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.base.surfaceL2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10 }}>
                  <View style={{ height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.status.overdue, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.overdue }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Pending Accordion ── */}
        <View style={{ width: 320, marginTop: 20, marginLeft: 33, borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: 60, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
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
                  <View style={{ height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.status.pending, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.pending }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── In Review Accordion ── */}
        <View style={{ width: 320, marginTop: 20, marginLeft: 33, borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: 60, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
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
                  <View style={{ height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.status.inReview, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.inReview }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Completed Accordion ── */}
        <View style={{ width: 320, marginTop: 20, marginLeft: 33, borderColor: colors.base.border, borderWidth: 1, borderRadius: 19, backgroundColor: colors.base.surfaceL1 }}>
          <View style={{ height: 60, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
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
                  <View style={{ height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.status.completed, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.completed }} />
                  </View>
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
