import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { typography } from '../../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';
import CollapsibleSection from '../../components/CollapsibleSection';
import ConfirmModal from '../../components/confirmModal';

type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile_number: string | null;
  department: string | null;
  designation: string | null;
  profile_pic_url: string | null;
};

type ManagedEmployee = { email: string; name: string };

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const AVATAR_SIZE = 84;
const RING_SIZE = AVATAR_SIZE + 12;

export default function AdminProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const { logout } = useAuth();

  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setemail] = useState('');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const [managedEmployees, setManagedEmployees] = useState<ManagedEmployee[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
    fetchTeam();
  }, []);

  // ── Fetch the logged-in admin's own row from Supabase ────────────────────
  const fetchCurrentUser = async () => {
    setLoading(true);

    const savedEmail = await AsyncStorage.getItem('userEmail');

    if (!savedEmail) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, mobile_number, department, designation, profile_pic_url')
      .eq('email', savedEmail)
      .single();

    if (error) {
      console.error('Profile fetch error:', error.message);
      setLoading(false);
      return;
    }

    setCurrentUser(data);
    setName(data.name ?? '');
    setContact(data.mobile_number ?? '');
    setemail(data.email ?? '');
    setAvatarUri(data.profile_pic_url ?? null);
    setLoading(false);
  };

  // ── Fetch this admin's connected employees from the connections table ────
  const fetchTeam = async () => {
    setLoadingTeam(true);

    const savedEmail = await AsyncStorage.getItem('userEmail');
    if (!savedEmail) {
      setLoadingTeam(false);
      return;
    }

    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('employee_email')
      .eq('admin_email', savedEmail)
      .eq('status', 'accepted');

    if (connError) {
      console.error('Team fetch error:', connError.message);
      setLoadingTeam(false);
      return;
    }

    const employeeEmails = (connections ?? []).map((c) => c.employee_email);

    if (employeeEmails.length === 0) {
      setManagedEmployees([]);
      setLoadingTeam(false);
      return;
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, name')
      .in('email', employeeEmails);

    if (usersError) {
      console.error('Team users fetch error:', usersError.message);
      setLoadingTeam(false);
      return;
    }

    setManagedEmployees(
      employeeEmails.map((empEmail) => ({
        email: empEmail,
        name: users?.find((u) => u.email === empEmail)?.name ?? empEmail,
      }))
    );
    setLoadingTeam(false);
  };

  // ── Save edited fields back to Supabase ───────────────────────────────────
  const handleSave = async () => {
    if (!currentUser) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          mobile_number: contact.trim(),
          email: email.trim(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      await AsyncStorage.setItem('userEmail', email.trim());

      setCurrentUser((prev) => (prev ? { ...prev, name, mobile_number: contact, email } : prev));
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Could not save', error?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            const { error } = await supabase.from('users').delete().eq('id', currentUser.id);
            if (error) {
              Alert.alert('Could not delete account', error.message);
              return;
            }
            logout();
          },
        },
      ]
    );
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      // TEMPORARY — local state only for now; hook up upload (e.g. Cloudinary)
      // and persist the URL to users.profile_pic_url when ready.
    }
  };

  const initials = (name || currentUser?.name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[typography.body, { color: colors.text.primary }]}>
          Could not load your profile. Please try logging in again.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={[typography.heading, { color: colors.text.primary }]}>Profile</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border }]}>
            <Text style={[typography.label, { color: colors.brand.accent }]}>Admin</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.cardTopRow}>
            <Pressable
              style={[
                styles.editPill,
                {
                  borderColor: colors.brand.accent,
                  backgroundColor: editing ? colors.brand.accent : 'transparent',
                },
              ]}
              onPress={editing ? handleSave : () => setEditing(true)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={editing ? '#FFFFFF' : colors.brand.accent} />
              ) : (
                <>
                  <Ionicons name={editing ? 'checkmark' : 'pencil'} size={13} color={editing ? '#FFFFFF' : colors.brand.accent} />
                  <Text style={[typography.label, { color: editing ? '#FFFFFF' : colors.brand.accent, marginLeft: 4 }]}>
                    {editing ? 'Save' : 'Edit Profile'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Pressable onPress={() => (avatarUri ? setShowImage(true) : pickAvatar())}>
                <View style={[styles.avatarRing, { borderColor: colors.brand.accent }]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.brand.accent }]}>
                      <Text style={[typography.heading, { color: '#FFFFFF' }]}>{initials}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <Pressable
                style={[styles.cameraBadge, { backgroundColor: colors.brand.primary, borderColor: colors.base.surfaceL1 }]}
                onPress={pickAvatar}
                hitSlop={8}
              >
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 12 }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
              {currentUser.designation ?? '—'}
            </Text>
          </View>

          <View style={styles.fieldsGroup}>
            <View style={[styles.fieldRow, { borderBottomColor: colors.base.border }]}>
              <Text style={[typography.label, { color: colors.text.secondary }]}>Full name</Text>
              {editing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
                />
              ) : (
                <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>{name}</Text>
              )}
            </View>

            <View style={[styles.fieldRow, { borderBottomColor: colors.base.border }]}>
              <Text style={[typography.label, { color: colors.text.secondary }]}>Email id</Text>
              {editing ? (
                <TextInput
                  value={email}
                  onChangeText={setemail}
                  style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
                />
              ) : (
                <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>{email}</Text>
              )}
            </View>

            <View style={[styles.fieldRow, { borderBottomColor: colors.base.border }]}>
              <Text style={[typography.label, { color: colors.text.secondary }]}>Contact</Text>
              {editing ? (
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
                />
              ) : (
                <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>{contact}</Text>
              )}
            </View>

            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              <Text style={[typography.label, { color: colors.text.secondary }]}>Department</Text>
              <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>
                {currentUser.department ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.teamHeaderRow}>
            <Text style={[typography.subheading, { color: colors.text.primary }]}>Team</Text>
            <View style={[styles.countChip, { backgroundColor: colors.base.surfaceL2 }]}>
              {loadingTeam ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <Text style={[typography.label, { color: colors.text.secondary }]}>
                  {managedEmployees.length} {managedEmployees.length === 1 ? 'employee' : 'employees'}
                </Text>
              )}
            </View>
          </View>
          {!loadingTeam && managedEmployees.length === 0 && (
            <Text style={[typography.body, { color: colors.text.secondary, marginTop: 8 }]}>
              No connected employees yet.
            </Text>
          )}
          {managedEmployees.map((emp) => (
            <Text key={emp.email} style={[typography.body, { color: colors.text.primary, marginTop: 8 }]}>
              · {emp.name}
            </Text>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border, paddingVertical: 4 }]}>
          <CollapsibleSection
            icon="color-palette-outline"
            title="Appearance"
            summary={THEME_OPTIONS.find((o) => o.value === mode)?.label}
            colors={colors}
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
                        backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
                        borderColor: selected ? colors.brand.accent : colors.base.border,
                      },
                    ]}
                  >
                    <Ionicons name={option.icon} size={22} color={selected ? '#FFFFFF' : colors.text.primary} />
                    <Text style={[typography.label, { color: selected ? '#FFFFFF' : colors.text.primary, marginTop: 4 }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </CollapsibleSection>

          <CollapsibleSection icon="language-outline" title="Language" summary="English" colors={colors} last>
            <Pressable
              style={[styles.languageButton, { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border }]}
              onPress={() => {}}
            >
              <Ionicons name="language-outline" size={20} color={colors.text.primary} />
              <Text style={[typography.body, { color: colors.text.primary, marginLeft: 8 }]}>English</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </CollapsibleSection>
        </View>

        <Pressable style={[styles.logoutRow, { backgroundColor: colors.brand.primary }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={[typography.heading3, { color: '#ffffff', marginLeft: 8 }]}>Log Out</Text>
        </Pressable>

        <Pressable style={styles.deleteRow} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={[typography.heading3, { color: '#FFFFFF', marginLeft: 8 }]}>Delete Account</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
        <Pressable style={styles.modalBackground} onPress={() => setShowImage(false)}>
          <Ionicons name="close" size={30} color="#FFFFFF" style={styles.closeModalButton} />
          {avatarUri && <Image source={{ uri: avatarUri }} style={styles.fullscreenImage} resizeMode="contain" />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  card: { borderRadius: 18, borderWidth: 2, padding: 18, marginBottom: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarSection: { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  avatarWrap: { position: 'relative', width: RING_SIZE, height: RING_SIZE },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsGroup: { marginTop: 4 },
  fieldRow: { borderBottomWidth: 1, paddingVertical: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 },
  teamHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, minWidth: 30, minHeight: 22, alignItems: 'center', justifyContent: 'center' },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C53030',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  closeModalButton: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullscreenImage: { width: '90%', height: '70%' },
});