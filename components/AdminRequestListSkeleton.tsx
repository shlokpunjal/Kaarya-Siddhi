import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { wp, moderateScale } from '../utils/responsive';
import SkeletonBox from './SkeletonBox';

export default function AdminRequestsListSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ padding: wp(5.3), paddingTop: 4 }}>
      {/* Connection Requests heading */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <SkeletonBox width={16} height={16} borderRadius={8} />
        <SkeletonBox width={160} height={15} borderRadius={4} />
      </View>

      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <SkeletonBox width={moderateScale(44)} height={moderateScale(44)} borderRadius={moderateScale(22)} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="60%" height={15} borderRadius={4} />
            <SkeletonBox width="45%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}

      {/* Extend Deadline Requests heading */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12 }}>
        <SkeletonBox width={16} height={16} borderRadius={8} />
        <SkeletonBox width={190} height={15} borderRadius={4} />
      </View>

      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={8} height={8} borderRadius={4} />
            <SkeletonBox width="55%" height={15} borderRadius={4} />
          </View>
          <SkeletonBox width="85%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}