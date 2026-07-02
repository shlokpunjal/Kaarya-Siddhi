import { useTheme } from '../../context/ThemeContext';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockTasks } from '../../data/mockTasks';
import { TaskStatus, TaskPriority } from '../../types/task';
import { typography } from '../../theme/theme';

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

const STATUS_LABELS: Record<TaskStatus, string> = {
  overdue: 'Overdue',
  pending: 'Pending',
  inReview: 'In Review',
  completed: 'Completed',
};

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

const EMPLOYEES = [
  { id: 'emp1', name: 'Ravi Kumar' },
  { id: 'emp2', name: 'Sita Devi' },
];

export default function AdminTasks() {
  const { colors } = useTheme();

  // ── Search ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [draftType, setDraftType] = useState<FilterType>('all');
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [appliedType, setAppliedType] = useState<FilterType>('all');
  const [appliedValue, setAppliedValue] = useState<string | null>(null);

  const uniqueLabels = Array.from(new Set(mockTasks.map((t) => t.label)));

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

  const employeeName = (id: string) =>
    EMPLOYEES.find((e) => e.id === id)?.name ?? id;

  // ── Combined filter + search ─────────────────────────────────────────────────
  const visibleTasks = useMemo(() => {
    let tasks = [...mockTasks];

    // Step 1 — apply filter
    if (appliedType === 'status' && appliedValue)
      tasks = tasks.filter((t) => t.status === appliedValue);
    if (appliedType === 'priority' && appliedValue)
      tasks = tasks.filter((t) => t.priority === appliedValue);
    if (appliedType === 'label' && appliedValue)
      tasks = tasks.filter((t) => t.label.toLowerCase() === appliedValue.toLowerCase());
    if (appliedType === 'employee' && appliedValue)
      tasks = tasks.filter((t) => t.assignedTo === appliedValue);
    if (appliedType === 'deadlineAsc')
      tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (appliedType === 'deadlineDesc')
      tasks.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    if (appliedType === 'priorityHighLow')
      tasks.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    if (appliedType === 'priorityLowHigh')
      tasks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

    // Step 2 — apply search on top of filtered results
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.label.toLowerCase().includes(q) ||
          employeeName(t.assignedTo).toLowerCase().includes(q)
      );
    }

    return tasks;
  }, [appliedType, appliedValue, searchQuery]);

  const isSelected = (type: FilterType, value: string | null) =>
    draftType === type && draftValue === value;

  const Chip = ({
    label,
    type,
    value,
  }: {
    label: string;
    type: FilterType;
    value: string | null;
  }) => {
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
        <Text
          style={[
            typography.label,
            { color: selected ? '#FFFFFF' : colors.text.primary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={[typography.heading, { color: colors.text.primary }]}>Tasks</Text>
        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
          ]}
          onPress={openModal}
        >
          <Text style={[typography.heading3, { color: colors.brand.accent }]}>Filter</Text>
        </Pressable>
      </View>

      {/* ── Search Bar ── */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.base.surfaceL1,
            borderColor: searchFocused ? colors.brand.accent : colors.base.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={searchFocused ? colors.brand.accent : colors.text.secondary}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search tasks..."
          placeholderTextColor={colors.text.secondary}
          style={[
            styles.searchInput,
            typography.body,
            { color: colors.text.primary },
          ]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {/* Clear button — shows only when something is typed (Android) */}
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>

      {/* ── Result count (shows only when searching or filter active) ── */}
      {(searchQuery.trim() !== '' || appliedType !== 'all') && (
        <View style={styles.resultRow}>
          <Text style={[typography.label, { color: colors.text.secondary }]}>
            {visibleTasks.length === 0
              ? 'No results'
              : `${visibleTasks.length} task${visibleTasks.length !== 1 ? 's' : ''} found`}
          </Text>
          {/* Clear all button */}
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setAppliedType('all');
              setAppliedValue(null);
            }}
          >
          </Pressable>
        </View>
      )}

      {/* ── Task List ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {visibleTasks.length === 0 ? (
          // ── Empty state ──
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={48}
              color={colors.text.secondary}
              style={{ opacity: 0.4 }}
            />
            <Text
              style={[
                typography.subheading,
                { color: colors.text.secondary, marginTop: 16, textAlign: 'center' },
              ]}
            >
              {searchQuery.trim()
                ? `No task found with "${searchQuery}"`
                : 'No tasks match this filter'}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.text.secondary, marginTop: 6, textAlign: 'center', opacity: 0.6 },
              ]}
            >
              {searchQuery.trim()
                ? 'Try a different name or keyword'
                : 'Try selecting a different filter'}
            </Text>
          </View>
        ) : (
          visibleTasks.map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.base.surfaceL1,
                  borderColor: colors.base.border,
                  borderLeftColor: colors.status[task.status],
                },
              ]}
            >
              <View style={styles.taskCardHeader}>
                <Text
                  style={[typography.heading3, { color: colors.text.primary, flex: 1 }]}
                >
                  {task.title}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.status[task.status] },
                  ]}
                >
                  <Text style={[typography.label, styles.statusBadgeText]}>
                    {STATUS_LABELS[task.status]}
                  </Text>
                </View>
              </View>
              <Text
                style={[typography.label, { color: colors.text.secondary, marginTop: 6 }]}
              >
                {employeeName(task.assignedTo)} · {task.label} ·{' '}
                {task.priority.toUpperCase()} · Due {task.dueDate}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Filter Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.base.surfaceL1 }]}
            onPress={() => {}}
          >
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
              <Text
                style={[
                  typography.subheading,
                  { color: colors.text.primary, marginBottom: 16 },
                ]}
              >
                Filter Tasks
              </Text>

              <View style={styles.chipRow}>
                <Chip label="All" type="all" value={null} />
                <Chip label="Earliest Deadline First" type="deadlineAsc" value={null} />
                <Chip label="Latest Deadline First" type="deadlineDesc" value={null} />
                <Chip label="High Priority First" type="priorityHighLow" value={null} />
                <Chip label="Low Priority First" type="priorityLowHigh" value={null} />
              </View>

              <Text
                style={[
                  typography.label,
                  { color: colors.text.secondary, marginTop: 14, marginBottom: 6 },
                ]}
              >
                By Status
              </Text>
              <View style={styles.chipRow}>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
                  <Chip
                    key={status}
                    label={STATUS_LABELS[status]}
                    type="status"
                    value={status}
                  />
                ))}
              </View>

              <Text
                style={[
                  typography.label,
                  { color: colors.text.secondary, marginTop: 14, marginBottom: 6 },
                ]}
              >
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

              <Text
                style={[
                  typography.label,
                  { color: colors.text.secondary, marginTop: 14, marginBottom: 6 },
                ]}
              >
                By Label
              </Text>
              <View style={styles.chipRow}>
                {uniqueLabels.map((label) => (
                  <Chip key={label} label={label} type="label" value={label} />
                ))}
              </View>

              <Text
                style={[
                  typography.label,
                  { color: colors.text.secondary, marginTop: 14, marginBottom: 6 },
                ]}
              >
                By Employee
              </Text>
              <View style={styles.chipRow}>
                {EMPLOYEES.map((emp) => (
                  <Chip key={emp.id} label={emp.name} type="employee" value={emp.id} />
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.applyButton, { backgroundColor: colors.brand.accent }]}
              onPress={applyFilter}
            >
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },

  // Result count row
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
  },

  filterButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  taskCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  taskCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: '#FFFFFF' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },

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
  scrollArea: { flexGrow: 0 },
  applyButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
});
