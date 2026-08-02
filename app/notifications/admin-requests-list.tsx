import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  BackHandler,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { wp, moderateScale } from "../../utils/responsive";
import AdminRequestsListSkeleton from "../../components/skeletonScreens/AdminRequestListSkeleton";
import { authFetch } from "../../utils/authFetch";
import { subscribeToTableChanges } from "../../services/realtimeService";

type ConnectionNotif = {
  id: string;
  created_at: string;
  metadata: { employee_email: string; admin_email: string };
  employee_name?: string;
};

type ExtensionRow = {
  id: string;
  task_id: string;
  reason: string;
  requested_deadline: string;
  created_at: string;
  tasks: { title: string; priority: "low" | "medium" | "high" } | null;
};

const priorityColor = (colors: any, priority?: string) => {
  if (priority === "high") return colors.status.overdue;
  if (priority === "medium") return colors.status.pending;
  return colors.status.completed;
};

export default function AdminRequestsList() {
  const { colors } = useTheme();
  const router = useRouter();

  const screenHeight = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => router.back());
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeSheet();
      return true;
    });
    return () => sub.remove();
  }, []);

  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [connectionNotifs, setConnectionNotifs] = useState<ConnectionNotif[]>(
    [],
  );
  const [extensionRows, setExtensionRows] = useState<ExtensionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const extensionChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authFetch("/me");
      if (res.ok) {
        const data = await res.json();
        setAdminUserId(data.id);
        setWorkspaceId(data.workspace_id);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const fetchConnections = useCallback(async () => {
    if (!adminUserId) return;
    const res = await authFetch("/connection-requests");
    if (!res.ok) return;
    const data = await res.json();
    setConnectionNotifs(data ?? []);
  }, [adminUserId]);

  const fetchExtensions = useCallback(async () => {
    if (!workspaceId) return;
    const res = await authFetch("/extension-requests-list");
    if (!res.ok) {
      console.error("Error fetching extension requests:", res.status);
      return;
    }
    const data = await res.json();
    setExtensionRows(data ?? []);
  }, [workspaceId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchConnections(), fetchExtensions()]);
    setLoading(false);
  }, [fetchConnections, fetchExtensions]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  // Realtime — connection requests (via notifications, scoped to this admin).
  useEffect(() => {
    if (!adminUserId) return;
    const channel = subscribeToTableChanges(
      `admin_requests_notifs_${adminUserId}`,
      "notifications",
      `user_id=eq.${adminUserId}`,
      () => fetchConnections(),
    );
    notifChannelRef.current = channel;
    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [adminUserId, fetchConnections]);

  // Realtime — extension requests (direct table, scoped to workspace).
  useEffect(() => {
    if (!workspaceId) return;
    const channel = subscribeToTableChanges(
      `admin_extension_requests_${workspaceId}`,
      "extension_requests",
      `workspace_id=eq.${workspaceId}`,
      () => fetchExtensions(),
    );
    extensionChannelRef.current = channel;
    return () => {
      if (extensionChannelRef.current) {
        supabase.removeChannel(extensionChannelRef.current);
        extensionChannelRef.current = null;
      }
    };
  }, [workspaceId, fetchExtensions]);

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "#000",
          opacity: backdropOpacity,
        }}
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />

      <Animated.View style={{ height: "100%", transform: [{ translateY }] }}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.base.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          }}
        >
          <View
            style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.base.border,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: wp(5.3),
              paddingBottom: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.text.secondary}
              />
              <Text
                style={{ ...typography.heading, color: colors.text.primary }}
              >
                Requests
              </Text>
            </View>
            <Ionicons
              onPress={closeSheet}
              name="close"
              size={24}
              color={colors.text.secondary}
            />
          </View>

          {loading ? (
            <AdminRequestsListSkeleton />
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: wp(5.3), paddingTop: 4 }}
            >
              {/* ---------- Connection Requests ---------- */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={colors.text.secondary}
                />
                <Text
                  style={{
                    ...typography.heading3,
                    color: colors.text.secondary,
                  }}
                >
                  Connection Requests
                </Text>
              </View>

              {connectionNotifs.length === 0 && (
                <Text
                  style={{
                    ...typography.body,
                    color: colors.text.secondary,
                    marginBottom: 24,
                  }}
                >
                  No connection requests yet.
                </Text>
              )}

              {connectionNotifs.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  onPress={() =>
                    router.push({
                      pathname: "/notifications/admin-connection-review",
                      params: {
                        employeeEmail: n.metadata.employee_email,
                        adminEmail: n.metadata.admin_email,
                      },
                    })
                  }
                  style={{
                    backgroundColor: colors.base.surfaceL1,
                    borderColor: colors.brand.accent + "55",
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      height: moderateScale(44),
                      width: moderateScale(44),
                      borderRadius: moderateScale(22),
                      backgroundColor: colors.status.pending + "1E",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={colors.status.pending}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {n.employee_name ?? n.metadata.employee_email}
                    </Text>
                    <Text
                      style={{
                        ...typography.label,
                        color: colors.status.pending,
                        marginTop: 2,
                      }}
                    >
                      Wants to connect · Tap to review
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              ))}

              {/* ---------- Extend Deadline Requests ---------- */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.text.secondary}
                />
                <Text
                  style={{
                    ...typography.heading3,
                    color: colors.text.secondary,
                  }}
                >
                  Extend Deadline Requests
                </Text>
              </View>

              {extensionRows.length === 0 && (
                <Text
                  style={{ ...typography.body, color: colors.text.secondary }}
                >
                  No extension requests yet.
                </Text>
              )}

              {extensionRows.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() =>
                    router.push({
                      pathname: "/notifications/admin-request-review",
                      params: { requestId: r.id },
                    })
                  }
                  style={{
                    backgroundColor: colors.base.surfaceL1,
                    borderColor: colors.base.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        width: 8,
                        borderRadius: 4,
                        backgroundColor: priorityColor(
                          colors,
                          r.tasks?.priority,
                        ),
                      }}
                    />
                    <Text
                      style={{
                        ...typography.heading3,
                        color: colors.text.primary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {r.tasks?.title ?? "Untitled Task"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...typography.label,
                      color: colors.status.pending,
                      marginTop: 6,
                    }}
                    numberOfLines={2}
                  >
                    {r.reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}