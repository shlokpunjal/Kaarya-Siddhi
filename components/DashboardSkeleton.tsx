import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

export default function DashboardSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header row */}
      <View style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingRight: 15,
      }}>
        <View>
          <SkeletonBox width={100} height={16} borderRadius={4} style={{ marginTop: 20, marginLeft: 15 }} />
          <SkeletonBox width={180} height={22} borderRadius={6} style={{ marginTop: 8, marginLeft: 15 }} />
        </View>
        <SkeletonBox width={48} height={48} borderRadius={24} style={{ marginTop: 22 }} />
      </View>

      {/* Metrics matrix */}
      <View style={{
        backgroundColor: colors.base.surfaceL1, marginTop: 25, margin: 20, height: 140, borderRadius: 25,
        flexDirection: "row", alignItems: "center", justifyContent: "space-around",
        borderColor: colors.base.border, borderWidth: 1.5,
      }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <SkeletonBox width={63} height={63} borderRadius={40} />
            <SkeletonBox width={50} height={12} borderRadius={4} style={{ marginTop: 10 }} />
          </View>
        ))}
      </View>

      {/* Add task button */}
      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ marginLeft: 33, flex: 1, marginRight: 33 }}>
          <SkeletonBox width="100%" height={60} borderRadius={32} />
        </View>
      </View>

      {/* Accordion cards */}
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 320,
            marginTop: i === 0 ? 25 : 20,
            marginLeft: 23,
            borderColor: colors.base.border,
            borderWidth: 1,
            borderRadius: 19,
            backgroundColor: colors.base.surfaceL1,
          }}
        >
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <SkeletonBox width={80} height={18} borderRadius={4} />
            <SkeletonBox width={30} height={30} borderRadius={10} />
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
}