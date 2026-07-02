import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mockAdminUser } from '../../data/mockCurrentUser';
import { typography } from '../../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';

const EMPLOYEE_NAMES: Record<string, string> = {
  emp1: 'Ravi Kumar',
  emp2: 'Sita Devi',
};


const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];



export default function AdminProfile() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mockAdminUser.name);
  const [contact, setContact] = useState(mockAdminUser.phone);
  const [email, setemail] = useState(mockAdminUser.email);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);


  const handleSave = () => {
    setEditing(false);
  };

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();


  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => router.replace('/(auth)/AdminLogin'),
      },
    ]);
  };

  const pickAvatar = async () => {
    if (!editing) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const managedNames = mockAdminUser.managedEmployeeIds?.map((id) => EMPLOYEE_NAMES[id] ?? id) ?? [];

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
                  pickAvatar();            // Change profile picture
                } else if (avatarUri) {
                  setShowImage(true);      // View full image
                }
              }}
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
                  <Text
                    style={[
                      typography.subheading,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    {initials}
                  </Text>
                </View>
              )}

              {editing && (
                <View
                  style={[
                    styles.editBadge,
                    {
                      backgroundColor: colors.brand.primary,
                      borderColor: colors.base.background,
                    },
                  ]}
                >
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
                {mockAdminUser.designation}
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
            {mockAdminUser.department}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 10 }]}>
            Team
          </Text>
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 10 }]}>
            {managedNames.length} {managedNames.length === 1 ? 'employee' : 'employees'} managed
          </Text>
          {managedNames.map((empName) => (
            <Text key={empName} style={[typography.body, { color: colors.text.primary, marginBottom: 4 }]}>
              · {empName}
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
          style={[styles.actionButton, { backgroundColor: colors.brand.accent }]}
          onPress={editing ? handleSave : () => setEditing(true)}
        >
          <Text style={[typography.heading3, { color: '#FFFFFF' }]}>
            {editing ? 'Save Changes' : 'Edit Profile'}
          </Text>
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
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowImage(false)}
        >
          {avatarUri && (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: '90%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
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
});
