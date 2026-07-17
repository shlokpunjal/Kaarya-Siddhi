import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

export default function AdminTasksSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <SkeletonBox width={70} height={26} borderRadius={6} />
        <SkeletonBox width={70} height={34} borderRadius={10} />
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <SkeletonBox width="100%" height={44} borderRadius={16} />
      </View>

      {/* Task cards */}
      <View style={styles.scrollContent}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.taskCard, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
          >
            <View style={styles.taskCardHeader}>
              <SkeletonBox width="60%" height={17} borderRadius={4} />
              <SkeletonBox width={70} height={22} borderRadius={8} />
            </View>
            <SkeletonBox width="80%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: { paddingHorizontal: 20, paddingBottom: 14 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});