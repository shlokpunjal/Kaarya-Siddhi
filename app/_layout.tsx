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



enableScreens(false);
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
    default: return "Notification";
  }
}

// Rendered INSIDE <AuthProvider>, so useAuth() is valid here. Owns both the
// realtime "show a local notification when a row lands" watcher and the
// tap-to-navigate listener for actual pushes (once those work on a dev build).
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
      router.push({
        pathname: "/(task)/task-detail",
        params: { taskId: data.taskId },
      });
      break;
  }
}

function NotificationBridge() {
  const router = useRouter();
  const { userEmail } = useAuth();

  useEffect(() => {
    if (!userEmail) return;

    let notifChannel: any;
    let extensionChannel: any;

    (async () => {
      const { data: userRow } = await supabase
        .from("users")
        .select("id, workspace_id, role")
        .eq("email", userEmail)
        .single();
      if (!userRow) return;

      // Register this device for real push notifications and save the
      // token to users.expo_push_token — without this, admins/employees
      // never receive anything in the OS notification tray, only the
      // in-app list and the local-notification fallback below.
      registerAndSavePushToken().catch((err) =>
        console.log("Push token registration failed:", err)
      );

      //inserts the notification to notification table
      notifChannel = supabase
        .channel(`global_notifs_${userRow.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userRow.id}` },
          (payload) => {
            sendLocalNotification(notifTitle(payload.new.type), payload.new.message);
          }
        )
        .subscribe();

      if (userRow.role === "admin" && userRow.workspace_id) {
        extensionChannel = supabase
          .channel(`global_extensions_${userRow.workspace_id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "extension_requests", filter: `workspace_id=eq.${userRow.workspace_id}` },
            () => {
              sendLocalNotification("New Extension Request", "A deadline extension was requested.");
            }
          )
          .subscribe();
      }
    })();

    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (extensionChannel) supabase.removeChannel(extensionChannel);
    };
  }, [userEmail]);

  useEffect(() => {
    // App was fully killed and got launched BY tapping the notification —
    // addNotificationResponseReceivedListener below won't have been
    // registered in time to catch that original tap, so check for it
    // separately on mount.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, any>;
      // Router may not be mounted yet this early in a cold start — the
      // splash screen already holds for ~1.5s, so a short delay here is
      // safe and avoids a router.push that silently no-ops.
      setTimeout(() => navigateFromNotificationData(data, router), 700);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      navigateFromNotificationData(data, router);
    });

    return () => sub.remove();
  }, []);

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