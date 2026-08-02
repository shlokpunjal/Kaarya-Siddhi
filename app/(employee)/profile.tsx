import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { typography } from "../../theme/theme";
import { useTheme, useThemeMode } from "../../context/ThemeContext";
import ConfirmModal from "../../components/common/confirmModal";
import { router } from "expo-router";
import { authFetch } from "../../utils/authFetch";
import EmployeeProfileSkeleton from "../../components/skeletonScreens/Employee/EmployeeProfileSkeleton";
import { useToast } from "../../context/ToastContext";
import { clearSession } from "../../lib/secureSession";
import { useCurrentUser } from "../../hooks/profile/useCurrentUser";
import { useAvatarUpload } from "../../hooks/profile/useAvatarUpload";
import { profileStyles } from "../../styles/profileStyles";
import ProfileAvatar from "../../components/profile/ProfileAvatar";
import ProfileFieldsCard, { ProfileField } from "../../components/profile/ProfileFieldsCard";
import AppearanceCard from "../../components/profile/AppearanceCard";
import AccountModals from "../../components/profile/AccountModals";
import AvatarPreviewModal from "../../components/profile/AvatarPreviewModal";

export default function EmployeeProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "accepted">("none");
  const [adminName, setAdminName] = useState<string | null>(null);

  const [showImage, setShowImage] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [changeAdminVisible, setChangeAdminVisible] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { currentUser, setCurrentUser, loading, fetchCurrentUser: fetchUser } =
    useCurrentUser((msg) => console.error(msg));

  const { avatarUri, uploading, pickAvatar } = useAvatarUpload(
    currentUser?.id,
    currentUser?.profile_pic_url ?? null,
    (url) => setCurrentUser((prev) => (prev ? { ...prev, profile_pic_url: url } : prev)),
    (msg) => showToast(msg, "error"),
  );

  // Fetch connection status, then the verified user row via useCurrentUser.
  const fetchCurrentUser = async () => {
    const savedEmail = await AsyncStorage.getItem("userEmail");
    if (!savedEmail) return;

    const connRes = await authFetch("/connection-status");
    const connData = connRes.ok ? await connRes.json() : { status: "none" };
    setConnectionStatus(connData.status);
    setAdminName(connData.status === "accepted" ? connData.admin_name : null);

    await fetchUser();
  };

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? "");
    setContact(currentUser.mobile_number ?? "");
    setEmail(currentUser.email ?? "");
    setDepartment(currentUser.department ?? "");
    setDesignation(currentUser.designation ?? "");
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCurrentUser();
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
          department: department.trim(),
          designation: designation.trim(),
        }),
      });
      if (!res.ok) throw new Error("Could not save changes");

      setCurrentUser((prev) =>
        prev ? { ...prev, name, mobile_number: contact, department, designation } : prev,
      );
      setEditing(false);
      showToast("Profile updated", "success");
    } catch (error: any) {
      showToast(error?.message || "Could not save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmChangeAdmin = async () => {
    if (!currentUser) return;
    try {
      setDisconnecting(true);
      const response = await authFetch("/employee/disconnect-admin", {
        method: "POST",
        body: JSON.stringify({ employee_email: currentUser.email }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.detail || "Could not disconnect", "error");
        return;
      }
      setChangeAdminVisible(false);
      setConnectionStatus("none");
      setAdminName(null);
      router.replace({ pathname: "/(auth)/RequestAdmin", params: { email: currentUser.email } });
    } catch (error: any) {
      showToast(error?.message || "Could not disconnect", "error");
    } finally {
      setDisconnecting(false);
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

  if (loading) return <EmployeeProfileSkeleton />;

  if (!currentUser) {
    return (
      <SafeAreaView
        style={[
          profileStyles.safeArea,
          { backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={[typography.body, { color: colors.text.primary }]}>
          Could not load your profile. Please try logging in again.
        </Text>
      </SafeAreaView>
    );
  }

  const fields: ProfileField[] = [
    { key: "email", label: "Email id", value: email },
    { key: "contact", label: "Contact", value: contact, editable: true, onChange: setContact },
    { key: "department", label: "Department", value: department, editable: true, onChange: setDepartment },
    { key: "reportingTo", label: "Reporting to", value: adminName ?? "" },
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
            <Text style={[typography.label, { color: colors.brand.accent }]}>Employee</Text>
          </View>
        </View>

        {connectionStatus !== "accepted" && (
          <View
            style={[
              profileStyles.connectionBanner,
              { backgroundColor: colors.base.surfaceL1, borderColor: colors.brand.accent },
            ]}
          >
            <View style={profileStyles.connectionBannerRow}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.brand.accent} />
              <Text style={[typography.body, { color: colors.text.primary, marginLeft: 8, flex: 1 }]}>
                {connectionStatus === "pending"
                  ? "Your request for admin connection isn't approved yet."
                  : "You aren't connected to any admin yet."}
              </Text>
            </View>

            {connectionStatus === "none" && (
              <Pressable
                style={[profileStyles.requestAdminButton, { backgroundColor: colors.brand.accent }]}
                onPress={() =>
                  router.push({ pathname: "/(auth)/RequestAdmin", params: { email: currentUser.email } })
                }
              >
                <Ionicons name="link-outline" size={16} color="#FFFFFF" />
                <Text style={[typography.label, { color: "#FFFFFF", marginLeft: 6 }]}>Request Admin</Text>
              </Pressable>
            )}
          </View>
        )}

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

        <AppearanceCard colors={colors} mode={mode} setMode={setMode} />

        <View
          style={[
            profileStyles.card,
            { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border, paddingVertical: 4 },
          ]}
        >
          <Pressable
            style={[
              profileStyles.changeAdminRow,
              connectionStatus !== "accepted" && profileStyles.changeAdminRowDisabled,
            ]}
            onPress={() => setChangeAdminVisible(true)}
            disabled={connectionStatus !== "accepted"}
          >
            <View style={profileStyles.changeAdminLeft}>
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={connectionStatus === "accepted" ? colors.brand.accent : colors.text.secondary}
              />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={[
                    typography.heading3,
                    { color: connectionStatus === "accepted" ? colors.text.primary : colors.text.secondary },
                  ]}
                >
                  Change Admin
                </Text>
                <Text style={[typography.label, { color: colors.text.secondary, marginTop: 2 }]}>
                  {connectionStatus === "accepted" ? adminName : "Not connected"}
                </Text>
              </View>
            </View>
            {connectionStatus === "accepted" && (
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            )}
          </Pressable>
        </View>

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
            await clearSession();
            setDeleteVisible(false);
            router.replace("/(auth)/LoginChoice");
          } catch (err: any) {
            showToast(err?.message || "Could not delete account", "error");
          } finally {
            setDeleting(false);
          }
        }}
        extraModal={
          <ConfirmModal
            visible={changeAdminVisible}
            title="Change Admin"
            message="This will disconnect you from your current admin. You'll need to request a new admin connection. Are you sure?"
            confirmText={disconnecting ? "Changing..." : "Change"}
            cancelText="Cancel"
            destructive
            onCancel={() => setChangeAdminVisible(false)}
            onConfirm={confirmChangeAdmin}
          />
        }
      />
    </SafeAreaView>
  );
}