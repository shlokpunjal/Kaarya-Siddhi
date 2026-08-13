import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../context/ThemeContext";
import { moderateScale, wp } from "../../../utils/responsive";
import SkeletonBox from "../SkeletonBox";
import HeaderTitleSkeleton from "../HeaderTitleSkeleton";

// alternating left/right, varying widths so it doesn't look like a grid
const BUBBLES: { isOwn: boolean; width: number }[] = [
  { isOwn: false, width: 55 },
  { isOwn: false, width: 40 },
  { isOwn: true, width: 60 },
  { isOwn: false, width: 45 },
  { isOwn: true, width: 35 },
  { isOwn: true, width: 50 },
  { isOwn: false, width: 65 },
];

/** Shown while GET /chat/conversation/{email} loads, before real messages arrive. */
export default function ConversationSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }} edges={["top", "bottom"]}>
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(70),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          gap: 10,
        }}
      >
        <SkeletonBox width={26} height={26} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
        <SkeletonBox width={moderateScale(38)} height={moderateScale(38)} borderRadius={moderateScale(19)} style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
        <View style={{ flex: 1 }}>
          <HeaderTitleSkeleton width={110} />
        </View>
      </View>

      <View style={{ flex: 1, paddingVertical: 14 }}>
        {BUBBLES.map((b, i) => (
          <View
            key={i}
            style={{
              alignSelf: b.isOwn ? "flex-end" : "flex-start",
              marginVertical: 5,
              marginHorizontal: 12,
            }}
          >
            <SkeletonBox
              width={wp(b.width)}
              height={moderateScale(38)}
              borderRadius={moderateScale(16)}
            />
          </View>
        ))}
      </View>

      {/* Input bar placeholder, matches ChatInputBar's real height so there's no layout jump */}
      <View
        style={{
          backgroundColor: colors.base.surfaceL1,
          borderTopWidth: 1,
          borderTopColor: colors.base.border,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 8,
          gap: 6,
        }}
      >
        <SkeletonBox width={24} height={24} borderRadius={12} style={{ marginHorizontal: 8 }} />
        <SkeletonBox width={24} height={24} borderRadius={12} style={{ marginHorizontal: 8 }} />
        <SkeletonBox width="100%" height={moderateScale(38)} borderRadius={moderateScale(19)} style={{ flex: 1 }} />
        <SkeletonBox width={moderateScale(42)} height={moderateScale(42)} borderRadius={moderateScale(21)} />
      </View>
    </SafeAreaView>
  );
}