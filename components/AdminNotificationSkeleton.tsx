import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/theme';
import { moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';
import HeaderTitleSkeleton from './HeaderTitleSkeleton';

export default function AdminNotificationsSkeleton() {
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
          <HeaderTitleSkeleton width={130} />
        </View>
      </View>

      <View style={{ padding: 20 }}>
        {/* Requests box */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <SkeletonBox width={moderateScale(40)} height={moderateScale(40)} borderRadius={moderateScale(20)} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width={90} height={16} borderRadius={4} />
            <SkeletonBox width={170} height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Other Notifications header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12 }}>
          <SkeletonBox width={18} height={18} borderRadius={9} />
          <SkeletonBox width={150} height={16} borderRadius={4} />
        </View>

        {/* Notification cards */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              gap: 12,
            }}
          >
            <SkeletonBox width={20} height={20} borderRadius={10} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="85%" height={14} borderRadius={4} />
              <SkeletonBox width={90} height={11} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});