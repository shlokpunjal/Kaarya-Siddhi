// utils/calendarGrid.ts
import { supabase } from "../lib/supabase";

export type TaskCategory = "completed" | "inReview" | "pending" | "overdue";

export interface Task {
  id: string;
  title: string;
  descp: string;
  category: TaskCategory;
}

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "overdue" | "pending" | "in_review" | "completed";
  priority: string;
  assigned_to: string;
  created_by: string;
  deadline: string;
  workspace_id: string;
};

export const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function buildGrid(year: number, month: number): string[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: string[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push(toDateString(prevYear, prevMonth, daysInPrev - i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateString(year, month, d));
  let nd = 1;
  while (cells.length < 42) cells.push(toDateString(nextYear, nextMonth, nd++));
  return cells;
}

export function mapStatusToCategory(status: TaskRow["status"], deadline: string): TaskCategory {
  if (status === "completed") return "completed";
  if (status === "in_review") return "inReview";
  const deadlineDate = deadline ? deadline.slice(0, 10) : null;
  const todayDate = new Date().toISOString().slice(0, 10);
  return deadlineDate && deadlineDate < todayDate ? "overdue" : "pending";
}

export function groupTasksByDate(rows: TaskRow[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  rows.forEach((row) => {
    if (!row.deadline) return;
    const dateKey = row.deadline.slice(0, 10);
    const task: Task = {
      id: row.id,
      title: row.title,
      descp: row.description ?? "",
      category: mapStatusToCategory(row.status, row.deadline),
    };
    (map[dateKey] ??= []).push(task);
  });
  return map;
}

export function getFreshChannel(name: string) {
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
}