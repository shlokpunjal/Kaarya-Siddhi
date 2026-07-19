import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

export default function EofficeListSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingBottom: 24 }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}
        >
          <View style={{ flex: 1 }}>
            <SkeletonBox width="55%" height={16} borderRadius={4} />
            <SkeletonBox width="75%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
          <SkeletonBox width={44} height={26} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
});