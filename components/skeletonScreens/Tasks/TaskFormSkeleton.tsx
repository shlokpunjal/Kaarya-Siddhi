import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { wp, hp, moderateScale } from '../../../utils/responsive';
import SkeletonBox from '../SkeletonBox';
import HeaderTitleSkeleton from '../HeaderTitleSkeleton';

// Matches app/(task)/newtask.tsx and newtaskemp.tsx while fetchingTask is true
// (edit mode only) — header + stacked form-field bars inside the input card.
export default function TaskFormSkeleton() {
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
          paddingHorizontal: 18,
        }}
      >
        <SkeletonBox width={28} height={28} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <HeaderTitleSkeleton width={110} />
        </View>
        <SkeletonBox width={22} height={22} borderRadius={5} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
      </View>

      <View style={{ padding: wp(6.4) }}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              marginTop: hp(3.7),
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
                android: { elevation: 5 },
              }),
            },
          ]}
        >
          {/* Task name */}
          <SkeletonBox width="100%" height={48} borderRadius={12} style={styles.field} />
          {/* Assign to */}
          <SkeletonBox width="100%" height={48} borderRadius={12} style={styles.field} />
          {/* Priority / label row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <SkeletonBox width="48%" height={48} borderRadius={12} style={styles.field} />
            <SkeletonBox width="48%" height={48} borderRadius={12} style={styles.field} />
          </View>
          {/* Deadline picker */}
          <SkeletonBox width="100%" height={48} borderRadius={12} style={styles.field} />
          {/* Description */}
          <SkeletonBox width="100%" height={100} borderRadius={12} style={styles.field} />
          {/* Attachment row */}
          <SkeletonBox width="100%" height={48} borderRadius={12} style={styles.field} />
        </View>

        {/* Submit button */}
        <SkeletonBox width="100%" height={52} borderRadius={14} style={{ marginTop: 24 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: wp(5.3) },
  field: { marginBottom: 16 },
});