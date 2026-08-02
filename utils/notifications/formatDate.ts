/**
 * Single source of truth for the "en-IN, 2-digit day / short month / numeric year"
 * date format used across every notifications screen.
 *
 * Was copy-pasted inline (same options object) in:
 *   admin.tsx, employee.tsx, admin-requests-list.tsx,
 *   admin-request-review.tsx, employee-request-detail.tsx
 */
export function formatDateIN(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}