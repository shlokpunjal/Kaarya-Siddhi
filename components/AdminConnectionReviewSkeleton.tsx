import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { wp, moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

export default function AdminConnectionReviewSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
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
        <View style={{ marginLeft: moderateScale(15) }}>
          <HeaderTitleSkeleton width={170} />
        </View>
      </View>

      <View style={{ padding: wp(5.3) }}>
        {/* Status hero */}
        <View style={{ alignItems: 'center', borderRadius: 20, padding: 22, marginBottom: 20, backgroundColor: colors.base.surfaceL2 }}>
          <SkeletonBox width={moderateScale(64)} height={moderateScale(64)} borderRadius={moderateScale(32)} style={{ marginBottom: 12 }} />
          <SkeletonBox width={140} height={16} borderRadius={4} />
        </View>

        {/* Employee card */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 22,
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <SkeletonBox width={moderateScale(72)} height={moderateScale(72)} borderRadius={moderateScale(36)} style={{ marginBottom: 14 }} />
          <SkeletonBox width={150} height={16} borderRadius={4} />
          <SkeletonBox width={170} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>

        {/* Accept / Reject buttons */}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <SkeletonBox width="100%" height={moderateScale(54)} borderRadius={14} style={{ flex: 1 }} />
          <SkeletonBox width="100%" height={moderateScale(54)} borderRadius={14} style={{ flex: 1 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}