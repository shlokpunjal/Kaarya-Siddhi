import { useState, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../theme/theme';
import { Theme } from '../theme/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  summary?: string;
  colors: Theme['colors'];
  children: ReactNode;
  last?: boolean;
};

export default function CollapsibleSection({ icon, title, summary, colors, children, last }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrapper, !last && { borderBottomWidth: 1, borderBottomColor: colors.base.border }]}>
      <Pressable style={styles.row} onPress={() => setOpen((prev) => !prev)}>
        <View style={[styles.iconCircle, { backgroundColor: colors.base.surfaceL2 }]}>
          <Ionicons name={icon} size={18} color={colors.brand.accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={[typography.heading3, { color: colors.text.primary }]}>{title}</Text>
          {!open && summary ? (
            <Text style={[typography.label, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.secondary} />
      </Pressable>

      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textCol: { flex: 1 },
  content: { paddingHorizontal: 4, paddingBottom: 18 },
});