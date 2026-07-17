import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

const AVATAR_SIZE = 84;
const RING_SIZE = AVATAR_SIZE + 12;

export default function AdminProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <View style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={90} height={26} borderRadius={6} />
          <SkeletonBox width={60} height={24} borderRadius={20} />
        </View>

        {/* Profile card */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.cardTopRow}>
            <SkeletonBox width={100} height={26} borderRadius={20} />
          </View>

          <View style={styles.avatarSection}>
            <SkeletonBox width={RING_SIZE} height={RING_SIZE} borderRadius={RING_SIZE / 2} />
            <SkeletonBox width={140} height={18} borderRadius={6} style={{ marginTop: 14 }} />
            <SkeletonBox width={90} height={14} borderRadius={6} style={{ marginTop: 8 }} />
          </View>

          <View style={styles.fieldsGroup}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.fieldRow,
                  { borderBottomColor: colors.base.border, borderBottomWidth: i === 3 ? 0 : 1 },
                ]}
              >
                <SkeletonBox width={70} height={11} borderRadius={4} />
                <SkeletonBox
                  width={i === 0 || i === 1 ? '70%' : 120}
                  height={15}
                  borderRadius={4}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Team card */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.teamHeaderRow}>
            <SkeletonBox width={60} height={20} borderRadius={6} />
            <SkeletonBox width={80} height={22} borderRadius={20} />
          </View>
          <SkeletonBox width="60%" height={14} borderRadius={4} style={{ marginTop: 14 }} />
          <SkeletonBox width="45%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
        </View>

        {/* Appearance card */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.teamHeaderRow}>
            <SkeletonBox width={100} height={18} borderRadius={6} />
            <SkeletonBox width={60} height={14} borderRadius={4} />
          </View>
        </View>

        {/* Bottom buttons */}
        <SkeletonBox width="100%" height={48} borderRadius={14} style={{ marginTop: 4 }} />
        <SkeletonBox width="100%" height={48} borderRadius={14} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  card: { borderRadius: 18, borderWidth: 2, padding: 18, marginBottom: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  avatarSection: { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  fieldsGroup: { marginTop: 4 },
  fieldRow: { paddingVertical: 12 },
  teamHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});