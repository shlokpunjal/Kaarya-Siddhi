// app/notifications/admin-connection-review.tsx
//
// Focused review screen for a single connection request — opened when the
// admin taps a connection_request notification. Fetches current status on
// mount so re-opening an already-decided request shows the right state, and
// updates local state immediately after Accept/Reject so the UI reflects the
// decision without waiting on navigation or realtime.

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";
import { API_BASE_URL } from "../../constants/api";
import { useToast } from "../../context/ToastContext";

type Status = "pending" | "accepted" | "rejected";

const statusMeta = (colors: any, status: Status) => {
  if (status === "accepted")
    return { color: colors.status.completed, icon: "checkmark-circle" as const, label: "Accepted" };
  if (status === "rejected")
    return { color: colors.status.overdue, icon: "close-circle" as const, label: "Rejected" };
  return { color: colors.status.pending, icon: "time" as const, label: "Pending Review" };
};

export default function AdminConnectionReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { employeeEmail, adminEmail } = useLocalSearchParams<{
    employeeEmail: string;
    adminEmail: string;
  }>();
  const { showToast } = useToast();

  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<"accepted" | "rejected" | null>(null);

  const cardShadow = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    android: { elevation: 4 },
  });

  useEffect(() => {
    if (!employeeEmail || !adminEmail) return;
    (async () => {
      setLoading(true);

      const { data: userRow } = await supabase
        .from("users")
        .select("name")
        .eq("email", employeeEmail)
        .single();
      setEmployeeName(userRow?.name ?? null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/connection-status/${encodeURIComponent(employeeEmail)}/${encodeURIComponent(adminEmail)}`
        );
        const json = await res.json();
        if (json?.status === "accepted" || json?.status === "rejected") {
          setStatus(json.status);
        }
      } catch (err) {
        console.error("Failed to fetch connection status:", err);
      }

      setLoading(false);
    })();
  }, [employeeEmail, adminEmail]);

  const decide = async (decision: "accepted" | "rejected") => {
    setDeciding(decision);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const res = await fetch(`${API_BASE_URL}/connection-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employee_email: employeeEmail,
          admin_email: adminEmail,
          accept: decision === "accepted",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Could not update request.");

      // Reflect the decision immediately — don't wait on the list screen's
      // refetch or realtime round-trip.
      setStatus(decision);

      showToast("The employee will be notified.", "success");
      setTimeout(() => router.back(), 900);
    } catch (err: any) {
      showToast(err.message ?? "Could not update request", "error");
    } finally {
      setDeciding(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  const meta = statusMeta(colors, status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons onPress={() => router.back()} name="arrow-back" size={26} color={colors.brand.onPrimary} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary, marginLeft: 15 }}>
          Connection Request
        </Text>
      </View>

      <View style={{ padding: 20 }}>
        {/* ── Status hero ── */}
        <View
          style={{
            backgroundColor: meta.color + "18",
            borderRadius: 20,
            padding: 22,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: 64,
              width: 64,
              borderRadius: 32,
              backgroundColor: meta.color + "26",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name={meta.icon} size={34} color={meta.color} />
          </View>
          <Text style={{ ...typography.heading3, color: meta.color }}>{meta.label}</Text>
        </View>

        {/* ── Employee card ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 22,
            alignItems: "center",
            marginBottom: 24,
            ...cardShadow,
          }}
        >
          <View
            style={{
              height: 72,
              width: 72,
              borderRadius: 36,
              backgroundColor: colors.brand.accent + "22",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="person" size={36} color={colors.brand.accent} />
          </View>
          <Text style={{ ...typography.heading3, color: colors.text.primary, textAlign: "center" }}>
            {employeeName ?? employeeEmail}
          </Text>
          <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
            {status === "pending" ? "wants to connect with you" : "sent a connection request"}
          </Text>
        </View>

        {/* ── Accept / Reject — only while pending ── */}
        {status === "pending" && (
          <View style={{ flexDirection: "row", gap: 14 }}>
            <TouchableOpacity
              onPress={() => decide("accepted")}
              disabled={deciding !== null}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.status.completed,
                opacity: deciding !== null ? 0.7 : 1,
                ...cardShadow,
              }}
            >
              {deciding === "accepted" ? (
                <ActivityIndicator color={colors.base.surfaceL1} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.base.surfaceL1} />
                  <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => decide("rejected")}
              disabled={deciding !== null}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.status.overdue,
                opacity: deciding !== null ? 0.7 : 1,
                ...cardShadow,
              }}
            >
              {deciding === "rejected" ? (
                <ActivityIndicator color={colors.base.surfaceL1} />
              ) : (
                <>
                  <Ionicons name="close" size={20} color={colors.base.surfaceL1} />
                  <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}