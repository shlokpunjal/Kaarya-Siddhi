// lib/notify.ts
//
// Shared notification helper for client-only flows.
//
// - connection requests/decisions are handled entirely by main.py (backend),
//   which writes to `notifications` and sends the push itself — this file is
//   NOT used for those, to avoid duplicate notification rows.
// - extension_request (the PENDING alert to admins) is push-only: the actual
//   request lives in extension_requests, and the admin's Requests screen
//   reads that table directly. No `notifications` row is created for it.
// - extension_accepted / extension_rejected (decided, shown to the employee)
//   and task_assigned still go through createNotification() below, which
//   writes a `notifications` row AND sends the push.

import { supabase } from "./supabase";

type NotificationType = "extension_accepted" | "extension_rejected" | "task_assigned";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
  metadata?: Record<string, any>;
}) {
  const { userId, type, message, taskId, metadata } = params;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    task_id: taskId ?? null,
    type,
    message,
    is_read: false,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }

  await sendPushOnly(userId, notificationTitle(type), message, {
    type,
    taskId: taskId ?? null,
    ...metadata,
  });
}

// Sends an Expo push with no corresponding `notifications` row. Used for
// extension_request, whose source of truth is the extension_requests table.
export async function sendPushOnly(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const { data: userRow } = await supabase
    .from("users")
    .select("expo_push_token")
    .eq("id", userId)
    .single();

  const pushToken = userRow?.expo_push_token;
  if (!pushToken) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: "default",
        data,
      }),
    });
  } catch (err) {
    console.error("Push send failed:", err);
  }
}

function notificationTitle(type: NotificationType): string {
  switch (type) {
    case "extension_accepted":
      return "Extension Accepted";
    case "extension_rejected":
      return "Extension Rejected";
    case "task_assigned":
      return "New Task Assigned";
    default:
      return "Notification";
  }
}

export async function deletePendingNotificationsForTask(taskId: string, type: NotificationType) {
  await supabase.from("notifications").delete().eq("task_id", taskId).eq("type", type);
}