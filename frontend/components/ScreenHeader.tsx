import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { colors, typography, spacing } from '../utils/theme';
import { useNationStore } from '../store/nationStore';
import { leaningColor, leaningWash } from '../utils/politicalCompass';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export default function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: leaningWash(nation, 0.08), borderBottomColor: tint, borderBottomWidth: 2 },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { borderColor: tint }]} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={tint} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={[styles.sub, { color: tint }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function HeaderIcon({
  name,
  onPress,
  badge,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}) {
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.iconBtn, { borderColor: tint }]} hitSlop={8}>
      <Ionicons name={name} size={20} color={tint} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
  },
  sub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
