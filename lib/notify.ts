import { authFetch } from "../utils/authFetch";

type NotificationType = "extension_accepted" | "extension_rejected" | "task_assigned";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
  metadata?: Record<string, any>;
}) {
  const res = await authFetch("/notify", {
    method: "POST",
    body: JSON.stringify({
      userId: params.userId,
      type: params.type,
      message: params.message,
      taskId: params.taskId ?? null,
      metadata: params.metadata ?? {},
    }),
  });
  if (!res.ok) console.error("Failed to create notification:", res.status);
}

export async function deletePendingNotificationsForTask(taskId: string, type: NotificationType) {
  await authFetch(`/notify-pending?task_id=${taskId}&type=${type}`, { method: "DELETE" });
}

// Push only — doesn't write a `notifications` row. Use when the calling
// screen already has its own record of the event (e.g. extension_requests)
// and a notifications row would just be a duplicate.
export async function sendPushOnly(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const res = await authFetch("/notify-push-only", {
    method: "POST",
    body: JSON.stringify({ userId, title, body, data: data ?? {} }),
  });
  if (!res.ok) console.error("Failed to send push:", res.status);
}