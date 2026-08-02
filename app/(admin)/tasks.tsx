import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TaskStatus, TaskPriority, Task } from "../../types/task";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import AdminTasksSkeleton from "../../components/skeletonScreens/AdminTasksSkeleton";
import { authFetch } from "../../utils/authFetch";
import { taskListStyles } from "../../styles/taskListStyles";
import { useTaskFilters } from "../../hooks/tasks/useTasksFilter";
import FilterChip from "../../components/tasks/FilterChip";
import FilterSection from "../../components/tasks/FilterSection";
import FilterModal from "../../components/tasks/FilterModal";
import TaskSearchBar from "../../components/tasks/TaskSearchBar";
import TaskCard from "../../components/tasks/TaskCard";

type FilterType =
  | "all"
  | "status"
  | "priority"
  | "label"
  | "employee"
  | "deadlineAsc"
  | "deadlineDesc"
  | "priorityHighLow"
  | "priorityLowHigh";

// Matches the actual `tasks` table columns — no `label` or `suggestion` columns exist yet
type TaskRow = {
  id: string;
  title: string;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: "low" | "medium" | "high";
  assigned_to: string;
  created_by: string;
  deadline: string;
};

type ManagedEmployee = { id: string; name: string; email: string };

const STATUS_RANK: Record<TaskStatus, number> = { overdue: 0, pending: 1, inReview: 2, completed: 3 };
const STATUS_LABELS: Record<TaskStatus, string> = {
  overdue: "Overdue",
  pending: "Pending",
  inReview: "In Review",
  completed: "Completed",
};
const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

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

export default function AdminTasks() {
  const { colors } = useTheme();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    modalVisible,
    setModalVisible,
    draftType,
    draftValue,
    appliedType,
    appliedValue,
    openModal,
    selectDraft,
    applyFilter,
    isSelected,
  } = useTaskFilters<FilterType>("all");

  // isRefresh=true skips the full-screen loading state so the header/search bar
  // stay mounted and the pull-to-refresh spinner is the only indicator.
  const fetchTasksAndTeam = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const res = await authFetch("/admin-tasks-and-team");
    if (!res.ok) {
      console.error("Could not load tasks and team:", res.status);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { tasks: taskRows, employees } = await res.json();
    setTasks((taskRows ?? []).map(mapRowToTask));
    setEmployees(employees ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTasksAndTeam();
  }, []);

  const onRefresh = useCallback(() => {
    fetchTasksAndTeam(true);
  }, []);

  const uniqueLabels = Array.from(new Set(tasks.map((t) => t.label).filter(Boolean)));

  const employeeDisplayName = (id: string) => {
    const match = employees.find((e) => e.id === id);
    return match?.name || match?.email || id;
  };

  const getVisibleTasks = () => {
    let list = [...tasks].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

    if (appliedType === "status" && appliedValue) list = list.filter((t) => t.status === appliedValue);
    if (appliedType === "priority" && appliedValue) list = list.filter((t) => t.priority === appliedValue);
    if (appliedType === "label" && appliedValue) {
      list = list.filter((t) => (t.label ?? "").toLowerCase() === appliedValue.toLowerCase());
    }
    if (appliedType === "employee" && appliedValue) list = list.filter((t) => t.assignedTo === appliedValue);
    if (appliedType === "deadlineAsc") list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (appliedType === "deadlineDesc") list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    if (appliedType === "priorityHighLow") {
      list.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    }
    if (appliedType === "priorityLowHigh") {
      list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.label ?? "").toLowerCase().includes(query) ||
          t.priority.toLowerCase().includes(query) ||
          STATUS_LABELS[t.status].toLowerCase().includes(query) ||
          employeeDisplayName(t.assignedTo).toLowerCase().includes(query),
      );
    }

    return list;
  };

  const visibleTasks = getVisibleTasks();
  const isSearching = searchQuery.trim().length > 0;

  if (loading) return <AdminTasksSkeleton />;

  return (
    <SafeAreaView style={[taskListStyles.safeArea, { backgroundColor: colors.base.background }]}>
      <View style={taskListStyles.headerRow}>
        <Text style={[typography.heading, { color: colors.text.primary }]}>Tasks</Text>
        <Pressable
          style={[taskListStyles.filterButton, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
          onPress={openModal}
        >
          <Text style={[typography.heading3, { color: colors.brand.accent }]}>Filter</Text>
        </Pressable>
      </View>

      <TaskSearchBar
        colors={colors}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search tasks, employee, label..."
      />

      <ScrollView
        contentContainerStyle={taskListStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.accent} colors={[colors.brand.accent]} />
        }
      >
        {visibleTasks.length === 0 ? (
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 20 }]}>
            {isSearching ? `No tasks found for "${searchQuery.trim()}".` : "No tasks match this filter."}
          </Text>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              colors={colors}
              task={task}
              statusLabels={STATUS_LABELS}
              subtitlePrefix={employeeDisplayName(task.assignedTo)}
              onPress={() => router.push({ pathname: "/(task)/task-detail-admin", params: { taskId: task.id } })}
            />
          ))
        )}
      </ScrollView>

      <FilterModal colors={colors} visible={modalVisible} onClose={() => setModalVisible(false)} onApply={applyFilter}>
        <FilterSection colors={colors}>
          <FilterChip colors={colors} label="All" selected={isSelected("all", null)} onPress={() => selectDraft("all", null)} />
          <FilterChip
            colors={colors}
            label="Earliest Deadline First"
            selected={isSelected("deadlineAsc", null)}
            onPress={() => selectDraft("deadlineAsc", null)}
          />
          <FilterChip
            colors={colors}
            label="Latest Deadline First"
            selected={isSelected("deadlineDesc", null)}
            onPress={() => selectDraft("deadlineDesc", null)}
          />
          <FilterChip
            colors={colors}
            label="High Priority First"
            selected={isSelected("priorityHighLow", null)}
            onPress={() => selectDraft("priorityHighLow", null)}
          />
          <FilterChip
            colors={colors}
            label="Low Priority First"
            selected={isSelected("priorityLowHigh", null)}
            onPress={() => selectDraft("priorityLowHigh", null)}
          />
        </FilterSection>

        <FilterSection colors={colors} label="By Status">
          {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
            <FilterChip
              key={status}
              colors={colors}
              label={STATUS_LABELS[status]}
              selected={isSelected("status", status)}
              onPress={() => selectDraft("status", status)}
            />
          ))}
        </FilterSection>

        <FilterSection colors={colors} label="By Priority">
          {(["low", "medium", "high"] as TaskPriority[]).map((priority) => (
            <FilterChip
              key={priority}
              colors={colors}
              label={priority.charAt(0).toUpperCase() + priority.slice(1)}
              selected={isSelected("priority", priority)}
              onPress={() => selectDraft("priority", priority)}
            />
          ))}
        </FilterSection>

        <FilterSection colors={colors} label="By Label">
          {uniqueLabels.map((label) => (
            <FilterChip
              key={label}
              colors={colors}
              label={label}
              selected={isSelected("label", label)}
              onPress={() => selectDraft("label", label)}
            />
          ))}
        </FilterSection>

        <FilterSection colors={colors} label="By Employee">
          {employees.map((emp) => (
            <FilterChip
              key={emp.id}
              colors={colors}
              label={emp.name || emp.email}
              selected={isSelected("employee", emp.id)}
              onPress={() => selectDraft("employee", emp.id)}
            />
          ))}
        </FilterSection>
      </FilterModal>
    </SafeAreaView>
  );
}