// app/(admin)/tasks.tsx
import TaskListView from "../../components/TaskListView";
import { authFetch } from "../../utils/authFetch";
import { mapRowToTask, TaskRow, ManagedEmployee } from "../../utils/taskList";

export default function AdminTasks() {
  return (
    <TaskListView
      taskDetailRoute="/(task)/taskDetailAdmin"
      searchPlaceholder="Search tasks, employee, label..."
      showEmployeeColumn
      fetchTasks={async () => {
        const res = await authFetch("/admin-tasks-and-team");
        if (!res.ok) throw new Error(`Could not load tasks and team: ${res.status}`);
        const { tasks, employees } = await res.json();
        return {
          tasks: ((tasks ?? []) as TaskRow[]).map(mapRowToTask),
          employees: (employees ?? []) as ManagedEmployee[],
        };
      }}
    />
  );
}