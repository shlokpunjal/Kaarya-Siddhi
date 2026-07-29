// utils/taskList.ts
import { TaskStatus, TaskPriority, Task } from "../types/task";

export type FilterType =
  | "all" | "status" | "priority" | "label" | "employee"
  | "deadlineAsc" | "deadlineDesc" | "priorityHighLow" | "priorityLowHigh";

export type TaskRow = {
  id: string;
  title: string;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: "low" | "medium" | "high";
  assigned_to: string;
  created_by: string;
  deadline: string;
};

export type ManagedEmployee = { id: string; name: string; email: string };

export const STATUS_RANK: Record<TaskStatus, number> = { overdue: 0, pending: 1, inReview: 2, completed: 3 };
export const STATUS_LABELS: Record<TaskStatus, string> = { overdue: "Overdue", pending: "Pending", inReview: "In Review", completed: "Completed" };
export const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

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