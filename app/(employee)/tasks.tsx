// app/(employee)/tasks.tsx
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TaskListView from "../../components/TaskListView";
import { authFetch } from "../../utils/authFetch";
import { mapRowToTask, TaskRow } from "../../utils/taskList";

export default function EmployeeTasks() {
  const router = useRouter();

  return (
    <TaskListView
      taskDetailRoute="/(task)/task-detail"
      searchPlaceholder="Search tasks..."
      showEmployeeColumn={false}
      fetchTasks={async () => {
        // Custom OTP backend, not Supabase Auth — session lives in AsyncStorage.
        const email = await AsyncStorage.getItem("userEmail");
        if (!email) {
          router.replace("/(auth)/LoginChoice");
          return { tasks: [], employees: [] };
        }
        const res = await authFetch("/tasks");
        if (!res.ok) throw new Error(`Error fetching tasks list: ${res.status}`);
        const data = await res.json();
        return { tasks: ((data ?? []) as TaskRow[]).map(mapRowToTask), employees: [] };
      }}
    />
  );
}