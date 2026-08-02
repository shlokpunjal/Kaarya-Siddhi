import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";

export type TaskDetailMeta = {
  assigned_by_name?: string;
  assigned_to_name?: string;
};

/**
 * Fetches /tasks/:id/detail — the task row, its attached files, and
 * whatever assignment metadata the endpoint returns (assigned_by_name
 * for the employee screen, assigned_to_name for the admin screen).
 *
 * `normalizeStatus` lets a screen adapt the raw DB status to whatever
 * shape it wants to render with (e.g. the admin screen maps
 * "in_review" -> "inReview" for its statusColorMap keys).
 */
export function useTaskDetail(
  taskId: string | undefined,
  normalizeStatus?: (task: any) => any,
) {
  const [task, setTask] = useState<any>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [meta, setMeta] = useState<TaskDetailMeta>({});
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);

    const res = await authFetch(`/tasks/${taskId}/detail`);
    if (!res.ok) {
      console.error("Task fetch error:", res.status);
      setLoading(false);
      return;
    }

    const { task: taskData, files, assigned_by_name, assigned_to_name } =
      await res.json();

    setTask(normalizeStatus ? normalizeStatus(taskData) : taskData);
    setTaskFiles(files ?? []);
    setMeta({ assigned_by_name, assigned_to_name });
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, setTask, taskFiles, meta, loading, refetch: fetchTask };
}