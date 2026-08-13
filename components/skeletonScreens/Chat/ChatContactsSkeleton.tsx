import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../context/ThemeContext";
import { moderateScale } from "../../../utils/responsive";
import SkeletonBox from "../SkeletonBox";
import HeaderTitleSkeleton from "../HeaderTitleSkeleton";

/** Shown the instant the chat icon is tapped, while /chat/contacts loads. */
export default function ChatContactsSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }} edges={["top"]}>
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(70),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <SkeletonBox width={26} height={26} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <HeaderTitleSkeleton width={80} />
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={{ paddingTop: 4 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: moderateScale(20),
              paddingVertical: moderateScale(12),
              gap: 14,
            }}
          >
            <SkeletonBox width={moderateScale(52)} height={moderateScale(52)} borderRadius={moderateScale(26)} />
            <View
              style={{
                flex: 1,
                borderBottomWidth: 1,
                borderBottomColor: colors.base.border,
                paddingBottom: moderateScale(12),
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <SkeletonBox width={120} height={15} borderRadius={4} />
                <SkeletonBox width={40} height={11} borderRadius={4} />
              </View>
              <SkeletonBox width="70%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}