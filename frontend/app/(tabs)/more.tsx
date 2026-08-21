import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../utils/theme';
import ScreenHeader from '../../components/ScreenHeader';

interface MenuItem {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Realm',
    items: [
      { label: 'Statistics', hint: 'Every national stat', icon: 'stats-chart', route: '/(tabs)/overview' },
      { label: 'Advisors', hint: 'Cabinet and daily jobs', icon: 'people', route: '/(tabs)/advisors' },
      { label: 'Industry', hint: 'Resources and output', icon: 'construct', route: '/(tabs)/industry' },
      { label: 'World Map', hint: 'Borders, cities, timezones', icon: 'globe', route: '/world-map' },
      { label: 'Policies', hint: 'Standing law', icon: 'document-text', route: '/policies' },
    ],
  },
  {
    title: 'World',
    items: [
      { label: 'World News', hint: 'What other nations did', icon: 'newspaper', route: '/world-news' },
      { label: 'Alliances', hint: 'Pacts and diplomacy', icon: 'git-network', route: '/alliances' },
      { label: 'Factions', hint: 'Blocs and vassals', icon: 'flag', route: '/faction-browser' },
      { label: 'War room', hint: 'Declare or manage wars', icon: 'shield', route: '/war-dashboard' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', hint: 'Leader and identity', icon: 'person', route: '/profile' },
      { label: 'Servers', hint: 'This world / others', icon: 'server', route: '/servers' },
    ],
  },
];

export default function More() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScreenHeader title="More" subtitle="Everything else, still here" />
      <ScrollView contentContainerStyle={styles.menu}>
        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, i) => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.row, i < group.items.length - 1 && styles.rowLine]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={18} color={colors.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{item.label}</Text>
                    {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  menu: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.glass.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  hint: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 1,
  },
});
