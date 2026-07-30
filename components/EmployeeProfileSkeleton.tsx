import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';
import { wp, moderateScale } from '../utils/responsive';

const AVATAR_SIZE = moderateScale(84);
const RING_SIZE = AVATAR_SIZE + 12;

export default function EmployeeProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <View style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={90} height={26} borderRadius={6} />
          <SkeletonBox width={70} height={24} borderRadius={20} />
        </View>

        {/* Connection banner placeholder */}
        <View
          style={[
            styles.connectionBanner,
            { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
          ]}
        >
          <View style={styles.connectionBannerRow}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
            <SkeletonBox width="70%" height={14} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
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
            {/* Email, Contact, Department, Reporting to */}
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.fieldRow,
                  { borderBottomColor: colors.base.border, borderBottomWidth: i === 3 ? 0 : 1 },
                ]}
              >
                <SkeletonBox width={80} height={11} borderRadius={4} />
                <SkeletonBox
                  width={i === 0 ? '70%' : 120}
                  height={15}
                  borderRadius={4}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Appearance card */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.teamHeaderRow}>
            <SkeletonBox width={100} height={18} borderRadius={6} />
            <SkeletonBox width={60} height={14} borderRadius={4} />
          </View>
        </View>

        {/* Change admin card */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <View style={styles.changeAdminRow}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
            <View style={{ marginLeft: 12 }}>
              <SkeletonBox width={110} height={16} borderRadius={4} />
              <SkeletonBox width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
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
  scrollContent: { padding: wp(5.3), paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  connectionBanner: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 16 },
  connectionBannerRow: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 18, borderWidth: 2, padding: 18, marginBottom: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  avatarSection: { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  fieldsGroup: { marginTop: 4 },
  fieldRow: { paddingVertical: 12 },
  teamHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeAdminRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
});