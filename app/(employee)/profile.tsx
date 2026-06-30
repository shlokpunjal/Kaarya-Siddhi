import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { mockEmployeeUser } from '../../data/mockCurrentUser';
import { typography } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

export default function EmployeeProfile() {
  const { colors } = useTheme();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mockEmployeeUser.name);
  const [contact, setContact] = useState(mockEmployeeUser.phone);
  const [email, setemail] = useState(mockEmployeeUser.email);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);

  const handleSave = () => {
    // TEMPORARY — no backend yet, this only updates local state for now
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => router.replace('/(auth)/clientLogin'),
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
      // mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
          Profile
        </Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 20 }]}>
          Employee
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
                {mockEmployeeUser.designation}
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
            {mockEmployeeUser.department}
          </Text>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
});