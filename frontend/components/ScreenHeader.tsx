import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../utils/theme';
import { useNationStore } from '../store/nationStore';
import { leaningColor } from '../utils/politicalCompass';
import LiquidGlass from './LiquidGlass';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

const serif = Platform.OS === 'web' ? { fontFamily: 'Instrument Serif, Georgia, serif' } : {};

export default function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  return (
    <View style={styles.outer}>
      <LiquidGlass radius={999} style={styles.pill}>
        <View style={styles.row}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={tint} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.sub, { color: tint }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      </LiquidGlass>
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
    <TouchableOpacity onPress={onPress} style={styles.iconBtn} hitSlop={8}>
      <Ionicons name={name} size={20} color={tint} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function TabChrome({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: number;
}) {
  const router = useRouter();
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      right={
        <>
          <HeaderIcon name="notifications" onPress={() => router.push('/notifications')} badge={badge} />
          <HeaderIcon name="person-circle" onPress={() => router.push('/profile')} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 36,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.title,
    ...serif,
    color: colors.text.primary,
    letterSpacing: -0.5,
    fontWeight: '400',
    fontSize: 22,
  },
  sub: {
    ...typography.label,
    marginTop: 2,
    letterSpacing: 1.6,
    fontWeight: '500',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
