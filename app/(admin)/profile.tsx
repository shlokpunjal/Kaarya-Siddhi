
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { typography } from '../../theme/theme';
import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';
import ConfirmModal from "../../components/confirmModal";
import { useAuth } from "../../hooks/useAuth";



type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile_number: string | null;
  department: string | null;
  designation: string | null;
  profile_pic_url: string | null;
  workspace_id: string | null;
};

type ManagedEmployee = {
  id: string;
  name: string;
};

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function AdminProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const { logout } = useAuth();
  const router = useRouter();

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

  useEffect(() => {
    fetchCurrentUser();
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
      .select('id, name, email, mobile_number, department, designation, profile_pic_url, workspace_id')
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

    // Fetch employees under this admin's workspace
    if (data.workspace_id) {
      const { data: employees, error: empError } = await supabase
        .from('users')
        .select('id, name')
        .eq('workspace_id', data.workspace_id)
        .eq('role', 'employee');

      if (!empError && employees) {
        setManagedEmployees(employees);
      }
    }

    setLoading(false);
  };

  // ── Save edited fields back to Supabase ─────────────────────────────────────
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

  const initials = (name || currentUser?.name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // const handleLogout = () => {
  //   Alert.alert('Log out', 'Are you sure you want to log out?', [
  //     { text: 'Cancel', style: 'cancel' },
  //     {
  //       text: 'Log out',
  //       style: 'destructive',
  //       onPress: () => router.replace('/(auth)/LoginChoice'),
  //     },
  //   ]);
  // };

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const pickAvatar = async () => {
    if (!editing) return;
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
      // TEMPORARY — local state only for now; hook up upload (e.g. Cloudinary/B2)
      // and persist avatar URL to Supabase when backend is ready.
    }
  };

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
        <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
          Profile
        </Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 24 }]}>
          Admin
        </Text>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          {/* Avatar + Name row */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.avatarPressable}
              onPress={() => {
                if (editing) {
                  pickAvatar();
                } else if (avatarUri) {
                  setShowImage(true);
                }
              }}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.brand.accent }]}>
                  <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
                    {initials}
                  </Text>
                </View>
              )}

              {editing && (
                <View style={[styles.editBadge, { backgroundColor: colors.brand.primary, borderColor: colors.base.background }]}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <View style={styles.nameColumn}>
              {editing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
                />
              ) : (
                <Text style={[typography.subheading, { color: colors.text.primary }]} numberOfLines={1}>
                  {name}
                </Text>
              )}
              <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
                {currentUser.designation ?? '—'}
              </Text>
            </View>
          </View>

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
            Email id
          </Text>
          {editing ? (
            <TextInput
              value={email}
              onChangeText={setemail}
              style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
            />
          ) : (
            <Text style={[typography.body, { color: colors.text.primary }]}>{email}</Text>
          )}

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
            Contact
          </Text>
          {editing ? (
            <TextInput
              value={contact}
              onChangeText={setContact}
              style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
            />
          ) : (
            <Text style={[typography.body, { color: colors.text.primary }]}>{contact}</Text>
          )}

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 16, marginBottom: 6 }]}>
            Department
          </Text>
          <Text style={[typography.body, { color: colors.text.primary }]}>
            {currentUser.department ?? '—'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 10 }]}>
            Team
          </Text>
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 10 }]}>
            {managedEmployees.length} {managedEmployees.length === 1 ? 'employee' : 'employees'} managed
          </Text>
          {managedEmployees.map((emp) => (
            <Text key={emp.id} style={[typography.body, { color: colors.text.primary, marginBottom: 4 }]}>
              · {emp.name}
            </Text>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 14 }]}>
            Appearance
          </Text>
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

          <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 20, marginBottom: 10 }]}>
            Language
          </Text>
          <Pressable
            style={[styles.languageButton, { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border }]}
            onPress={() => { }}
          >
            <Ionicons name="language-outline" size={20} color={colors.text.primary} />
            <Text style={[typography.body, { color: colors.text.primary, marginLeft: 8 }]}>English</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.brand.accent, opacity: saving ? 0.7 : 1 }]}
          onPress={editing ? handleSave : () => setEditing(true)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[typography.heading3, { color: '#FFFFFF' }]}>
              {editing ? 'Save Changes' : 'Edit Profile'}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.logoutButton, { borderColor: colors.status.overdue }]}
          onPress={handleLogout}
        >
          <Text style={[typography.heading3, { color: colors.status.overdue }]}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImage(false)}
      >
        <Pressable style={styles.modalBackground} onPress={() => setShowImage(false)}>
          <Ionicons name="close" size={30} color="#FFFFFF" style={styles.closeModalButton} />
          {avatarUri && (
            <Image source={{ uri: avatarUri }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>
      <ConfirmModal
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        destructive
        confirmColor="#E8870A"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
      />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
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
  actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarPressable: { position: 'relative' },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: { marginLeft: 14, flex: 1 },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullscreenImage: {
    width: '90%',
    height: '70%',
  },
});