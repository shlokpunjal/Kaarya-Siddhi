import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../utils/authFetch";
import { registerAndSavePushToken } from "../lib/pushNotifications";
import { sendLocalNotification } from "../utils/notifications";
import {
  showLocalNotificationForRow,
  navigateFromNotificationData,
} from "../services/notificationService";
import {
  subscribeToUserNotifications,
  subscribeToWorkspaceExtensionRequests,
  safeRemoveChannel,
} from "../services/realtimeService";

/**
 * Owns all per-user notification wiring for the app:
 *  - registering/saving the push token
 *  - Supabase Realtime subscriptions (new notifications, and — for
 *    admins — new extension requests in their workspace)
 *  - notification-tap navigation, both cold start and while running
 *
 * This is a straight extraction of what used to be the `NotificationBridge`
 * component's body in app/_layout.tsx — same effects, same dependency
 * arrays, same cleanup, same duplicate-subscription guarding (via
 * services/realtimeService.ts's getFreshChannel). Nothing about *when*
 * or *how often* things run has changed, only where the code lives.
 *
 * Mount this once, near the root, inside a component that stays mounted
 * for the lifetime of the logged-in session (see app/_layout.tsx). It
 * renders nothing — call it, don't wrap it in JSX.
 */
export function useNotificationBridge(): void {
  const router = useRouter();
  const { userEmail, userRole } = useAuth();

  // ---------------------------------------------------------
  // 1. PUSH TOKEN + SUPABASE REALTIME NOTIFICATIONS
  // ---------------------------------------------------------
  useEffect(() => {
    if (!userEmail) {
      console.log("[useNotificationBridge] No user logged in yet.");
      return;
    }

    let notifChannel: any = null;
    let extensionChannel: any = null;
    let cancelled = false;

    const setupNotifications = async () => {
      try {
        console.log("[useNotificationBridge] Starting setup...");

        // ---------------------------------------------------
        // Get current user
        // ---------------------------------------------------
        const meRes = await authFetch("/me");
        const userRow = meRes.ok ? await meRes.json() : null;
        const userError = meRes.ok ? null : { message: `HTTP ${meRes.status}` };

        if (cancelled) return;

        if (userError) {
          console.error("[useNotificationBridge] Failed to fetch user:", userError);
          return;
        }

        if (!userRow) {
          console.warn("[useNotificationBridge] User row not found.");
          return;
        }

        console.log("[useNotificationBridge] User loaded:", userRow.id, userRow.role);

        // notifications_enabled === false means: still write the row (so
        // it shows on the in-app notifications page), just don't buzz
        // the tray. false is the only value that suppresses it — missing/
        // null defaults to enabled, matching the DB column's default.
        const notificationsEnabled = userRow.notifications_enabled !== false;

        // ---------------------------------------------------
        // Register push token
        // Failure here should NOT stop the app/realtime setup.
        // ---------------------------------------------------
        try {
          await registerAndSavePushToken();
          console.log("[useNotificationBridge] Push registration completed.");
        } catch (pushError) {
          console.error("[useNotificationBridge] Push registration failed:", pushError);
        }

        if (cancelled) return;

        // ---------------------------------------------------
        // Notification table realtime listener
        // ---------------------------------------------------
        try {
          notifChannel = subscribeToUserNotifications(userRow.id, async (notification) => {
            if (!notificationsEnabled) {
              // Row already exists in the DB (written server-side
              // before this realtime event fires) — it'll show up
              // next time they open the notifications page. Just
              // skip the tray banner.
              return;
            }

            try {
              await showLocalNotificationForRow(notification);
            } catch (notificationError) {
              console.error(
                "[useNotificationBridge] Failed to show local notification:",
                notificationError,
              );
            }
          });
        } catch (channelError) {
          console.error(
            "[useNotificationBridge] Failed to create notification channel:",
            channelError,
          );
        }

        // ---------------------------------------------------
        // Admin extension request listener
        // ---------------------------------------------------
        if (userRow.role === "admin" && userRow.workspace_id) {
          try {
            extensionChannel = subscribeToWorkspaceExtensionRequests(
              userRow.workspace_id,
              async (row) => {
                try {
                  await sendLocalNotification(
                    "New Extension Request",
                    "A deadline extension was requested.",
                    row
                      ? {
                          type: "extension_request",
                          extension_request_id: row.id,
                          taskId: row.task_id,
                        }
                      : undefined,
                  );
                } catch (notificationError) {
                  console.error(
                    "[useNotificationBridge] Extension notification failed:",
                    notificationError,
                  );
                }
              },
            );
          } catch (extensionError) {
            console.error(
              "[useNotificationBridge] Failed to create extension channel:",
              extensionError,
            );
          }
        }

        console.log("[useNotificationBridge] Setup completed successfully.");
      } catch (error) {
        // MOST IMPORTANT:
        // Don't allow bridge setup errors to become unhandled promise
        // rejections.
        console.error("[useNotificationBridge] Unexpected setup error:", error);
      }
    };

    setupNotifications().catch((error) => {
      console.error("[useNotificationBridge] Fatal setup promise error:", error);
    });

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    return () => {
      cancelled = true;
      console.log("[useNotificationBridge] Cleaning up...");
      safeRemoveChannel(notifChannel, "notification");
      safeRemoveChannel(extensionChannel, "extension");
    };
  }, [userEmail]);

  // ---------------------------------------------------------
  // 2. NOTIFICATION TAP / DEEP LINK HANDLING
  // ---------------------------------------------------------
  useEffect(() => {
    let responseSubscription: Notifications.EventSubscription | null = null;
    let navigationTimer: ReturnType<typeof setTimeout> | null = null;

    const handleColdStartNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();

        if (!response) {
          return;
        }

        const data = response.notification.request.content.data as Record<string, any>;

        if (!data) {
          return;
        }

        // Router might not be completely mounted during cold start.
        navigationTimer = setTimeout(() => {
          try {
            navigateFromNotificationData(data, router, userRole);
          } catch (navigationError) {
            console.error("[useNotificationBridge] Cold-start navigation failed:", navigationError);
          }
        }, 700);
      } catch (error) {
        console.error("[useNotificationBridge] Failed reading last notification:", error);
      }
    };

    handleColdStartNotification().catch((error) => {
      console.error("[useNotificationBridge] Cold-start handler failed:", error);
    });

    // ---------------------------------------------------------
    // App already running/backgrounded → notification tapped
    // ---------------------------------------------------------
    try {
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response.notification.request.content.data as Record<string, any>;

          if (!data) {
            return;
          }

          navigateFromNotificationData(data, router, userRole);
        } catch (error) {
          console.error("[useNotificationBridge] Notification navigation failed:", error);
        }
      });
    } catch (error) {
      console.error("[useNotificationBridge] Failed adding response listener:", error);
    }

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }

      try {
        responseSubscription?.remove();
      } catch (error) {
        console.error("[useNotificationBridge] Listener cleanup failed:", error);
      }
    };
  }, [router, userRole]);
}