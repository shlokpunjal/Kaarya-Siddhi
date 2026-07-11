import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/theme';
import { fetchEofficeFiles } from '../../../lib/eoffice';
import type { EofficeFile } from '../../../types/eoffice';

export default function EofficeList() {
  const { colors } = useTheme();
  const router = useRouter();
  const [files, setFiles] = useState<EofficeFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    try {
      const data = await fetchEofficeFiles();
      setFiles(data);
    } catch (err) {
      console.error('Failed to load eOffice files', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const daysPending = (pendingSince: string) => {
    const diff = Date.now() - new Date(pendingSince).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 6 }]}>
        eOffice Files
      </Text>
      <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 20 }]}>
        Track files pending across offices
      </Text>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !loading ? (
            <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 40 }]}>
              No files added yet
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
            onPress={() => router.push(`/reports/eoffice/${item.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.subheading, { color: colors.text.primary }]}>
                File #{item.file_no}
              </Text>
              <Text style={[typography.label, { color: colors.text.secondary, marginTop: 2 }]}>
                Sr. No. {item.sr_no} · Pending with {item.pending_with}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.completed ? colors.status.completed : colors.status.overdue },
              ]}
            >
              <Text style={styles.statusText}>
                {item.completed ? 'Done' : `${daysPending(item.pending_since)}d`}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.brand.accent }]}
        onPress={() => router.push('/reports/eoffice/new')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
});