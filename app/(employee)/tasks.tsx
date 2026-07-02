// import { useState } from 'react';
// import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { mockTasks } from '../../data/mockTasks';
// import { TaskStatus, TaskPriority } from '../../types/task';
// import { typography } from '../../theme/theme';
// import { useTheme } from '../../context/ThemeContext';

// type FilterType = 'all' | 'status' | 'priority' | 'label' | 'deadlineAsc' | 'deadlineDesc' | 'priorityHighLow' | 'priorityLowHigh';

// const STATUS_LABELS: Record<TaskStatus, string> = {
//   overdue: 'Overdue',
//   pending: 'Pending',
//   inReview: 'In Review',
//   completed: 'Completed',
// };

// const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

// export default function EmployeeTasks() {
//   const { colors } = useTheme();
//   const [modalVisible, setModalVisible] = useState(false);

//   const [draftType, setDraftType] = useState<FilterType>('all');
//   const [draftValue, setDraftValue] = useState<string | null>(null);

//   const [appliedType, setAppliedType] = useState<FilterType>('all');
//   const [appliedValue, setAppliedValue] = useState<string | null>(null);

//   const uniqueLabels = Array.from(new Set(mockTasks.map((t) => t.label)));

//   const openModal = () => {
//     setDraftType(appliedType);
//     setDraftValue(appliedValue);
//     setModalVisible(true);
//   };

//   const selectDraft = (type: FilterType, value: string | null) => {
//     setDraftType(type);
//     setDraftValue(value);
//   };

//   const applyFilter = () => {
//     setAppliedType(draftType);
//     setAppliedValue(draftValue);
//     setModalVisible(false);
//   };

//   const getVisibleTasks = () => {
//     let tasks = [...mockTasks];

//     if (appliedType === 'status' && appliedValue) {
//       tasks = tasks.filter((t) => t.status === appliedValue);
//     }
//     if (appliedType === 'priority' && appliedValue) {
//       tasks = tasks.filter((t) => t.priority === appliedValue);
//     }
//     if (appliedType === 'label' && appliedValue) {
//       tasks = tasks.filter((t) => t.label.toLowerCase() === appliedValue.toLowerCase());
//     }
//     if (appliedType === 'deadlineAsc') {
//       tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
//     }
//     if (appliedType === 'deadlineDesc') {
//       tasks.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
//     }
//     if (appliedType === 'priorityHighLow') {
//       tasks.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
//     }
//     if (appliedType === 'priorityLowHigh') {
//       tasks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
//     }

//     return tasks;
//   };

//   const visibleTasks = getVisibleTasks();

//   const isSelected = (type: FilterType, value: string | null) =>
//     draftType === type && draftValue === value;

//   const Chip = ({ label, type, value }: { label: string; type: FilterType; value: string | null }) => {
//     const selected = isSelected(type, value);
//     return (
//       <Pressable
//         onPress={() => selectDraft(type, value)}
//         style={[
//           styles.chip,
//           {
//             backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
//             borderColor: selected ? colors.brand.accent : colors.base.border,
//           },
//         ]}
//       >
//         <Text style={[typography.label, { color: selected ? '#FFFFFF' : colors.text.primary }]}>
//           {label}
//         </Text>
//       </Pressable>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
//       <View style={styles.headerRow}>
//         <Text style={[typography.heading, { color: colors.text.primary }]}>Tasks</Text>
//         <Pressable
//           style={[styles.filterButton, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
//           onPress={openModal}
//         >
//           <Text style={[typography.heading3, { color: colors.brand.accent }]}>Filter</Text>
//         </Pressable>
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {visibleTasks.length === 0 ? (
//           <Text style={[typography.body, { color: colors.text.secondary, marginTop: 20 }]}>
//             No tasks match this filter.
//           </Text>
//         ) : (
//           visibleTasks.map((task) => (
//             <View
//               key={task.id}
//               style={[styles.taskCard, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
//             >
//               <View style={styles.taskCardHeader}>
//                 <Text style={[typography.heading3, { color: colors.text.primary, flex: 1 }]}>
//                   {task.title}
//                 </Text>
//                 <View style={[styles.statusBadge, { backgroundColor: colors.status[task.status] }]}>
//                   <Text style={[typography.label, styles.statusBadgeText]}>
//                     {STATUS_LABELS[task.status]}
//                   </Text>
//                 </View>
//               </View>
//               <Text style={[typography.label, { color: colors.text.secondary, marginTop: 6 }]}>
//                 {task.label} · {task.priority.toUpperCase()} priority · Due {task.dueDate}
//               </Text>
//             </View>
//           ))
//         )}
//       </ScrollView>

//       <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
//         <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
//           <Pressable style={[styles.modalCard, { backgroundColor: colors.base.surfaceL1 }]} onPress={() => {}}>
//             <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
//               <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 16 }]}>
//                 Filter Tasks
//               </Text>

//               <View style={styles.chipRow}>
//                 <Chip label="All" type="all" value={null} />
//                 <Chip label="Earliest Deadline First" type="deadlineAsc" value={null} />
//                 <Chip label="Latest Deadline First" type="deadlineDesc" value={null} />
//                 <Chip label="High Priority First" type="priorityHighLow" value={null} />
//                 <Chip label="Low Priority First" type="priorityLowHigh" value={null} />
//               </View>

//               <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
//                 By Status
//               </Text>
//               <View style={styles.chipRow}>
//                 {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
//                   <Chip key={status} label={STATUS_LABELS[status]} type="status" value={status} />
//                 ))}
//               </View>

//               <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
//                 By Priority
//               </Text>
//               <View style={styles.chipRow}>
//                 {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
//                   <Chip
//                     key={priority}
//                     label={priority.charAt(0).toUpperCase() + priority.slice(1)}
//                     type="priority"
//                     value={priority}
//                   />
//                 ))}
//               </View>

//               <Text style={[typography.label, { color: colors.text.secondary, marginTop: 14, marginBottom: 6 }]}>
//                 By Label
//               </Text>
//               <View style={styles.chipRow}>
//                 {uniqueLabels.map((label) => (
//                   <Chip key={label} label={label} type="label" value={label} />
//                 ))}
//               </View>
//             </ScrollView>

//             <Pressable
//               style={[styles.applyButton, { backgroundColor: colors.brand.accent }]}
//               onPress={applyFilter}
//             >
//               <Text style={[typography.heading3, { color: '#FFFFFF' }]}>Apply Filter</Text>
//             </Pressable>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1 },
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 12,
//     paddingBottom: 8,
//   },
//   filterButton: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
//   scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
//   taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
//   taskCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
//   statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
//   statusBadgeText: { color: '#FFFFFF' },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
//   modalCard: {
//     borderRadius: 18,
//     padding: 20,
//     maxHeight: 480,
//     alignSelf: 'center',
//     width: '100%',
//   },
//   scrollArea: {
//     flexGrow: 0,
//   },
//   chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//   chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
//   applyButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
// });


import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskStatus, TaskPriority } from '../../types/task';
import { typography } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  label: string;
  dueDate: string;
};

type FilterType = 'all' | 'status' | 'priority' | 'label' | 'deadlineAsc' | 'deadlineDesc' | 'priorityHighLow' | 'priorityLowHigh';

const STATUS_LABELS: Record<TaskStatus, string> = {
  overdue: 'Overdue',
  pending: 'Pending',
  inReview: 'In Review',
  completed: 'Completed',
};

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

export default function EmployeeTasks() {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [draftType, setDraftType] = useState<FilterType>('all');
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const [appliedType, setAppliedType] = useState<FilterType>('all');
  const [appliedValue, setAppliedValue] = useState<string | null>(null);

  // Fetch tasks from Supabase on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('No active session found.');
        return;
      }

      // const { data, error } = await supabase
      //   .from('tasks')
      //   .select('id, title, status, priority, label, due_date')
      //   .eq('assigned_to', user.email)
      //   .order('due_date', { ascending: true });

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, deadline, priority, status,label,due_date')
        .or(`assigned_to.eq.${user.id},assigned_to.eq.${user.email}`)
        .order('deadline', { ascending: true });
      console.log('current user id:', user.id);
      console.log('tasks fetched:', data);
      console.log('fetch error:', error);
      if (error) throw error;

      const mapped: Task[] = (data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        label: t.label,
        dueDate: t.due_date,
      }));

      setTasks(mapped);
    } catch (error: any) {
      Alert.alert('Failed to load tasks', error.message);
    } finally {
      setLoading(false);
    }
  };

//   const fetchTasks = async () => {
//   try {
//     setLoading(true);

//     // 🔧 TEMP HARDCODE FOR TESTING — remove before shipping
//     const testEmail = 'prathameshamone@gmail.com';

//     const { data, error } = await supabase
//       .from('tasks')
//       .select('id, title, description, deadline, priority, status')
//       .eq('assigned_to', testEmail)
//       .order('deadline', { ascending: true });

//     if (error) throw error;

//     const mapped: Task[] = (data ?? []).map((t) => ({
//       id: t.id,
//       title: t.title,
//       status: t.status,
//       priority: t.priority,
//       label: t.description,
//       dueDate: t.deadline,
//     }));

//     setTasks(mapped);
//   } catch (error: any) {
//     Alert.alert('Failed to load tasks', error.message);
//   } finally {
//     setLoading(false);
//   }
// };

  const uniqueLabels = Array.from(new Set(tasks.map((t) => t.label)));

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

  const getVisibleTasks = () => {
    let visible = [...tasks];

    if (appliedType === 'status' && appliedValue) {
      visible = visible.filter((t) => t.status === appliedValue);
    }
    if (appliedType === 'priority' && appliedValue) {
      visible = visible.filter((t) => t.priority === appliedValue);
    }
    if (appliedType === 'label' && appliedValue) {
      visible = visible.filter((t) => t.label.toLowerCase() === appliedValue.toLowerCase());
    }
    if (appliedType === 'deadlineAsc') {
      visible.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    if (appliedType === 'deadlineDesc') {
      visible.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    }
    if (appliedType === 'priorityHighLow') {
      visible.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    }
    if (appliedType === 'priorityLowHigh') {
      visible.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }

    return visible;
  };

  const visibleTasks = getVisibleTasks();

  const isSelected = (type: FilterType, value: string | null) =>
    draftType === type && draftValue === value;

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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {visibleTasks.length === 0 ? (
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 20 }]}>
            No tasks match this filter.
          </Text>
        ) : (
          visibleTasks.map((task) => (
            <View
              key={task.id}
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
              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 6 }]}>
                {task.label} · {task.priority.toUpperCase()} priority · Due {task.dueDate}
              </Text>
            </View>
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
  filterButton: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  taskCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    maxHeight: 480,
    alignSelf: 'center',
    width: '100%',
  },
  scrollArea: {
    flexGrow: 0,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  applyButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
});