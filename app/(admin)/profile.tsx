import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { typography } from "../../theme/theme";
import { useTheme, useThemeMode } from "../../context/ThemeContext";
import { router } from "expo-router";
import { authFetch } from "../../utils/authFetch";
import AdminProfileSkeleton from "../../components/skeletonScreens/Admin/AdminProfileSkeleton";
import { useToast } from "../../context/ToastContext";
import { useCurrentUser } from "../../hooks/profile/useCurrentUser";
import { useAvatarUpload } from "../../hooks/profile/useAvatarUpload";
import { profileStyles } from "../../styles/profileStyles";
import ProfileAvatar from "../../components/profile/ProfileAvatar";
import ProfileFieldsCard, { ProfileField } from "../../components/profile/ProfileFieldsCard";
import AppearanceCard from "../../components/profile/AppearanceCard";
import AccountModals from "../../components/profile/AccountModals";
import AvatarPreviewModal from "../../components/profile/AvatarPreviewModal";
import TeamModal, { ManagedEmployee } from "../../components/profile/TeamModal";

export default function AdminProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");

  const [showImage, setShowImage] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [managedEmployees, setManagedEmployees] = useState<ManagedEmployee[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamModalVisible, setTeamModalVisible] = useState(false);

  const { currentUser, setCurrentUser, loading, fetchCurrentUser } =
    useCurrentUser((msg) => showToast(msg, "error"));

  const { avatarUri, uploading, pickAvatar } = useAvatarUpload(
    currentUser?.id,
    currentUser?.profile_pic_url ?? null,
    (url) => setCurrentUser((prev) => (prev ? { ...prev, profile_pic_url: url } : prev)),
    (msg) => showToast(msg, "error"),
  );

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await authFetch("/team");
      if (!res.ok) {
        showToast("Could not load your team. Please try again.", "error");
        return;
      }
      setManagedEmployees(await res.json());
    } catch (error: any) {
      console.error("Team fetch error:", error?.message ?? error);
      showToast("Could not load your team. Please try again.", "error");
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? "");
    setContact(currentUser.mobile_number ?? "");
    setEmail(currentUser.email ?? "");
    setDesignation(currentUser.designation ?? "");
    setDepartment(currentUser.department ?? "");
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
    fetchTeam();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCurrentUser(), fetchTeam()]);
    setRefreshing(false);
  }, []);

  const handleSave = async () => {
    if (!currentUser) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      const res = await authFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          mobile_number: contact.trim(),
          designation: designation.trim(),
          department: department.trim(),
        }),
      });
      if (!res.ok) throw new Error("Could not save changes");

      const updated = await res.json();
      setCurrentUser(updated);
      setName(updated.name);
      setContact(updated.mobile_number ?? "");
      setDesignation(updated.designation ?? "");
      setDepartment(updated.department ?? "");
      setEditing(false);
      showToast("Profile updated", "success");
    } catch (error: any) {
      showToast(error?.message || "Could not save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  async function deleteAccount() {
    const res = await authFetch("/delete-account", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete account");
  }

  const initials = (name || currentUser?.name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) return <AdminProfileSkeleton />;

  if (!currentUser) {
    return (
      <SafeAreaView
        style={[
          profileStyles.safeArea,
          {
            backgroundColor: colors.base.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          },
        ]}
      >
        <Text style={[typography.body, { color: colors.text.primary }]}>Could not load your profile.</Text>
        <Pressable
          style={[profileStyles.editPill, { borderColor: colors.brand.accent }]}
          onPress={fetchCurrentUser}
        >
          <Text style={[typography.label, { color: colors.brand.accent }]}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const fields: ProfileField[] = [
    { key: "email", label: "Email id", value: email },
    { key: "contact", label: "Contact", value: contact, editable: true, onChange: setContact },
    { key: "department", label: "Department", value: department, editable: true, onChange: setDepartment },
  ];

  return (
    <SafeAreaView style={[profileStyles.safeArea, { backgroundColor: colors.base.background }]}>
      <ScrollView
        contentContainerStyle={profileStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={editing ? undefined : onRefresh}
            enabled={!editing}
            tintColor={colors.brand.accent}
            colors={[colors.brand.accent]}
          />
        }
      >
        <View style={profileStyles.headerRow}>
          <Text style={[typography.heading, { color: colors.text.primary }]}>Profile</Text>
          <View
            style={[
              profileStyles.roleBadge,
              { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border },
            ]}
          >
            <Text style={[typography.label, { color: colors.brand.accent }]}>Admin</Text>
          </View>
        </View>

        <View
          style={[profileStyles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
        >
          <View style={profileStyles.cardTopRow}>
            <Pressable
              style={[
                profileStyles.editPill,
                {
                  borderColor: colors.brand.accent,
                  backgroundColor: editing ? colors.brand.accent : "transparent",
                },
              ]}
              onPress={editing ? handleSave : () => setEditing(true)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={editing ? "#FFFFFF" : colors.brand.accent} />
              ) : (
                <>
                  <Ionicons
                    name={editing ? "checkmark" : "pencil"}
                    size={13}
                    color={editing ? "#FFFFFF" : colors.brand.accent}
                  />
                  <Text
                    style={[
                      typography.label,
                      { color: editing ? "#FFFFFF" : colors.brand.accent, marginLeft: 4 },
                    ]}
                  >
                    {editing ? "Save" : "Edit Profile"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <ProfileAvatar
            colors={colors}
            avatarUri={avatarUri}
            uploading={uploading}
            editing={editing}
            initials={initials}
            name={name}
            designation={designation}
            onChangeName={setName}
            onChangeDesignation={setDesignation}
            onPickAvatar={pickAvatar}
            onPressAvatar={() => avatarUri && setShowImage(true)}
          />

          <ProfileFieldsCard colors={colors} editing={editing} fields={fields} />
        </View>

        <View
          style={[profileStyles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
        >
          <View style={profileStyles.teamHeaderRow}>
            <Text style={[typography.subheading, { color: colors.text.primary }]}>Team</Text>
            <View style={profileStyles.teamHeaderRight}>
              <View style={[profileStyles.countChip, { backgroundColor: colors.base.surfaceL2 }]}>
                {loadingTeam ? (
                  <ActivityIndicator size="small" color={colors.text.secondary} />
                ) : (
                  <Text style={[typography.label, { color: colors.text.secondary }]}>
                    {managedEmployees.length} {managedEmployees.length === 1 ? "employee" : "employees"}
                  </Text>
                )}
              </View>
              <Pressable
                style={[profileStyles.teamArrowButton, { backgroundColor: colors.base.surfaceL2 }]}
                onPress={() => setTeamModalVisible(true)}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <AppearanceCard colors={colors} mode={mode} setMode={setMode} />

        <Pressable
          style={[profileStyles.logoutRow, { backgroundColor: colors.brand.primary }]}
          onPress={() => setLogoutVisible(true)}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={[typography.heading3, { color: "#ffffff", marginLeft: 8 }]}>Log Out</Text>
        </Pressable>

        <Pressable style={profileStyles.deleteRow} onPress={() => setDeleteVisible(true)}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={[typography.heading3, { color: "#FFFFFF", marginLeft: 8 }]}>Delete Account</Text>
        </Pressable>
      </ScrollView>

      <AvatarPreviewModal visible={showImage} avatarUri={avatarUri} onClose={() => setShowImage(false)} />

      <TeamModal
        visible={teamModalVisible}
        colors={colors}
        employees={managedEmployees}
        loading={loadingTeam}
        onClose={() => setTeamModalVisible(false)}
        onPressEmployee={(emp) => {
          setTeamModalVisible(false);
          router.push({
            pathname: "/(task)/employee-tasks",
            params: { employeeEmail: emp.email, employeeName: emp.name },
          });
        }}
      />

      <AccountModals
        logoutVisible={logoutVisible}
        onCancelLogout={() => setLogoutVisible(false)}
        onConfirmLogout={() => {
          setLogoutVisible(false);
          logout();
        }}
        deleteVisible={deleteVisible}
        deleting={deleting}
        onCancelDelete={() => setDeleteVisible(false)}
        onConfirmDelete={async () => {
          if (deleting) return;
          setDeleting(true);
          try {
            await deleteAccount();
            setDeleteVisible(false);
            router.replace("/LoginChoice");
          } catch (err: any) {
            showToast(err?.message || "Could not delete account", "error");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </SafeAreaView>
  );
}