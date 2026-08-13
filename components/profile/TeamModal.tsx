import { Modal, View, Text, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { profileStyles } from "../../styles/profileStyles";

export type ManagedEmployee = {
  email: string;
  name: string;
  designation?: string | null;
  profile_pic_url?: string | null;
};

type ThemeColors = any;

type Props = {
  visible: boolean;
  colors: ThemeColors;
  employees: ManagedEmployee[];
  loading: boolean;
  onClose: () => void;
  onPressEmployee: (employee: ManagedEmployee) => void;
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamModal({
  visible,
  colors,
  employees,
  loading,
  onClose,
  onPressEmployee,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={profileStyles.teamModalOverlay} onPress={onClose}>
        <Pressable
          style={[
            profileStyles.teamModalCard,
            { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={profileStyles.teamModalHeaderRow}>
            <Text style={[typography.subheading, { color: colors.text.primary }]}>Team</Text>
            <Pressable
              style={[profileStyles.teamModalCloseButton, { backgroundColor: colors.base.surfaceL2 }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.brand.accent} />
            </View>
          ) : employees.length === 0 ? (
            <Text style={[typography.body, { color: colors.text.secondary, paddingVertical: 12 }]}>
              No connected employees yet.
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={profileStyles.employeeGrid}>
                {employees.map((emp) => (
                  <Pressable
                    key={emp.email}
                    onPress={() => onPressEmployee(emp)}
                    style={({ pressed }) => [
                      profileStyles.employeeCard,
                      {
                        backgroundColor: colors.base.surfaceL2,
                        borderColor: colors.base.border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    {emp.profile_pic_url ? (
                      <Image source={{ uri: emp.profile_pic_url }} style={profileStyles.employeeAvatar} />
                    ) : (
                      <View
                        style={[
                          profileStyles.employeeAvatar,
                          profileStyles.employeeAvatarFallback,
                          { backgroundColor: colors.brand.accent },
                        ]}
                      >
                        <Text style={[typography.label, { color: "#FFFFFF" }]}>{initialsFor(emp.name)}</Text>
                      </View>
                    )}

                    <Text
                      style={[typography.body, profileStyles.employeeName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {emp.name}
                    </Text>
                    <Text
                      style={[typography.label, profileStyles.employeeDesignation, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {emp.designation || "—"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}