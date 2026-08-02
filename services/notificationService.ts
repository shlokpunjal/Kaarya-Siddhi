import * as Notifications from "expo-notifications";
import type { useRouter } from "expo-router";
import { sendLocalNotification } from "../utils/notifications";

// Higher-level notification "what should happen" logic: what a
// notification type is titled, what happens when it's tapped, and how a
// realtime-observed DB row becomes an on-screen local notification.
// Low-level presentation (actually scheduling a local notification via
// expo-notifications) still lives in utils/notifications.ts — this file
// decides content/routing, that one decides delivery mechanics.
//
// Moved out of app/_layout.tsx during the notification-logic refactor so
// _layout.tsx can stay focused on layout/providers/navigation. Behavior
// is unchanged from before the move.

/**
 * Configures how notifications are presented while the app is in the
 * foreground. This is the single source of truth for that config — call
 * it exactly once. It's invoked at module load below, so importing this
 * module (directly, or transitively via hooks/useNotificationBridge.ts)
 * is enough to apply it; no separate call is needed elsewhere.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
configureNotificationHandler();

export function notifTitle(type: string): string {
  switch (type) {
    case "connection_request":
      return "New Connection Request";
    case "connection_accepted":
      return "Request Accepted";
    case "connection_rejected":
      return "Request Rejected";
    case "extension_accepted":
      return "Extension Accepted";
    case "extension_rejected":
      return "Extension Rejected";
    case "task_assigned":
      return "New Task Assigned";
    case "task_in_review":
      return "Task Submitted for Review";
    case "task_suggestion":
      return "Changes Requested";
    case "eoffice_pending":
      return "Track your eOffice files";
    default:
      return "Notification";
  }
}

/**
 * Turns a `notifications` table row (as delivered by the realtime
 * bridge) into an on-screen local notification banner.
 */
export async function showLocalNotificationForRow(notification: any): Promise<void> {
  const title = notifTitle(notification.type);
  const message = notification.message ?? "You have a new notification.";

  await sendLocalNotification(title, message, {
    type: notification.type,
    taskId: notification.task_id,
    ...(notification.metadata ?? {}),
  });
}

/**
 * Routes the app to the right screen when a notification is tapped
 * (cold start or foreground/background). `userRole` disambiguates
 * types that route differently for admins vs. employees.
 */
export function navigateFromNotificationData(
  data: Record<string, any>,
  router: ReturnType<typeof useRouter>,
  userRole?: string | null,
): void {
  if (!data?.type) return;

  switch (data.type) {
    case "connection_request":
      router.push({
        pathname: "/notifications/admin-connection-review",
        params: {
          employeeEmail: data.employee_email,
          adminEmail: data.admin_email,
        },
      });
      break;
    case "connection_accepted":
    case "connection_rejected":
      router.push("/notifications/employee");
      break;
    case "extension_request":
      router.push({
        pathname: "/notifications/admin-request-review",
        params: { requestId: data.extension_request_id },
      });
      break;
    case "extension_accepted":
    case "extension_rejected":
      router.push({
        pathname: "/notifications/employee-request-detail",
        params: { requestId: data.extension_request_id },
      });
      break;
    case "task_assigned":
      router.push({
        pathname: "/(task)/task-detail",
        params: { taskId: data.taskId },
      });
      break;
    case "task_in_review":
    case "task_suggestion":
    case "deadline":
    case "overdue":
      // deadline: only ever sent to the employee (assignee), so no
      // role branch needed — always the employee-facing screen.
      // task_suggestion: only ever sent to the employee a task is
      // assigned to (see backend/routes/employee_tasks.py:update_task),
      // so it's always the employee-facing screen too.
      // overdue / task_in_review: sent to both the assignee and the
      // task's creator — the creator is often an admin, who needs
      // taskDetailAdmin, not the employee-facing task-detail screen
      // (which the in-app "Other Notifications" tap in admin.tsx
      // already routes to for task_in_review).
      router.push({
        pathname: userRole === "admin" ? "/(task)/taskDetailAdmin" : "/(task)/task-detail",
        params: { taskId: data.taskId },
      });
      break;
    case "eoffice_pending":
  }
}