import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { wp, moderateScale } from '../../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

// Matches app/(task)/complete.tsx and extend-deadline.tsx — header + one
// centered card (title, a text/date field, and a submit button).
export default function TaskActionSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(60),
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 15,
        }}
      >
        <SkeletonBox width={26} height={26} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
        <View style={{ marginLeft: 15 }}>
          <HeaderTitleSkeleton width={150} />
        </View>
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
          {/* Task title, centered */}
          <SkeletonBox width="70%" height={18} borderRadius={5} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <View style={[styles.divider, { backgroundColor: colors.base.border }]} />

          {/* Current deadline / info line */}
          <SkeletonBox width="55%" height={13} borderRadius={4} style={{ marginBottom: 20 }} />

          {/* Text area (feedback) or date field */}
          <SkeletonBox width="100%" height={100} borderRadius={12} style={{ marginBottom: 20 }} />

          {/* Reason field (extend-deadline only, harmless extra row for complete.tsx) */}
          <SkeletonBox width="100%" height={48} borderRadius={12} style={{ marginBottom: 24 }} />

          {/* Submit button */}
          <SkeletonBox width="100%" height={50} borderRadius={14} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: wp(5.3) },
  divider: { height: 1, marginBottom: 16 },
});