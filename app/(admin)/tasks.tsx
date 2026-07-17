import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { TaskStatus, TaskPriority, Task } from '../../types/task';
import { typography } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { wp } from '../../utils/responsive';

type FilterType =
  | 'all'
  | 'status'
  | 'priority'
  | 'label'
  | 'employee'
  | 'deadlineAsc'
  | 'deadlineDesc'
  | 'priorityHighLow'
  | 'priorityLowHigh';

// Matches the actual `tasks` table columns — no `label` or `suggestion` columns exist yet
type TaskRow = {
  id: string;
  title: string;
  status: 'overdue' | 'pending' | 'in_review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  created_by: string;
  deadline: string;
};

type ManagedEmployee = { id: string; name: string; email: string };

const STATUS_LABELS: Record<TaskStatus, string> = {
  overdue: 'Overdue',
  pending: 'Pending',
  inReview: 'In Review',
  completed: 'Completed',
};

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

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

export default function AdminTasks() {
  const { colors } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [draftType, setDraftType] = useState<FilterType>('all');
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const [appliedType, setAppliedType] = useState<FilterType>('all');
  const [appliedValue, setAppliedValue] = useState<string | null>(null);

  useEffect(() => {
    fetchTasksAndTeam();
  }, []);

  // isRefresh=true skips the full-screen loading state so the header/search bar
  // stay mounted and the pull-to-refresh spinner is the only indicator. 
  const fetchTasksAndTeam = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const adminEmail = await AsyncStorage.getItem('userEmail');

    if (!adminEmail) {
      router.replace('/(auth)/LoginChoice');
      return;
    }

    const { data: currentAdmin, error: adminLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (adminLookupError || !currentAdmin) {
      console.error('Could not resolve admin id for email:', adminEmail);
      setLoading(false);
      return;
    }

    // ── Tasks this admin created ─────────────────────────────────────────
    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', currentAdmin.id)
      .order('deadline', { ascending: true });

    let fetchedTasks: Task[] = [];
    if (taskError) {
      console.error('Error fetching tasks list:', taskError.message);
    } else {
      fetchedTasks = (taskRows ?? []).map(mapRowToTask);
      setTasks(fetchedTasks);
    }

    // ── This admin's connected employees, for names + the filter list ────
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('employee_email')
      .eq('admin_email', adminEmail)
      .eq('status', 'accepted');

    let connectedEmployees: ManagedEmployee[] = [];
    if (connError) {
      console.error('Error fetching team:', connError.message);
    } else {
      const employeeEmails = (connections ?? []).map((c) => c.employee_email);

      if (employeeEmails.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('email', employeeEmails);

        if (usersError) {
          console.error('Error fetching team emails:', usersError.message);
        } else {
          connectedEmployees = (users ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }));
        }
      }
    }

    setEmployees(connectedEmployees);

    // ── Resolve names for every assignee on these tasks, even if no longer connected ──
    const assignedIds = Array.from(new Set(fetchedTasks.map((t) => t.assignedTo)));
    const knownIds = new Set(connectedEmployees.map((e) => e.id));
    const missingIds = assignedIds.filter((id) => id && !knownIds.has(id));

    if (missingIds.length > 0) {
      const { data: extraUsers, error: extraError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', missingIds);

      if (extraError) {
        console.error('Error resolving extra assignee names:', extraError.message);
      } else {
        const extras = (extraUsers ?? []).map((u) => ({ id: u.id, name: u.name, email: u.email }));
        setEmployees((prev) => [...prev, ...extras]);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    fetchTasksAndTeam(true);
  }, []);


  const uniqueLabels = Array.from(new Set(tasks.map((t) => t.label).filter(Boolean)));

  const openModal = () => {
    setDraftType(appliedType);
    setDraftValue(appliedValue);
    setModalVisible(true);
  };

  const selectDraft = (type: FilterType, value: string | null) => {
    setDraftType(type);
    setDraftValue(value);
  };

  const applyFilter = () => {
    setAppliedType(draftType);
    setAppliedValue(draftValue);
    setModalVisible(false);
  };

  const employeeDisplayName = (id: string) => {
    const match = employees.find((e) => e.id === id);
    return match?.name || match?.email || id;
  };

  const getVisibleTasks = () => {
    let list = [...tasks];

    if (appliedType === 'status' && appliedValue) {
      list = list.filter((t) => t.status === appliedValue);
    }
    if (appliedType === 'priority' && appliedValue) {
      list = list.filter((t) => t.priority === appliedValue);
    }
    if (appliedType === 'label' && appliedValue) {
      list = list.filter((t) => (t.label ?? '').toLowerCase() === appliedValue.toLowerCase());
    }
    if (appliedType === 'employee' && appliedValue) {
      list = list.filter((t) => t.assignedTo === appliedValue);
    }
    if (appliedType === 'deadlineAsc') {
      list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    if (appliedType === 'deadlineDesc') {
      list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    }
    if (appliedType === 'priorityHighLow') {
      list.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    }
    if (appliedType === 'priorityLowHigh') {
      list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      list = list.filter((t) => {
        return (
          t.title.toLowerCase().includes(query) ||
          (t.label ?? '').toLowerCase().includes(query) ||
          t.priority.toLowerCase().includes(query) ||
          STATUS_LABELS[t.status].toLowerCase().includes(query) ||
          employeeDisplayName(t.assignedTo).toLowerCase().includes(query)
        );
      });
    }

    return list;
  };

  const visibleTasks = getVisibleTasks();
  const isSearching = searchQuery.trim().length > 0;
  const isSelected = (type: FilterType, value: string | null) => draftType === type && draftValue === value;

  const Chip = ({ label, type, value }: { label: string; type: FilterType; value: string | null }) => {
    const selected = isSelected(type, value);
    return (
      <Pressable
        onPress={() => selectDraft(type, value)}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
            borderColor: selected ? colors.brand.accent : colors.base.border,
          },
        ]}
      >
        <Text style={[typography.label, { color: selected ? '#FFFFFF' : colors.text.primary }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <AdminTasksSkeleton />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.heading, { color: colors.text.primary }]}>Tasks</Text>
        <Pressable
          style={[styles.filterButton, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
          onPress={openModal}
        >
          <Text style={[typography.heading3, { color: colors.brand.accent }]}>Filter</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: searchFocused ? colors.brand.accent : colors.base.border,
              borderWidth: searchFocused ? 1.5 : 1,
            },
            searchFocused && styles.searchBarFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={searchFocused ? colors.brand.accent : colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search tasks, employee, label..."
            placeholderTextColor={colors.text.secondary}
            style={[typography.body, styles.searchInput, { color: colors.text.primary }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.accent} colors={[colors.brand.accent]} />
        }
      >
        {visibleTasks.length === 0 ? (
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 20 }]}>
            {isSearching
              ? `No tasks found for "${searchQuery.trim()}".`
              : 'No tasks match this filter.'}
          </Text>
        ) : (
          visibleTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/(task)/task-detail', params: { taskId: task.id } })}
              style={[styles.taskCard, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
            >
              <View style={styles.taskCardHeader}>
                <Text style={[typography.heading3, { color: colors.text.primary, flex: 1 }]}>
                  {task.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.status[task.status] }]}>
                  <Text style={[typography.label, styles.statusBadgeText]}>
                    {STATUS_LABELS[task.status]}
                  </Text>
                </View>
              </View>
              <Text
                style={[typography.label, { color: colors.text.secondary, marginTop: 6 }]}
              >
                {employeeDisplayName(task.assignedTo)} · {task.label} · {task.priority.toUpperCase()} · Due{" "}
                {new Date(task.dueDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.base.surfaceL1 }]} onPress={() => { }}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
              <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 16 }]}>
                Filter Tasks
              </Text>

              <View style={styles.chipRow}>
                <Chip label="All" type="all" value={null} />
                <Chip label="Earliest Deadline First" type="deadlineAsc" value={null} />
                <Chip label="Latest Deadline First" type="deadlineDesc" value={null} />
                <Chip label="High Priority First" type="priorityHighLow" value={null} />
                <Chip label="Low Priority First" type="priorityLowHigh" value={null} />
              </View>

              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
                By Status
              </Text>
              <View style={styles.chipRow}>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
                  <Chip key={status} label={STATUS_LABELS[status]} type="status" value={status} />
                ))}
              </View>

              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
                By Priority
              </Text>
              <View style={styles.chipRow}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
                  <Chip
                    key={priority}
                    label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                    type="priority"
                    value={priority}
                  />
                ))}
              </View>

              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
                By Label
              </Text>
              <View style={styles.chipRow}>
                {uniqueLabels.map((label) => (
                  <Chip key={label} label={label} type="label" value={label} />
                ))}
              </View>

              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
                By Employee
              </Text>
              <View style={styles.chipRow}>
                {employees.map((emp) => (
                  <Chip key={emp.id} label={emp.name || emp.email} type="employee" value={emp.id} />
                ))}
              </View>
            </ScrollView>

            <Pressable style={[styles.applyButton, { backgroundColor: colors.brand.accent }]} onPress={applyFilter}>
              <Text style={[typography.heading3, { color: '#FFFFFF' }]}>Apply Filter</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5.3),
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterButton: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  searchRow: {
    paddingHorizontal: wp(5.3),
    paddingBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchBarFocused: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  scrollContent: { paddingHorizontal: wp(5.3), paddingBottom: 32 },
  taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  taskCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    maxHeight: 560,
    alignSelf: 'center',
    width: '100%',
  },
  scrollArea: {
    flexGrow: 0,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
});