import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { wp, hp, moderateScale } from '../../../utils/responsive';
import SkeletonBox from '../SkeletonBox';

export default function DashboardSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingRight: wp(4),
          }}
        >
          <View>
            <SkeletonBox
              width={100}
              height={16}
              borderRadius={4}
              style={{ marginTop: hp(2.5), marginLeft: wp(4) }}
            />
            <SkeletonBox
              width={180}
              height={22}
              borderRadius={6}
              style={{ marginTop: 5, marginLeft: wp(4) }}
            />
          </View>
          <SkeletonBox
            width={moderateScale(48)}
            height={moderateScale(48)}
            borderRadius={moderateScale(24)}
            style={{ marginTop: hp(2.7) }}
          />
        </View>

        {/* Metrics matrix */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            marginTop: hp(3),
            marginHorizontal: wp(5.3),
            height: moderateScale(140),
            borderRadius: 25,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            borderColor: colors.base.border,
            borderWidth: 1.5,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <SkeletonBox
                width={moderateScale(63)}
                height={moderateScale(63)}
                borderRadius={moderateScale(40)}
              />
              <SkeletonBox width={50} height={12} borderRadius={4} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>

        {/* Add task button */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginHorizontal: wp(8.8), flex: 1 }}>
            <SkeletonBox
              width="100%"
              height={moderateScale(60)}
              borderRadius={32}
              style={{ marginTop: 24 }}
            />
          </View>
        </View>

        {/* Accordion cards */}
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              marginHorizontal: wp(8.8),
              marginTop: i === 0 ? hp(3.3) : hp(2.5),
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 19,
              backgroundColor: colors.base.surfaceL1,
            }}
          >
            <View
              style={{
                height: moderateScale(60),
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
              }}
            >
              <SkeletonBox width={80} height={18} borderRadius={4} />
              <SkeletonBox width={30} height={30} borderRadius={10} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}