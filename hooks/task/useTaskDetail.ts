import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";

export type TaskDetailMeta = {
  assigned_by_name?: string;
  assigned_to_name?: string;
};

export type Teammate = {
  task_id: string;
  employee_id: string;
  name: string;
  status: string | null;
};

/**
 * Fetches /tasks/:id/detail — the task row, its attached files, the
 * files (if any) submitted along with an "Ask to Review" request,
 * whatever assignment metadata the endpoint returns (assigned_by_name
 * for the employee screen, assigned_to_name for the admin screen), and
 * — for tasks created via "Team" assign mode — the other employees who
 * share this task's team_batch_id, each with their own status.
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
  const [submissionFiles, setSubmissionFiles] = useState<any[]>([]);
  const [meta, setMeta] = useState<TaskDetailMeta>({});
  const [teammates, setTeammates] = useState<Teammate[]>([]);
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

    const {
      task: taskData,
      files,
      submission_files,
      assigned_by_name,
      assigned_to_name,
      teammates: teammatesData,
    } = await res.json();

    const normalizedTask = normalizeStatus ? normalizeStatus(taskData) : taskData;

    // `teammates` from the API is the OTHER employees sharing this task's
    // team_batch_id — it deliberately excludes THIS row's own assignee.
    // That's why assigning to N people always shows N-1: the missing one
    // is this task's own employee, sitting in `taskData`/`assigned_to_name`,
    // never in `teammatesData`. Add that self row back in.
    //
    // NOTE: we don't actually know the field name the backend uses on
    // `taskData` for "which employee this row belongs to" — it may be
    // `employee_id`, `assigned_to`, `assignee_id`, `user_id`, etc. Rather
    // than gate the whole merge on one guessed field name (which silently
    // no-ops if wrong — that was the bug in the previous version), try a
    // few common ones and fall back to the task's own id, which always
    // exists and is still guaranteed unique.
    const others: Teammate[] = teammatesData ?? [];
    const selfEmployeeId: string | undefined =
      taskData?.employee_id ??
      taskData?.assigned_to ??
      taskData?.assignee_id ??
      taskData?.user_id ??
      taskData?.id;

    const selfAlreadyIncluded = others.some(
      (t) => t.task_id === taskData?.id || (selfEmployeeId && t.employee_id === selfEmployeeId),
    );

    const fullTeammates: Teammate[] =
      others.length > 0 && !selfAlreadyIncluded
        ? [
            {
              task_id: taskData?.id,
              employee_id: selfEmployeeId ?? taskData?.id,
              name: assigned_to_name ?? "You",
              status: taskData?.status ?? null,
            },
            ...others,
          ]
        : others;

    setTask(normalizedTask);
    setTaskFiles(files ?? []);
    setSubmissionFiles(submission_files ?? []);
    setMeta({ assigned_by_name, assigned_to_name });
    setTeammates(fullTeammates);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return {
    task,
    setTask,
    taskFiles,
    submissionFiles,
    meta,
    teammates,
    loading,
    refetch: fetchTask,
  };
}