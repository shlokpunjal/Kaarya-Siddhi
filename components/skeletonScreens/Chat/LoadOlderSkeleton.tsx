import { View } from "react-native";
import { moderateScale, wp } from "../../../utils/responsive";
import SkeletonBox from "../SkeletonBox";

/** Shown inline at the top of the message list while older messages
 * (pagination) are loading — replaces a plain spinner so it matches
 * ConversationSkeleton's bubble language instead of switching styles. */
export default function LoadOlderSkeleton() {
  return (
    <View style={{ paddingVertical: 10 }}>
      <View style={{ alignSelf: "flex-start", marginVertical: 4, marginHorizontal: 12 }}>
        <SkeletonBox width={wp(45)} height={moderateScale(34)} borderRadius={moderateScale(16)} />
      </View>
      <View style={{ alignSelf: "flex-end", marginVertical: 4, marginHorizontal: 12 }}>
        <SkeletonBox width={wp(35)} height={moderateScale(34)} borderRadius={moderateScale(16)} />
      </View>
    </View>
  );
}