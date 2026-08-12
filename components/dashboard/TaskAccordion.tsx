import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { Task } from "../../types/task";
import { hp, wp, moderateScale } from "../../utils/responsive";

type TaskAccordionProps = {
  label: string;
  color: string;
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  taskDetailRoute: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyMessage: string;
  isFirst?: boolean;
};

export default function TaskAccordion({
  label,
  color,
  tasks,
  expanded,
  onToggle,
  taskDetailRoute,
  emptyIcon,
  emptyMessage,
  isFirst = false,
}: TaskAccordionProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: wp(8.8),
        marginTop: isFirst ? hp(3.7) : hp(2.5),
        borderColor: colors.base.border,
        borderWidth: 1,
        borderRadius: 19,
        backgroundColor: colors.base.surfaceL1,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={{
          height: moderateScale(60),
          borderRadius: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ ...typography.subheading, color }}>{label}</Text>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={30}
          color={colors.base.surfaceL1}
          style={{ backgroundColor: color, borderRadius: 10, padding: 2 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ borderRadius: 15, marginTop: 5 }}>
          {tasks.length === 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 20,
                marginHorizontal: 10,
                marginBottom: 10,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: colors.base.border,
                backgroundColor: colors.base.surfaceL2,
              }}
            >
              <Ionicons name={emptyIcon} size={22} color={color} style={{ opacity: 0.6, marginRight: 8 }} />
              <Text style={{ ...typography.body, color: colors.text.secondary }}>{emptyMessage}</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => router.push({ pathname: taskDetailRoute, params: { taskId: task.id } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.base.surfaceL2,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  gap: 12,
                  borderColor: colors.base.border,
                  borderWidth: 1,
                  margin: 10,
                }}
              >
                <View
                  style={{
                    height: moderateScale(24),
                    width: moderateScale(24),
                    borderRadius: moderateScale(12),
                    borderWidth: 2,
                    borderColor: color,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      height: moderateScale(12),
                      width: moderateScale(12),
                      borderRadius: moderateScale(6),
                      backgroundColor: color,
                    }}
                  />
                </View>
                <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}