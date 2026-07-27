import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { wp, moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

// Matches app/(task)/task-detail.tsx and taskDetailAdmin.tsx — same header +
// single detail-card layout, so one component covers both screens.
export default function TaskDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(70),
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <SkeletonBox width={28} height={28} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <HeaderTitleSkeleton width={130} />
        </View>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ padding: wp(6.4) }}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
                android: { elevation: 5 },
              }),
            },
          ]}
        >
          {/* Title + edit/delete icons row */}
          <View style={styles.titleRow}>
            <SkeletonBox width="65%" height={20} borderRadius={5} />
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <SkeletonBox width={20} height={20} borderRadius={5} />
              <SkeletonBox width={18} height={18} borderRadius={5} />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.base.border }]} />

          {/* Status */}
          <View style={styles.rowLine}>
            <SkeletonBox width={12} height={12} borderRadius={6} style={{ marginRight: 8 }} />
            <SkeletonBox width={140} height={15} borderRadius={4} />
          </View>

          {/* Label rows: priority, label, assigned to, deadline */}
          {[90, 100, 120, 110].map((w, i) => (
            <View key={i} style={styles.rowLine}>
              <SkeletonBox width={w} height={13} borderRadius={4} />
              <SkeletonBox width={90} height={13} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </View>
          ))}

          {/* Description block */}
          <SkeletonBox width={100} height={14} borderRadius={4} style={{ marginTop: 12, marginBottom: 8 }} />
          <SkeletonBox width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="90%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="60%" height={13} borderRadius={4} />

          {/* Files attached */}
          <SkeletonBox width={110} height={14} borderRadius={4} style={{ marginTop: 18, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonBox width={64} height={64} borderRadius={10} />
            <SkeletonBox width={64} height={64} borderRadius={10} />
          </View>

          {/* Feedback / action button */}
          <SkeletonBox width="100%" height={48} borderRadius={14} style={{ marginTop: 22 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: wp(5.3) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  divider: { height: 1, marginBottom: 16 },
  rowLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
});