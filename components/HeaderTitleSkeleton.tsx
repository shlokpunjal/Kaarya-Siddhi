import { View, StyleSheet } from 'react-native';
import { moderateScale } from '../utils/responsive';

type Props = {
  width?: number;
};

// Uses a semi-transparent white box instead of SkeletonBox, since
// SkeletonBox's surfaceL2 color is designed for light card backgrounds,
// not colored headers like brand.primary.
export default function HeaderTitleSkeleton({ width = 140 }: Props) {
  return <View style={[styles.box, { width: moderateScale(width) }]} />;
}

const styles = StyleSheet.create({
  box: {
    height: moderateScale(22),
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});