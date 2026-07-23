import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from '../lib/supabase'
import { ThemeProvider } from '../context/ThemeContext';
import { typography } from '../theme/theme';
import { AuthProvider, useAuth } from "../context/AuthContext";
import { enableScreens } from 'react-native-screens';
import * as Notifications from "expo-notifications";
import { sendLocalNotification } from "../utils/notifications";
import { registerAndSavePushToken } from "../lib/pushNotifications";
import { ToastProvider } from "../context/ToastContext";
import OfflineScreen from "../components/OfflineScreen";



// enableScreens(false);
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const BRAND_PRIMARY = '#1A2744';
const BRAND_ACCENT = '#E8870A';
const BRAND_SHADOW = '#815727';
const TEXT_PRIMARY = '#F0EDE6';
const TEXT_SECONDARY = '#8B95A1';
const LOGO_SIZE = 114;

function notifTitle(type: string): string {
  switch (type) {
    case "connection_request": return "New Connection Request";
    case "connection_accepted": return "Request Accepted";
    case "connection_rejected": return "Request Rejected";
    case "extension_accepted": return "Extension Accepted";
    case "extension_rejected": return "Extension Rejected";
    case "task_assigned": return "New Task Assigned";
    case "task_in_review": return "Task Submitted for Review";
    case "eoffice_pending": return "Track your eOffice files";
    default: return "Notification";
  }
}

function navigateFromNotificationData(data: Record<string, any>, router: ReturnType<typeof useRouter>) {
  if (!data?.type) return;

  switch (data.type) {
    case "connection_request":
      router.push({
        pathname: "/notifications/admin-connection-review",
        params: { employeeEmail: data.employee_email, adminEmail: data.admin_email },
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
    case "task_in_review":
      router.push({
        pathname: "/(task)/task-detail",
        params: { taskId: data.taskId },
      });
      break;
    case "eoffice_pending":
      router.push("/reports/eoffice");
      break;
  }
}
function NotificationBridge() {
  const router = useRouter();
  const { userEmail } = useAuth();

  // ---------------------------------------------------------
  // 1. PUSH TOKEN + SUPABASE REALTIME NOTIFICATIONS
  // ---------------------------------------------------------
  useEffect(() => {
    if (!userEmail) {
      console.log("[NotificationBridge] No user logged in yet.");
      return;
    }

    let notifChannel: any = null;
    let extensionChannel: any = null;
    let cancelled = false;

    const setupNotifications = async () => {
      try {
        console.log("[NotificationBridge] Starting setup...");

        // ---------------------------------------------------
        // Get current user
        // ---------------------------------------------------
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("id, workspace_id, role")
          .eq("email", userEmail)
          .single();

        if (cancelled) return;

        if (userError) {
          console.error(
            "[NotificationBridge] Failed to fetch user:",
            userError
          );
          return;
        }

        if (!userRow) {
          console.warn("[NotificationBridge] User row not found.");
          return;
        }

        console.log(
          "[NotificationBridge] User loaded:",
          userRow.id,
          userRow.role
        );

        // ---------------------------------------------------
        // Register push token
        // Failure here should NOT stop the app/realtime setup.
        // ---------------------------------------------------
        try {
          await registerAndSavePushToken();

          console.log(
            "[NotificationBridge] Push registration completed."
          );
        } catch (pushError) {
          console.error(
            "[NotificationBridge] Push registration failed:",
            pushError
          );
        }

        if (cancelled) return;

        // ---------------------------------------------------
        // Notification table realtime listener
        // ---------------------------------------------------
        try {
          notifChannel = supabase
            .channel(`global_notifs_${userRow.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userRow.id}`,
              },
              async (payload) => {
                try {
                  const notification = payload?.new;

                  if (!notification) {
                    console.warn(
                      "[NotificationBridge] Empty notification payload."
                    );
                    return;
                  }

                  const title = notifTitle(notification.type);

                  const message =
                    notification.message ??
                    "You have a new notification.";

                  await sendLocalNotification(title, message);
                } catch (notificationError) {
                  console.error(
                    "[NotificationBridge] Failed to show local notification:",
                    notificationError
                  );
                }
              }
            )
            .subscribe((status) => {
              console.log(
                "[NotificationBridge] Notification channel:",
                status
              );
            });
        } catch (channelError) {
          console.error(
            "[NotificationBridge] Failed to create notification channel:",
            channelError
          );
        }

        // ---------------------------------------------------
        // Admin extension request listener
        // ---------------------------------------------------
        if (userRow.role === "admin" && userRow.workspace_id) {
          try {
            extensionChannel = supabase
              .channel(
                `global_extensions_${userRow.workspace_id}`
              )
              .on(
                "postgres_changes",
                {
                  event: "INSERT",
                  schema: "public",
                  table: "extension_requests",
                  filter: `workspace_id=eq.${userRow.workspace_id}`,
                },
                async () => {
                  try {
                    await sendLocalNotification(
                      "New Extension Request",
                      "A deadline extension was requested."
                    );
                  } catch (notificationError) {
                    console.error(
                      "[NotificationBridge] Extension notification failed:",
                      notificationError
                    );
                  }
                }
              )
              .subscribe((status) => {
                console.log(
                  "[NotificationBridge] Extension channel:",
                  status
                );
              });
          } catch (extensionError) {
            console.error(
              "[NotificationBridge] Failed to create extension channel:",
              extensionError
            );
          }
        }

        console.log(
          "[NotificationBridge] Setup completed successfully."
        );
      } catch (error) {
        // MOST IMPORTANT:
        // Don't allow NotificationBridge setup errors to become
        // unhandled promise rejections.
        console.error(
          "[NotificationBridge] Unexpected setup error:",
          error
        );
      }
    };

    setupNotifications().catch((error) => {
      console.error(
        "[NotificationBridge] Fatal setup promise error:",
        error
      );
    });

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    return () => {
      cancelled = true;

      console.log("[NotificationBridge] Cleaning up...");

      if (notifChannel) {
        try {
          supabase.removeChannel(notifChannel);
        } catch (error) {
          console.error(
            "[NotificationBridge] Failed removing notification channel:",
            error
          );
        }
      }

      if (extensionChannel) {
        try {
          supabase.removeChannel(extensionChannel);
        } catch (error) {
          console.error(
            "[NotificationBridge] Failed removing extension channel:",
            error
          );
        }
      }
    };
  }, [userEmail]);

  // ---------------------------------------------------------
  // 2. NOTIFICATION TAP / DEEP LINK HANDLING
  // ---------------------------------------------------------
  useEffect(() => {
    let responseSubscription:
      | Notifications.EventSubscription
      | null = null;

    let navigationTimer: ReturnType<typeof setTimeout> | null = null;

    const handleColdStartNotification = async () => {
      try {
        const response =
          await Notifications.getLastNotificationResponseAsync();

        if (!response) {
          return;
        }

        const data = response.notification.request.content
          .data as Record<string, any>;

        if (!data) {
          return;
        }

        // Router might not be completely mounted during cold start.
        navigationTimer = setTimeout(() => {
          try {
            navigateFromNotificationData(data, router);
          } catch (navigationError) {
            console.error(
              "[NotificationBridge] Cold-start navigation failed:",
              navigationError
            );
          }
        }, 700);
      } catch (error) {
        console.error(
          "[NotificationBridge] Failed reading last notification:",
          error
        );
      }
    };

    handleColdStartNotification().catch((error) => {
      console.error(
        "[NotificationBridge] Cold-start handler failed:",
        error
      );
    });

    // ---------------------------------------------------------
    // App already running/backgrounded → notification tapped
    // ---------------------------------------------------------
    try {
      responseSubscription =
        Notifications.addNotificationResponseReceivedListener(
          (response) => {
            try {
              const data = response.notification.request.content
                .data as Record<string, any>;

              if (!data) {
                return;
              }

              navigateFromNotificationData(data, router);
            } catch (error) {
              console.error(
                "[NotificationBridge] Notification navigation failed:",
                error
              );
            }
          }
        );
    } catch (error) {
      console.error(
        "[NotificationBridge] Failed adding response listener:",
        error
      );
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
        console.error(
          "[NotificationBridge] Listener cleanup failed:",
          error
        );
      }
    };
  }, [router]);

  return null;
}
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true)
  const splashOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!fontsLoaded) return

    async function prepare() {
      await SplashScreen.hideAsync()

      const holdTimer = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }).start(() => setShowSplash(false))
      }, 1500)

      return () => clearTimeout(holdTimer)
    }

    prepare()
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: BRAND_PRIMARY }} />;
  }

  return (
    <AuthProvider>
      <NotificationBridge />

      <ThemeProvider>
        <ToastProvider>
          <OfflineScreen>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BRAND_PRIMARY } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(employee)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(task)/task-detail" />
              <Stack.Screen name="(task)/newtask" />
              <Stack.Screen name="(task)/extend-deadline" />
              <Stack.Screen name="reports/genExcel" />
              <Stack.Screen name="reports/genPdf" />
            </Stack>
          </OfflineScreen>
        </ToastProvider>

        {showSplash && (
          <Animated.View pointerEvents="none" style={[styles.splash, { opacity: splashOpacity }]}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={[typography.heading, styles.title]}>Kaarya Siddhi</Text>
            <Text style={[typography.heading, styles.subTitle]}>कार्य सिद्धि</Text>
            <View style={styles.footer}>
              <Text style={[typography.label, styles.credits]}>Developed By</Text>
              <Text style={[typography.heading3, styles.subCredits]}>DRM SUR, Central Railways</Text>
            </View>
          </Animated.View>
        )}
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BRAND_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: TEXT_PRIMARY, textShadowColor: BRAND_SHADOW,
    textShadowOffset: { width: 1, height: 1, },
    textShadowRadius: 0.1,
  },
  subTitle: {
    color: BRAND_ACCENT, textShadowColor: BRAND_SHADOW,
    textShadowOffset: { width: 1, height: 1, },
    textShadowRadius: 0.01,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  credits: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
  },
  subCredits: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    textAlign: 'center',
  },
});