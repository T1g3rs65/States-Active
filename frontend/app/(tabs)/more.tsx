import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../utils/theme';
import { TabChrome } from '../../components/ScreenHeader';
import FadeUp from '../../components/FadeUp';
import PressScale from '../../components/PressScale';
import { useNationStore } from '../../store/nationStore';
import { leaningColor, leaningWash } from '../../utils/politicalCompass';

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
      { label: 'Advisors', hint: 'Cabinet and daily jobs', icon: 'people', route: '/(tabs)/advisors' },
      { label: 'Industry', hint: 'Resources and output', icon: 'construct', route: '/(tabs)/industry' },
      { label: 'World Map', hint: 'Borders, cities, timezones', icon: 'globe', route: '/world-map' },
      { label: 'Policies', hint: 'Standing law', icon: 'document-text', route: '/policies' },
    ],
  },
  {
    title: 'World',
    items: [
      { label: 'Rankings', hint: 'Who is on top', icon: 'trophy', route: '/(tabs)/rankings' },
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
  const { nation } = useNationStore();
  const tint = leaningColor(nation);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <TabChrome title="More" subtitle="The rest" />
      <ScrollView contentContainerStyle={styles.menu}>
        {GROUPS.map((group, gi) => (
          <FadeUp key={group.title} delay={gi * 70} style={styles.group}>
            <Text style={[styles.groupTitle, { color: tint }]}>{group.title}</Text>
            <View style={[styles.card, { borderColor: tint }]}>
              {group.items.map((item, i) => (
                <PressScale
                  key={item.route}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.row, i < group.items.length - 1 && styles.rowLine]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: leaningWash(nation, 0.12) }]}>
                    <Ionicons name={item.icon} size={18} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{item.label}</Text>
                    {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </PressScale>
              ))}
            </View>
          </FadeUp>
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
