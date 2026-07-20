import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

export default function EofficeDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      <View style={{ padding: 20 }}>
        {/* Back button + title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonBox width={26} height={26} borderRadius={6} style={{ marginBottom: 18 }} />
          <SkeletonBox width={180} height={26} borderRadius={6} style={{ marginBottom: 20 }} />
        </View>

        {/* Sr no / status line */}
        <SkeletonBox width={220} height={13} borderRadius={4} style={{ marginBottom: 20 }} />

        {/* Pending Office field */}
        <SkeletonBox width={130} height={16} borderRadius={4} style={{ marginTop: 18, marginBottom: 8 }} />
        <SkeletonBox width="100%" height={46} borderRadius={10} />

        {/* Pending With field */}
        <SkeletonBox width={110} height={16} borderRadius={4} style={{ marginTop: 18, marginBottom: 8 }} />
        <SkeletonBox width="100%" height={46} borderRadius={10} />

        {/* Remark field */}
        <SkeletonBox width={80} height={16} borderRadius={4} style={{ marginTop: 18, marginBottom: 8 }} />
        <SkeletonBox width="100%" height={90} borderRadius={10} />

        {/* Completed toggle row */}
        <View
          style={[
            styles.statusRow,
            { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1 },
          ]}
        >
          <SkeletonBox width={100} height={18} borderRadius={4} />
          <SkeletonBox width={44} height={26} borderRadius={13} />
        </View>

        {/* Save button */}
        <SkeletonBox width="100%" height={52} borderRadius={14} style={{ marginTop: 28 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
  },
});