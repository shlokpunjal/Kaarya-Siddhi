import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { typography } from "../../theme/theme";
import { useTheme, useThemeMode, ThemeMode } from "../../context/ThemeContext";
import CollapsibleSection from "../../components/CollapsibleSection";
import ConfirmModal from "../../components/confirmModal";
import { router } from "expo-router";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import { wp, moderateScale } from "../../utils/responsive";
import { API_BASE_URL } from "../../constants/api";
import { authFetch } from "../../utils/authFetch"; // adjust path if needed
import EmployeeProfileSkeleton from "../../components/EmployeeProfileSkeleton";
import { useToast } from "../../context/ToastContext";

type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile_number: string | null;
  department: string | null;
  designation: string | null;
  profile_pic_url: string | null;
};

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { value: "light", label: "Light", icon: "sunny-outline" },
    { value: "dark", label: "Dark", icon: "moon-outline" },
    { value: "system", label: "System", icon: "phone-portrait-outline" },
  ];

const AVATAR_SIZE = moderateScale(84);
const RING_SIZE = AVATAR_SIZE + 12;

export default function EmployeeProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "pending" | "accepted"
  >("none");

  const [adminName, setAdminName] = useState<string | null>(null);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [changeAdminVisible, setChangeAdminVisible] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    setLoading(true);

    const savedEmail = await AsyncStorage.getItem("userEmail");

    if (!savedEmail) {
      setLoading(false);
      return;
    }

    const { data: connections, error: connError } = await supabase
      .from("connections")
      .select("admin_email, status")
      .eq("employee_email", savedEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (connError) console.log("Connection query error:", connError);

    const latestConnection = connections?.[0];

    if (latestConnection?.status === "accepted") {
      setConnectionStatus("accepted");

      const { data: adminUser } = await supabase
        .from("users")
        .select("name")
        .eq("email", latestConnection.admin_email)
        .maybeSingle();

      setAdminName(adminUser?.name ?? latestConnection.admin_email);
    } else if (latestConnection?.status === "pending") {
      setConnectionStatus("pending");
    } else {
      setConnectionStatus("none");
    }
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, name, email, mobile_number, department, designation, profile_pic_url",
      )
      .eq("email", savedEmail)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      setLoading(false);
      return;
    }

    setCurrentUser(data);
    setName(data.name ?? "");
    setContact(data.mobile_number ?? "");
    setEmail(data.email ?? "");
    setAvatarUri(data.profile_pic_url ?? null);
    setLoading(false);
  };

  // ── Pull-to-refresh handler ────────────────────────────────────────────────
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

      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          mobile_number: contact.trim(),
          email: email.trim(),
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      await AsyncStorage.setItem("userEmail", email.trim());

      setCurrentUser((prev) =>
        prev ? { ...prev, name, mobile_number: contact, email } : prev,
      );
      setEditing(false);
      showToast("Profile updated", "success");
    } catch (error: any) {
      showToast(error?.message || "Could not save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const handleChangeAdmin = () => {
    setChangeAdminVisible(true);
  };

  const confirmChangeAdmin = async () => {
    if (!currentUser) return;

    try {
      setDisconnecting(true);
      console.log("Starting disconnect request...");

      const response = await authFetch("/employee/disconnect-admin", {
        method: "POST",
        body: JSON.stringify({
          employee_email: currentUser.email,
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        showToast(data.detail || "Could not disconnect", "error");
        return;
      }

      console.log("Success, navigating...");
      setChangeAdminVisible(false);
      setConnectionStatus("none");
      setAdminName(null);

      router.replace({
        pathname: "/(auth)/RequestAdmin",
        params: { email: currentUser.email },
      });
    } catch (error: any) {
      console.log("Caught error:", error);
      showToast(error?.message || "Could not disconnect", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  async function deleteAccount() {
    const res = await authFetch(`/delete-account`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete account");
    }
  }

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Please allow photo library access to set a profile picture.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setAvatarUri(localUri); // optimistic preview
    setUploading(true);

    try {
      const secureUrl = await uploadToCloudinary(
        {
          uri: localUri,
          type: "image/jpeg",
          name: `avatar_${currentUser!.id}.jpg`,
        },
        { folder: "profile_pics", resourceType: "image" },
      );

      const { error } = await supabase
        .from("users")
        .update({ profile_pic_url: secureUrl })
        .eq("id", currentUser!.id);

      if (error) throw error;

      setAvatarUri(secureUrl);
      setCurrentUser((prev) =>
        prev ? { ...prev, profile_pic_url: secureUrl } : prev,
      );
    } catch (err: any) {
      showToast(err.message || "Could not upload photo.", "error");
      setAvatarUri(currentUser?.profile_pic_url ?? null); // revert preview
    } finally {
      setUploading(false);
    }
  };

  const initials = (name || currentUser?.name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return <EmployeeProfileSkeleton />;
  }

  if (!currentUser) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.base.background,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={[typography.body, { color: colors.text.primary }]}>
          Could not load your profile. Please try logging in again.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.base.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.accent}
            colors={[colors.brand.accent]}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={[typography.heading, { color: colors.text.primary }]}>
            Profile
          </Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: colors.base.surfaceL2,
                borderColor: colors.base.border,
              },
            ]}
          >
            <Text style={[typography.label, { color: colors.brand.accent }]}>
              Employee
            </Text>
          </View>
        </View>

        {connectionStatus !== "accepted" && (
          <View
            style={[
              styles.connectionBanner,
              {
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.brand.accent,
              },
            ]}
          >
            <View style={styles.connectionBannerRow}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.brand.accent}
              />
              <Text
                style={[
                  typography.body,
                  { color: colors.text.primary, marginLeft: 8, flex: 1 },
                ]}
              >
                {connectionStatus === "pending"
                  ? "Your request for admin connection isn't approved yet."
                  : "You aren't connected to any admin yet."}
              </Text>
            </View>

            {connectionStatus === "none" && (
              <Pressable
                style={[
                  styles.requestAdminButton,
                  { backgroundColor: colors.brand.accent },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/RequestAdmin",
                    params: { email: currentUser.email },
                  })
                }
              >
                <Ionicons name="link-outline" size={16} color="#FFFFFF" />
                <Text
                  style={[
                    typography.label,
                    { color: "#FFFFFF", marginLeft: 6 },
                  ]}
                >
                  Request Admin
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
            },
          ]}
        >
          <View style={styles.cardTopRow}>
            <Pressable
              style={[
                styles.editPill,
                {
                  borderColor: colors.brand.accent,
                  backgroundColor: editing
                    ? colors.brand.accent
                    : "transparent",
                },
              ]}
              onPress={editing ? handleSave : () => setEditing(true)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={editing ? "#FFFFFF" : colors.brand.accent}
                />
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
                      {
                        color: editing ? "#FFFFFF" : colors.brand.accent,
                        marginLeft: 4,
                      },
                    ]}
                  >
                    {editing ? "Save" : "Edit Profile"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Pressable
                onPress={() => {
                  if (editing) {
                    pickAvatar();
                  } else if (avatarUri) {
                    setShowImage(true);
                  }
                }}
              >
                <View
                  style={[
                    styles.avatarRing,
                    { borderColor: colors.brand.accent },
                  ]}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarImage,
                        styles.avatarFallback,
                        { backgroundColor: colors.brand.accent },
                      ]}
                    >
                      <Text style={[typography.heading, { color: "#FFFFFF" }]}>
                        {initials}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              {uploading && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: RING_SIZE / 2,
                      backgroundColor: "rgba(0,0,0,0.35)",
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}

              {editing && (
                <Pressable
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: colors.brand.primary,
                      borderColor: colors.base.surfaceL1,
                    },
                  ]}
                  onPress={pickAvatar}
                  hitSlop={8}
                >
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            <Text
              style={[
                typography.subheading,
                { color: colors.text.primary, marginTop: 12 },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.text.secondary, marginTop: 2 },
              ]}
            >
              {currentUser.designation ?? "—"}
            </Text>
          </View>

          <View style={styles.fieldsGroup}>
            <View
              style={[
                styles.fieldRow,
                { borderBottomColor: colors.base.border },
              ]}
            >
              <Text
                style={[typography.label, { color: colors.text.secondary }]}
              >
                Email id
              </Text>
              {editing ? (
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    typography.body,
                    {
                      borderColor: colors.base.border,
                      color: colors.text.primary,
                    },
                  ]}
                />
              ) : (
                <Text
                  style={[
                    typography.body,
                    { color: colors.text.primary, marginTop: 4 },
                  ]}
                >
                  {email}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.fieldRow,
                { borderBottomColor: colors.base.border },
              ]}
            >
              <Text
                style={[typography.label, { color: colors.text.secondary }]}
              >
                Contact
              </Text>
              {editing ? (
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  style={[
                    styles.input,
                    typography.body,
                    {
                      borderColor: colors.base.border,
                      color: colors.text.primary,
                    },
                  ]}
                />
              ) : (
                <Text
                  style={[
                    typography.body,
                    { color: colors.text.primary, marginTop: 4 },
                  ]}
                >
                  {contact}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.fieldRow,
                { borderBottomColor: colors.base.border },
              ]}
            >
              <Text
                style={[typography.label, { color: colors.text.secondary }]}
              >
                Department
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.text.primary, marginTop: 4 },
                ]}
              >
                {currentUser.department ?? "—"}
              </Text>
            </View>

            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              <Text
                style={[typography.label, { color: colors.text.secondary }]}
              >
                Reporting to
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.text.primary, marginTop: 4 },
                ]}
              >
                {adminName ?? "—"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              paddingVertical: 4,
            },
          ]}
        >
          <CollapsibleSection
            icon="color-palette-outline"
            title="Appearance"
            summary={THEME_OPTIONS.find((o) => o.value === mode)?.label}
            colors={colors}
            last
          >
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => {
                const selected = mode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setMode(option.value)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: selected
                          ? colors.brand.accent
                          : colors.base.surfaceL2,
                        borderColor: selected
                          ? colors.brand.accent
                          : colors.base.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={selected ? "#FFFFFF" : colors.text.primary}
                    />
                    <Text
                      style={[
                        typography.label,
                        {
                          color: selected ? "#FFFFFF" : colors.text.primary,
                          marginTop: 4,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </CollapsibleSection>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              paddingVertical: 4,
            },
          ]}
        >
          <Pressable
            style={[
              styles.changeAdminRow,
              connectionStatus !== "accepted" && styles.changeAdminRowDisabled,
            ]}
            onPress={handleChangeAdmin}
            disabled={connectionStatus !== "accepted"}
          >
            <View style={styles.changeAdminLeft}>
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={
                  connectionStatus === "accepted"
                    ? colors.brand.accent
                    : colors.text.secondary
                }
              />
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={[
                    typography.heading3,
                    {
                      color:
                        connectionStatus === "accepted"
                          ? colors.text.primary
                          : colors.text.secondary,
                    },
                  ]}
                >
                  Change Admin
                </Text>
                <Text
                  style={[
                    typography.label,
                    { color: colors.text.secondary, marginTop: 2 },
                  ]}
                >
                  {connectionStatus === "accepted"
                    ? adminName
                    : "Not connected"}
                </Text>
              </View>
            </View>
            {connectionStatus === "accepted" && (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.secondary}
              />
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.logoutRow, { backgroundColor: colors.brand.primary }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text
            style={[typography.heading3, { color: "#ffffff", marginLeft: 8 }]}
          >
            Log Out
          </Text>
        </Pressable>

        <Pressable
          style={styles.deleteRow}
          onPress={() => setDeleteVisible(true)}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text
            style={[typography.heading3, { color: "#FFFFFF", marginLeft: 8 }]}
          >
            Delete Account
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImage(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setShowImage(false)}
        >
          <Ionicons
            name="close"
            size={30}
            color="#FFFFFF"
            style={styles.closeModalButton}
          />
          {avatarUri && (
            <Image
              source={{ uri: avatarUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        confirmColor="#E8870A"
        destructive
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
      />
      <ConfirmModal
        visible={deleteVisible}
        title="Delete Account"
        message="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        confirmColor="#D64545"
        destructive
        confirmDisabled={deleting}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={async () => {
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  changeAdminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  changeAdminRowDisabled: {
    opacity: 0.5,
  },
  changeAdminLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  safeArea: { flex: 1 },
  scrollContent: { padding: wp(5.3), paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: { borderRadius: 18, borderWidth: 2, padding: 18, marginBottom: 16 },
  cardTopRow: { flexDirection: "row", justifyContent: "flex-end" },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarSection: { alignItems: "center", marginTop: 4, marginBottom: 18 },
  avatarWrap: { position: "relative", width: RING_SIZE, height: RING_SIZE },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldsGroup: { marginTop: 4 },
  fieldRow: { borderBottomWidth: 1, paddingVertical: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  themeRow: { flexDirection: "row", gap: 10 },
  themeOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C53030",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullscreenImage: { width: "90%", height: "70%" },
  connectionBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  connectionBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestAdminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
});