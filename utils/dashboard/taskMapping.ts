import { Task } from "../../types/task";
import { authFetch } from "./../authFetch";

export type TaskRow = {
  id: string;
  title: string;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: "low" | "medium" | "high";
  assigned_to: string;
  created_by: string;
  deadline: string;
};

export function mapRowToTask(row: TaskRow): Task {
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

// Flips any pending-but-past-due tasks to "overdue" in the DB, then reflects
// it locally. Runs after every fetch, so status is always accurate without
// needing a scheduled job.
export async function syncOverdueStatuses(fetchedTasks: Task[]): Promise<Task[]> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueOnes = fetchedTasks.filter(
    (t) => t.status === "pending" && t.dueDate?.slice(0, 10) < today,
  );

  if (overdueOnes.length === 0) return fetchedTasks;

  await Promise.all(
    overdueOnes.map((t) =>
      authFetch(`/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "overdue" }),
      }).catch((err) => console.error(`Failed to mark task ${t.id} overdue:`, err)),
    ),
  );

  return fetchedTasks.map((t) =>
    overdueOnes.some((o) => o.id === t.id) ? { ...t, status: "overdue" as const } : t,
  );
}