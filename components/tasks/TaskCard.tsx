import { Pressable, View, Text } from "react-native";
import { typography } from "../../theme/theme";
import { taskListStyles } from "../../styles/taskListStyles";
import { Task, TaskStatus } from "../../types/task";

type ThemeColors = any;

type Props = {
  colors: ThemeColors;
  task: Task;
  statusLabels: Record<TaskStatus, string>;
  onPress: () => void;
  // Admin passes the assignee's display name here (e.g. "Priya Sharma · ");
  // employee omits this entirely since a task is implicitly "theirs".
  subtitlePrefix?: string;
};

export default function TaskCard({ colors, task, statusLabels, onPress, subtitlePrefix }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[taskListStyles.taskCard, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
    >
      <View style={taskListStyles.taskCardHeader}>
        <Text style={[typography.heading3, { color: colors.text.primary, flex: 1 }]}>{task.title}</Text>
        <View style={[taskListStyles.statusBadge, { backgroundColor: colors.status[task.status] }]}>
          <Text style={[typography.label, taskListStyles.statusBadgeText]}>{statusLabels[task.status]}</Text>
        </View>
      </View>
      <Text style={[typography.label, { color: colors.text.secondary, marginTop: 6 }]}>
        {subtitlePrefix ? `${subtitlePrefix} · ` : ""}
        {task.label} · {task.priority.toUpperCase()} · Due {task.dueDate.split("T")[0]}
      </Text>
    </Pressable>
  );
}