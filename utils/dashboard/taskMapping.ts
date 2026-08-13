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
  team_batch_id?: string | null;
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
    teamBatchId: row.team_batch_id ?? null,
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

// Status priority when collapsing a team's per-employee rows into one
// dashboard card — surfaces whichever bucket needs the admin's attention
// most: an overdue teammate outranks a completed one, etc.
const STATUS_PRIORITY: Task["status"][] = ["overdue", "pending", "inReview", "completed"];

function aggregateStatus(statuses: Task["status"][]): Task["status"] {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s;
  }
  return "pending";
}

/**
 * Collapses rows that share a team_batch_id (created via "Team" assign
 * mode — one row per employee, see useTaskForm's isTeamCreate branch)
 * into a single synthetic Task per batch, so the admin dashboard shows
 * one card ("Assigned to 3 employees") instead of one per teammate.
 * Non-team tasks pass through unchanged.
 *
 * IMPORTANT: call this AFTER syncOverdueStatuses, not before — the
 * overdue sync needs each row's real, individual id to PATCH it
 * correctly. Grouping first would collapse those ids and only patch
 * one row per batch instead of every teammate's row.
 */
export function groupTeamTasks(tasks: Task[]): Task[] {
  const solo: Task[] = [];
  const batches = new Map<string, Task[]>();

  for (const t of tasks) {
    if (!t.teamBatchId) {
      solo.push(t);
      continue;
    }
    const group = batches.get(t.teamBatchId) ?? [];
    group.push(t);
    batches.set(t.teamBatchId, group);
  }

  const grouped: Task[] = [...batches.entries()].map(([batchId, members]) => {
    // All members share title/priority/dueDate/createdBy — just take
    // them from the first row; only status and count are aggregated.
    //
    // IMPORTANT: `id` must stay a REAL task id (first.id), not a
    // synthetic string, because it's used to navigate to
    // /tasks/{id}/detail — that endpoint does `.eq("id", task_id)`
    // against a Postgres uuid column, and a synthetic id like
    // "team_<batchId>" throws "invalid input syntax for type uuid" on
    // the backend (unhandled -> 500). groupKey is the synthetic,
    // batch-unique value — use it ONLY for list `key={}` props, never
    // for navigation or API calls.
    const first = members[0];
    return {
      ...first,
      id: first.id,
      groupKey: `team_${batchId}`,
      status: aggregateStatus(members.map((m) => m.status)),
      teamMemberCount: members.length,
    };
  });

  return [...solo, ...grouped];
}