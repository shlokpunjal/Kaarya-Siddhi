import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { wp, moderateScale } from '../../utils/responsive';
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

          <View style={[styles.divider, { backgroundColor: colors.base.border }]} />

          {/* Description heading + paragraph */}
          <SkeletonBox width={110} height={15} borderRadius={4} style={{ marginBottom: 8 }} />
          <SkeletonBox width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="70%" height={13} borderRadius={4} style={{ marginBottom: 20 }} />

          {/* Deadline row: icon + inline label+value */}
          <View style={styles.rowLine}>
            <SkeletonBox width={18} height={18} borderRadius={5} style={{ marginRight: 8 }} />
            <SkeletonBox width={180} height={15} borderRadius={4} />
          </View>

          {/* Assigned To row: icon + inline label+value */}
          <View style={[styles.rowLine, { marginBottom: 16 }]}>
            <SkeletonBox width={18} height={18} borderRadius={5} style={{ marginRight: 8 }} />
            <SkeletonBox width={160} height={15} borderRadius={4} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.base.border }]} />

          {/* Files Attached heading */}
          <SkeletonBox width={150} height={15} borderRadius={4} style={{ marginBottom: 10 }} />

          {/* File list rows: icon + filename bar + open icon, each its own bordered row */}
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[
                styles.fileRow,
                { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border },
              ]}
            >
              <SkeletonBox width={22} height={22} borderRadius={5} />
              <SkeletonBox width="60%" height={14} borderRadius={4} style={{ marginLeft: 10 }} />
              <SkeletonBox width={18} height={18} borderRadius={5} style={{ marginLeft: 'auto' }} />
            </View>
          ))}

          {/* Review or Complete button */}
          <SkeletonBox width="100%" height={50} borderRadius={12} style={{ marginTop: 24 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: wp(5.3) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  divider: { height: 1, marginBottom: 16 },
  rowLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
});