import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import AdminConnectionReviewSkeleton from "../../components/skeletonScreens/Admin/AdminConnectionReviewSkeleton";
import { authFetch } from "../../utils/authFetch";
import ScreenHeader from "../../components/notifications/ScreenHeader";
import StatusHero from "../../components/notifications/StatusHero";
import DecisionButtons from "../../components/notifications/DecisionButtons";
import { cardShadow } from "../../utils/notifications/cardShadow";
import type { RequestStatus } from "../../utils/notifications/notificationMeta";

export default function AdminConnectionReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { employeeEmail, adminEmail } = useLocalSearchParams<{
    employeeEmail: string;
    adminEmail: string;
  }>();
  const { showToast } = useToast();

  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [status, setStatus] = useState<RequestStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!employeeEmail || !adminEmail) return;
    (async () => {
      setLoading(true);

      const nameRes = await authFetch(`/user-name?email=${encodeURIComponent(employeeEmail)}`);
      const nameData = nameRes.ok ? await nameRes.json() : { name: null };
      setEmployeeName(nameData.name);

      try {
        const res = await authFetch(
          `/connection-status/${encodeURIComponent(employeeEmail)}/${encodeURIComponent(adminEmail)}`,
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
      const res = await authFetch("/connection-respond", {
        method: "POST",
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
    return <AdminConnectionReviewSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader title="Connection Request" />

      <View style={{ padding: wp(5.3) }}>
        <StatusHero status={status} />

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
              height: moderateScale(72),
              width: moderateScale(72),
              borderRadius: moderateScale(36),
              backgroundColor: colors.brand.accent + "22",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="person" size={moderateScale(36)} color={colors.brand.accent} />
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
          <DecisionButtons
            busy={deciding}
            onAccept={() => decide("accepted")}
            onReject={() => decide("rejected")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}