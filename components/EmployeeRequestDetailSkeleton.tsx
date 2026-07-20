import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

export default function EmployeeRequestDetailSkeleton() {
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
          <HeaderTitleSkeleton width={140} />
        </View>
      </View>

      <View style={{ padding: 25 }}>
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
          }}
        >
          {/* Title + status badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <SkeletonBox width="60%" height={20} borderRadius={4} />
            <SkeletonBox width={80} height={22} borderRadius={10} />
          </View>

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 18 }} />

          {/* Rows */}
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}>
              <SkeletonBox width={18} height={18} borderRadius={9} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <SkeletonBox width={100} height={11} borderRadius={4} />
                <SkeletonBox width="70%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 18 }} />

          {/* Decision / status box */}
          <View
            style={{
              backgroundColor: colors.base.surfaceL2,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <SkeletonBox width={180} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonBox width="90%" height={13} borderRadius={4} />
          </View>
        </View>

        {/* Go Back button */}
        <SkeletonBox width="100%" height={moderateScale(50)} borderRadius={12} style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );
}