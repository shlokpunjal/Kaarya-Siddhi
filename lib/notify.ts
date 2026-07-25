import { authFetch } from "../utils/authFetch";

// Keep this in sync with every notification `type` the backend actually
// creates (see backend/notify_utils.py DEFAULT_TITLES). Previously this
// union only listed 3 of the ~10 types in real use, which meant
// mismatched/typo'd type strings elsewhere in the app weren't caught by
// TypeScript at all.
export type NotificationType =
  | "connection_request"
  | "connection_pending"
  | "connection_accepted"
  | "connection_rejected"
  | "extension_request"
  | "extension_accepted"
  | "extension_rejected"
  | "task_assigned"
  | "task_in_review"
  | "deadline"
  | "overdue"
  | "eoffice_pending";

// All functions in this file are fire-and-forget side effects of some
// primary action (creating a task, etc.) â€” none of them should ever
// throw. A flaky network call here must never surface as a false
// "Something went wrong" error for an action that actually succeeded,
// so every request is wrapped in try/catch.

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  try {
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
    if (!res.ok) {
      console.error("Failed to create notification:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return false;
  }
}

export async function deletePendingNotificationsForTask(
  taskId: string,
  type: NotificationType,
): Promise<boolean> {
  try {
    const res = await authFetch(
      `/notify-pending?task_id=${taskId}&type=${type}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      console.error("Failed to delete pending notifications:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to delete pending notifications:", err);
    return false;
  }
}

// Push only â€” doesn't write a `notifications` row. Use when the calling
// screen already has its own record of the event (e.g. extension_requests)
// and a notifications row would just be a duplicate.
export async function sendPushOnly(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<boolean> {
  try {
    const res = await authFetch("/notify-push-only", {
      method: "POST",
      body: JSON.stringify({ userId, title, body, data: data ?? {} }),
    });
    if (!res.ok) {
      console.error("Failed to send push:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send push:", err);
    return false;
  }
}
