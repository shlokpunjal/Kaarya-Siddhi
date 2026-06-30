import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';

export default function Report() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 6 }]}>
        Reports
      </Text>
      <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 28 }]}>
        Generate filtered reports for your team's tasks
      </Text>

      <Pressable
        style={[
          styles.optionCard,
          { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
        ]}
        onPress={() => router.push('/reports/genExcel')}
      >
        <View style={[styles.iconBadge, { backgroundColor: colors.status.completed }]}>
          <Text style={styles.iconBadgeText}>XLS</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.subheading, { color: colors.text.primary }]}>
            Generate Excel
          </Text>
          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 2 }]}>
            Filtered, sortable spreadsheet
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.optionCard,
          { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
        ]}
        onPress={() => router.push('/reports/genPdf')}
      >
        <View style={[styles.iconBadge, { backgroundColor: colors.status.overdue }]}>
          <Text style={styles.iconBadgeText}>PDF</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.subheading, { color: colors.text.primary }]}>
            Generate PDF
          </Text>
          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 2 }]}>
            Shareable, print-ready document
          </Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});