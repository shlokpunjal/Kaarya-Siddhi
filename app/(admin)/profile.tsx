import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { mockAdminUser } from '../../data/mockCurrentUser';
import { typography } from '../../theme/theme';
import { useTheme } from '../../theme/useTheme';

const EMPLOYEE_NAMES: Record<string, string> = {
  emp1: 'Ravi Kumar',
  emp2: 'Sita Devi',
};

export default function AdminProfile() {
  const { colors } = useTheme();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mockAdminUser.name);
  const [contact, setContact] = useState(mockAdminUser.phoneOrEmail);

  const handleSave = () => {
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
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 6 }]}>
            Name
          </Text>
          {editing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
            />
          ) : (
            <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 16 }]}>
              {name}
            </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
});