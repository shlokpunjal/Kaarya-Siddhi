import { useState } from "react";
import { Text, TouchableOpacity, View, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { wp } from "../../utils/responsive";
import { DetailRow } from "./DetailRow";

// ─────────────────────────────────────────────────────────────────────────
// Team status — SHARED between the admin and employee task-detail screens.
// Keeping this in one place means "what counts as In Review" can never
// drift between the two screens the way it would if each screen had its
// own copy of this logic.
// ─────────────────────────────────────────────────────────────────────────

export type TeamMemberStatus = "overdue" | "pending" | "inReview" | "completed";

export const STATUS_BAR_COLORS: Record<TeamMemberStatus, string> = {
  overdue: "#E53935",
  pending: "#F57C00",
  inReview: "#1E5FD9",
  completed: "#2E9B4F",
};

export const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  overdue: "Overdue",
  pending: "Pending",
  inReview: "In Review",
  completed: "Completed",
};

/**
 * Normalizes a raw status value into one of the four known statuses.
 *
 * IMPORTANT: the backend's raw DB value is snake_case ("in_review"), not
 * the camelCase "inReview" used for display/color lookups. Both forms are
 * accepted here so a teammate who asked for review is never silently
 * mislabeled as "Pending" just because of casing.
 */
export function normalizeMemberStatus(status: string | null | undefined): TeamMemberStatus {
  if (status === "completed") return "completed";
  if (status === "inReview" || status === "in_review") return "inReview";
  if (status === "overdue") return "overdue";
  return "pending";
}

/**
 * Team-level status is DERIVED from each member's individual status —
 * it is never set directly:
 *   - stays "pending" as long as even one teammate hasn't requested review
 *   - becomes "inReview" only once EVERY teammate is inReview/completed
 *   - becomes "completed" only once EVERY teammate is completed
 */
export function computeTeamStatus(
  teammates: { status?: string | null }[] | undefined | null,
): TeamMemberStatus {
  if (!teammates || teammates.length === 0) return "pending";

  const normalized = teammates.map((t) => normalizeMemberStatus(t.status));

  if (normalized.every((s) => s === "completed")) return "completed";
  if (normalized.every((s) => s === "inReview" || s === "completed")) return "inReview";
  return "pending";
}

// First letter of the first two words, uppercase — matches the avatar
// style already used in the app's Team modal on the Profile screen.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type TeamAssignedCardMember = {
  id?: string;
  name: string;
  status?: string | null;
};

/**
 * "Assigned To" / "Team" row. Tapping it opens a centered popup (matching
 * the app's existing Suggest Changes / AlertModal dialog style) listing
 * each teammate's avatar, name, and individual status.
 *
 * Used on BOTH the admin task-detail screen and the employee task-detail
 * screen, so a status change made by either side is guaranteed to render
 * identically wherever it's shown.
 */
export function TeamAssignedCard({
  teammates,
  colors,
  label = "Assigned To",
}: {
  teammates: TeamAssignedCardMember[] | undefined | null;
  colors: any;
  label?: string;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  if (!teammates || teammates.length === 0) {
    return <DetailRow icon="person-outline" label={label} value="—" />;
  }

  const memberCount = teammates.length;
  const summary = `${memberCount} ${memberCount === 1 ? "employee" : "employees"} assigned`;

  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.base.surfaceL2,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.base.border,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
          <Ionicons name="people-outline" size={18} color={colors.text.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.label, color: colors.text.secondary }}>{label}</Text>
            <Text style={{ ...typography.body, color: colors.text.primary }} numberOfLines={1}>
              {summary}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: wp(6.4),
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.base.border,
              paddingTop: 20,
              paddingHorizontal: 20,
              paddingBottom: 20,
              maxHeight: "75%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ ...typography.heading3, color: colors.text.primary }}>Team</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.base.surfaceL2,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {teammates.map((member, idx) => {
                const memberStatus: TeamMemberStatus = normalizeMemberStatus(member.status);
                return (
                  <View key={member.id ?? idx}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: colors.brand.accent,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>
                          {getInitials(member.name)}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.body, color: colors.text.primary }}>
                          {member.name}
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}
                        >
                          <Ionicons
                            name="ellipse"
                            size={7}
                            color={STATUS_BAR_COLORS[memberStatus]}
                          />
                          <Text
                            style={{ ...typography.label, color: STATUS_BAR_COLORS[memberStatus] }}
                          >
                            {STATUS_LABELS[memberStatus]}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {idx < teammates.length - 1 && (
                      <View style={{ height: 1, backgroundColor: colors.base.border }} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}