import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { moderateScale } from "../../utils/responsive";
import type { Teammate } from "../../hooks/task/useTaskDetail";

type Props = {
  teammates: Teammate[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_review: "In Review",
  completed: "Completed",
};

const STATUS_COLOR_KEY: Record<string, "pending" | "inReview" | "completed"> = {
  pending: "pending",
  in_review: "inReview",
  completed: "completed",
};

/**
 * Shown on a task's detail screen when it was created via "Team" assign
 * mode (see useTaskForm's isTeamCreate branch) — this task is one of
 * several identical copies fanned out to a group of employees, all
 * sharing a team_batch_id. Lets each person see who else has the same
 * task and how far along they are on their own copy.
 */
export function TeammatesList({ teammates }: Props) {
  const { colors } = useTheme();

  if (teammates.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 }}>
        <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
        <Text style={{ ...typography.heading3, color: colors.text.primary }}>
          Team ({teammates.length + 1})
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.base.surfaceL2,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.base.border,
          overflow: "hidden",
        }}
      >
        {teammates.map((mate, index) => {
          const colorKey = STATUS_COLOR_KEY[mate.status ?? ""] ?? null;
          const statusColor = colorKey ? colors.status[colorKey] : colors.text.secondary;
          const statusLabel = STATUS_LABEL[mate.status ?? ""] ?? "Pending";

          return (
            <View
              key={mate.task_id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.base.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Ionicons name="person-circle-outline" size={20} color={colors.text.secondary} />
                <Text
                  style={{ ...typography.body, color: colors.text.primary, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {mate.name}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="ellipse" size={8} color={statusColor} />
                <Text
                  style={{
                    ...typography.label,
                    color: statusColor,
                    fontSize: moderateScale(12),
                  }}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}