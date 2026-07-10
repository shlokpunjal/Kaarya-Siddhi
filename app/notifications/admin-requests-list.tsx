// app/notifications/admin-requests-list.tsx
//
// Bottom sheet opened from the "Requests" box on app/notifications/admin.tsx.
// Two sections:
//   1. Connection Requests — from `connections` table, scoped to this admin's
//      own email (admin_email). Accept/Reject happens inline on the card.
//      Has its own "Clear All" (clears only accepted/rejected connections).
//   2. Extend Deadline Requests — from `extension_requests`, scoped to this
//      admin's workspace_id. Tapping a card opens admin-request-review.tsx.
//      Has its own "Clear All" (clears only accepted/rejected extensions).

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { API_BASE_URL } from "../../constants/api";
import * as SecureStore from "expo-secure-store";

type ConnectionRow = {
  id: string;
  employee_email: string;
  employee_name?: string;
  admin_email: string;
  status: string;
  created_at: string;
};

type ExtensionRequestRow = {
  id: string;
  task_id: string;
  requested_by: string;
  current_deadline: string;
  requested_deadline: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  admin_note: string | null;
  created_at: string;
  tasks: { title: string; priority: "low" | "medium" | "high" } | null;
};

const statusColor = (colors: any, status: string) => {
  if (status === "accepted") return colors.status.completed;
  if (status === "rejected") return colors.status.overdue;
  return colors.status.pending;
};

const priorityColor = (colors: any, priority?: string) => {
  if (priority === "high") return colors.status.overdue;
  if (priority === "medium") return colors.status.pending;
  return colors.status.completed;
};

const isDecided = (status: string) => status === "accepted" || status === "rejected";

const clearedKey = (wsId: string) => `adminRequestsCleared_${wsId}`;

export default function AdminRequestsList() {
  const { colors } = useTheme();
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingConnectionId, setDecidingConnectionId] = useState<string | null>(null);

  const connectionsChannelRef = useRef<RealtimeChannel | null>(null);
  const extensionChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    (async () => {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("users").select("workspace_id").eq("email", email).single();
      if (error || !data) {
        console.error("Could not resolve workspace for email:", email);
        setLoading(false);
        return;
      }
      setAdminEmail(email);
      setWorkspaceId(data.workspace_id);
    })();
  }, []);

  const fetchConnections = useCallback(async (email: string): Promise<ConnectionRow[]> => {
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .eq("admin_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching connection requests:", error.message);
      return [];
    }

    const rows = (data as ConnectionRow[]) ?? [];
    const emails = rows.map((r) => r.employee_email);
    let namesByEmail: Record<string, string> = {};

    if (emails.length > 0) {
      const { data: userRows, error: userErr } = await supabase
        .from("users")
        .select("email, name")
        .in("email", emails);
      if (userErr) {
        console.error("Error fetching employee names:", userErr.message);
      } else {
        namesByEmail = Object.fromEntries((userRows ?? []).map((u: any) => [u.email, u.name]));
      }
    }

    return rows.map((r) => ({ ...r, employee_name: namesByEmail[r.employee_email] ?? r.employee_email }));
  }, []);

  const fetchExtensionRequests = useCallback(async (wsId: string): Promise<ExtensionRequestRow[]> => {
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority)")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching extension requests:", error.message);
      return [];
    }
    return (data as ExtensionRequestRow[]) ?? [];
  }, []);

  const fetchAll = useCallback(async () => {
    if (!adminEmail || !workspaceId) return;
    setLoading(true);

    const [conns, exts] = await Promise.all([fetchConnections(adminEmail), fetchExtensionRequests(workspaceId)]);

    const raw = await AsyncStorage.getItem(clearedKey(workspaceId));
    const cleared = raw ? JSON.parse(raw) : { connections: [], extensions: [] };

    setConnections(conns.filter((c) => !cleared.connections.includes(c.employee_email)));
    setExtensionRequests(exts.filter((r) => !cleared.extensions.includes(r.id)));
    setLoading(false);
  }, [adminEmail, workspaceId, fetchConnections, fetchExtensionRequests]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  useEffect(() => {
    if (!adminEmail) return;
    const channel = supabase
      .channel(`connections_admin_${adminEmail}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections", filter: `admin_email=eq.${adminEmail}` },
        () => fetchAll()
      )
      .subscribe();
    connectionsChannelRef.current = channel;
    return () => {
      if (connectionsChannelRef.current) {
        supabase.removeChannel(connectionsChannelRef.current);
        connectionsChannelRef.current = null;
      }
    };
  }, [adminEmail, fetchAll]);

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`extension_requests_admin_${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extension_requests", filter: `workspace_id=eq.${workspaceId}` },
        () => fetchAll()
      )
      .subscribe();
    extensionChannelRef.current = channel;
    return () => {
      if (extensionChannelRef.current) {
        supabase.removeChannel(extensionChannelRef.current);
        extensionChannelRef.current = null;
      }
    };
  }, [workspaceId, fetchAll]);

// ... inside the component, replace decideConnection:

const decideConnection = async (employeeEmail: string, decision: "accepted" | "rejected") => {
  if (!adminEmail) return;
  setDecidingConnectionId(employeeEmail);
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const res = await fetch(`${API_BASE_URL}/connection-respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ employee_email: employeeEmail, admin_email: adminEmail, accept: decision === "accepted" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Could not update request.");
  } catch (err: any) {
    Alert.alert("Could not update", err.message ?? "Something went wrong.");
  } finally {
    setDecidingConnectionId(null);
  }
};

  const clearAllConnections = async () => {
    if (!workspaceId) return;

    const decidedConnectionKeys = connections.filter((c) => isDecided(c.status)).map((c) => c.employee_email);

    const raw = await AsyncStorage.getItem(clearedKey(workspaceId));
    const existing = raw ? JSON.parse(raw) : { connections: [], extensions: [] };
    const updated = {
      ...existing,
      connections: Array.from(new Set([...existing.connections, ...decidedConnectionKeys])),
    };
    await AsyncStorage.setItem(clearedKey(workspaceId), JSON.stringify(updated));

    setConnections((prev) => prev.filter((c) => !isDecided(c.status)));
  };

  const clearAllExtensions = async () => {
    if (!workspaceId) return;

    const decidedExtensionIds = extensionRequests.filter((r) => isDecided(r.status)).map((r) => r.id);

    const raw = await AsyncStorage.getItem(clearedKey(workspaceId));
    const existing = raw ? JSON.parse(raw) : { connections: [], extensions: [] };
    const updated = {
      ...existing,
      extensions: Array.from(new Set([...existing.extensions, ...decidedExtensionIds])),
    };
    await AsyncStorage.setItem(clearedKey(workspaceId), JSON.stringify(updated));

    setExtensionRequests((prev) => prev.filter((r) => !isDecided(r.status)));
  };

  const hasDecidedConnections = connections.some((c) => isDecided(c.status));
  const hasDecidedExtensions = extensionRequests.some((r) => isDecided(r.status));

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.base.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}
    >
      <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.base.border }} />
      </View>

      {/* Header — just title + close, no badges or clear-all here */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
          <Text style={{ ...typography.heading, color: colors.text.primary }}>Requests</Text>
        </View>
        <Ionicons onPress={() => router.back()} name="close" size={24} color={colors.text.secondary} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
          {/* ---------- Connection Requests ---------- */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
              <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Connection Requests</Text>
            </View>
            {hasDecidedConnections && (
              <TouchableOpacity onPress={clearAllConnections}>
                <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {connections.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 24 }}>
              No connection requests yet.
            </Text>
          )}

          {connections.map((c) => (
            <View
              key={c.employee_email}
              style={{ backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.text.secondary} />
                  <Text style={{ ...typography.heading3, color: colors.text.primary, flexShrink: 1 }} numberOfLines={1}>
                    {c.employee_name ?? c.employee_email}
                  </Text>
                </View>

                <View style={{ backgroundColor: statusColor(colors, c.status) + "22", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ ...typography.label, color: statusColor(colors, c.status), textTransform: "capitalize" }}>
                    {c.status}
                  </Text>
                </View>
              </View>

              {c.status === "pending" && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => decideConnection(c.employee_email, "accepted")}
                    disabled={decidingConnectionId === c.employee_email}
                    style={{ flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.status.completed, opacity: decidingConnectionId === c.employee_email ? 0.7 : 1 }}
                  >
                    <Text style={{ ...typography.label, color: colors.base.surfaceL1 }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => decideConnection(c.employee_email, "rejected")}
                    disabled={decidingConnectionId === c.employee_email}
                    style={{ flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.status.overdue, opacity: decidingConnectionId === c.employee_email ? 0.7 : 1 }}
                  >
                    <Text style={{ ...typography.label, color: colors.base.surfaceL1 }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* ---------- Extend Deadline Requests ---------- */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="document-text-outline" size={16} color={colors.text.secondary} />
              <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Extend Deadline Requests</Text>
            </View>
            {hasDecidedExtensions && (
              <TouchableOpacity onPress={clearAllExtensions}>
                <Text style={{ ...typography.label, color: colors.brand.accent }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {extensionRequests.length === 0 && (
            <Text style={{ ...typography.body, color: colors.text.secondary }}>No extension requests yet.</Text>
          )}

          {extensionRequests.map((req) => (
            <TouchableOpacity
              key={req.id}
              onPress={() => router.push({ pathname: "/notifications/admin-request-review", params: { requestId: req.id } })}
              style={{ backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: priorityColor(colors, req.tasks?.priority) }} />
                  <Text style={{ ...typography.heading3, color: colors.text.primary, flexShrink: 1 }} numberOfLines={1}>
                    {req.tasks?.title ?? "Untitled Task"}
                  </Text>
                </View>

                <View style={{ backgroundColor: statusColor(colors, req.status) + "22", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ ...typography.label, color: statusColor(colors, req.status), textTransform: "capitalize" }}>
                    {req.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}