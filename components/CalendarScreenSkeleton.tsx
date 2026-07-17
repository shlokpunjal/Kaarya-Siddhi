import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SkeletonBox from './SkeletonBox';

export default function CalendarScreenSkeleton() {
  const { colors } = useTheme();
  const { brand, base } = colors;

  return (
    <View style={[styles.container, { backgroundColor: base.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: brand.primary }]}>
        <SkeletonBox width={110} height={24} borderRadius={6} />
      </View>

      {/* Calendar card */}
      <View style={styles.calendarBlock}>
        <View style={[styles.calendarCard, { backgroundColor: base.surfaceL1, borderColor: base.border }]}>
          {/* Month nav */}
          <View style={styles.monthRow}>
            <SkeletonBox width={20} height={28} borderRadius={4} />
            <SkeletonBox width={140} height={26} borderRadius={6} />
            <SkeletonBox width={20} height={28} borderRadius={4} />
          </View>

          <View style={[styles.monthDivider, { backgroundColor: base.border }]} />

          {/* Weekday row */}
          <View style={[styles.weekRow, { borderBottomColor: base.border }]}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.weekDayCell}>
                <SkeletonBox width={14} height={10} borderRadius={3} />
              </View>
            ))}
          </View>

          {/* Grid — 6 rows x 7 cols */}
          <View>
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <View
                key={rowIdx}
                style={[
                  styles.gridRow,
                  { borderBottomColor: base.border },
                  rowIdx === 5 && { borderBottomWidth: 0 },
                ]}
              >
                {Array.from({ length: 7 }).map((_, colIdx) => (
                  <View
                    key={colIdx}
                    style={[styles.cell, { borderRightColor: base.border, borderRightWidth: colIdx === 6 ? 0 : 1 }]}
                  >
                    <SkeletonBox width={14} height={12} borderRadius={3} />
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={[styles.legend, { borderTopColor: base.border }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.legendItem}>
                <SkeletonBox width={7} height={7} borderRadius={4} />
                <SkeletonBox width={40} height={10} borderRadius={3} style={{ marginLeft: 4 }} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Task section */}
      <View style={styles.taskSection}>
        <SkeletonBox width={60} height={16} borderRadius={4} style={{ marginBottom: 10 }} />
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.taskCard, { backgroundColor: base.surfaceL1, borderColor: base.border }]}
          >
            <View style={styles.taskCardHeader}>
              <SkeletonBox width="55%" height={14} borderRadius={4} />
              <SkeletonBox width={60} height={18} borderRadius={20} />
            </View>
            <SkeletonBox width="85%" height={11} borderRadius={3} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingLeft: 20,
    marginTop: Platform.OS === 'android' ? 36 : 44,
  },
  calendarBlock: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  calendarCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  monthDivider: { height: 1, marginBottom: 8 },
  weekRow: { flexDirection: 'row', borderBottomWidth: 1 },
  weekDayCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1 },
  cell: { flex: 1, height: 46, justifyContent: 'center', alignItems: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 7, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  taskSection: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  taskCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});