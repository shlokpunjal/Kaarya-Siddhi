export type RequestStatus = "pending" | "accepted" | "rejected";
type IconVariant = "solid" | "outline";

const ICONS: Record<RequestStatus, Record<IconVariant, string>> = {
  pending: { solid: "time", outline: "time-outline" },
  accepted: { solid: "checkmark-circle", outline: "checkmark-circle-outline" },
  rejected: { solid: "close-circle", outline: "close-circle-outline" },
};

/**
 * Was three near-identical `statusMeta` functions:
 *   - admin-connection-review.tsx & admin-request-review.tsx used the
 *     "solid" icon set with label "Pending Review" for the big status hero.
 *   - employee-request-detail.tsx used the "outline" icon set with the
 *     shorter label "Pending" for its inline badge.
 *
 * `short = true` reproduces that employee-screen label exactly; every other
 * label is identical across all three original copies, so no other
 * divergence needed preserving.
 */
export function getStatusMeta(
  colors: any,
  status: RequestStatus,
  variant: IconVariant = "solid",
  short = false,
) {
  const color =
    status === "accepted"
      ? colors.status.completed
      : status === "rejected"
      ? colors.status.overdue
      : colors.status.pending;

  const label =
    status === "accepted"
      ? "Accepted"
      : status === "rejected"
      ? "Rejected"
      : short
      ? "Pending"
      : "Pending Review";

  return {
    color,
    icon: ICONS[status][variant] as any,
    label,
  };
}

/**
 * Was `priorityColor` (admin-requests-list.tsx, color only) and
 * `priorityMeta` (admin-request-review.tsx, color + label). This is a
 * strict superset — callers that only need `.color` can just read that
 * field off the returned object.
 */
export function getPriorityMeta(colors: any, priority?: string) {
  if (priority === "high") return { color: colors.status.overdue, label: "High Priority" };
  if (priority === "medium") return { color: colors.status.pending, label: "Medium Priority" };
  return { color: colors.status.completed, label: "Low Priority" };
}