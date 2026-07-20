import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { wp, moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

export default function AdminRequestReviewSkeleton() {
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
        <View style={{ marginLeft: 15 }}>
          <HeaderTitleSkeleton width={150} />
        </View>
      </View>

      <View style={{ padding: wp(5.3) }}>
        {/* Status hero */}
        <View style={{ alignItems: 'center', borderRadius: 20, padding: 22, marginBottom: 20, backgroundColor: colors.base.surfaceL2 }}>
          <SkeletonBox width={moderateScale(64)} height={moderateScale(64)} borderRadius={moderateScale(32)} style={{ marginBottom: 12 }} />
          <SkeletonBox width={140} height={16} borderRadius={4} />
        </View>

        {/* Task card */}
        <View style={{ backgroundColor: colors.base.surfaceL1, borderRadius: 18, borderWidth: 1, borderColor: colors.base.border, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <SkeletonBox width={40} height={11} borderRadius={4} />
            <SkeletonBox width={90} height={20} borderRadius={8} />
          </View>
          <SkeletonBox width="70%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
          <SkeletonBox width="50%" height={12} borderRadius={4} />
        </View>

        {/* Deadline comparison card */}
        <View style={{ backgroundColor: colors.base.surfaceL1, borderRadius: 18, borderWidth: 1, borderColor: colors.base.border, padding: 20, marginBottom: 16 }}>
          <SkeletonBox width={140} height={12} borderRadius={4} style={{ marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <SkeletonBox width={moderateScale(40)} height={moderateScale(40)} borderRadius={moderateScale(20)} style={{ marginBottom: 8 }} />
              <SkeletonBox width={60} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
              <SkeletonBox width={80} height={14} borderRadius={4} />
            </View>
            <SkeletonBox width={20} height={20} borderRadius={4} style={{ marginHorizontal: 8 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <SkeletonBox width={moderateScale(40)} height={moderateScale(40)} borderRadius={moderateScale(20)} style={{ marginBottom: 8 }} />
              <SkeletonBox width={70} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
              <SkeletonBox width={80} height={14} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Reason card */}
        <View style={{ backgroundColor: colors.base.surfaceL1, borderRadius: 18, borderWidth: 1, borderColor: colors.base.border, padding: 20, marginBottom: 16 }}>
          <SkeletonBox width={130} height={12} borderRadius={4} style={{ marginBottom: 10 }} />
          <SkeletonBox width="100%" height={14} borderRadius={4} />
          <SkeletonBox width="80%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
        </View>

        {/* Accept / Reject buttons */}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
          <SkeletonBox width="100%" height={moderateScale(54)} borderRadius={14} style={{ flex: 1 }} />
          <SkeletonBox width="100%" height={moderateScale(54)} borderRadius={14} style={{ flex: 1 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}