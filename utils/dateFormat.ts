// utils/dateFormat.ts
//
// Formats a Date as "YYYY-MM-DD" using its LOCAL date parts.
//
// Do NOT use `date.toISOString().split("T")[0]` for this — toISOString()
// converts to UTC first. For users in IST (UTC+5:30), a Date built from a
// local midnight selection (e.g. the deadline date picker) shifts back to
// the previous day once converted to UTC, silently saving the wrong date
// to the database (e.g. picking "20 Jul" saves "2026-07-19").
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
