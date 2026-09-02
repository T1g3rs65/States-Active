import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../utils/theme';
import { TabChrome } from '../../components/ScreenHeader';
import FadeUp from '../../components/FadeUp';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import PressScale from '../../components/PressScale';
import ScreenCanvas from '../../components/ScreenCanvas';
import { useNationStore } from '../../store/nationStore';
import { useAccountStore } from '../../store/accountStore';
import LiquidGlass from '../../components/LiquidGlass';
import { leaningColor } from '../../utils/politicalCompass';
import { api } from '../../utils/api';

interface MenuItem {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function More() {
  const router = useRouter();
  const { nation } = useNationStore();
  const { user, loadSession } = useAccountStore();
  const tint = leaningColor(nation);
  const [visit, setVisit] = useState(0);
  const [activeWar, setActiveWar] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadSession();
      setVisit((v) => v + 1);
      const nid = nation?.id || nation?._id;
      if (!nid) {
        setActiveWar(null);
        return;
      }
      api.getNationActiveWar(nid).then((res: any) => {
        setActiveWar(res?.war || null);
      }).catch(() => setActiveWar(null));
    }, [nation?.id, nation?._id])
  );

  const signedIn = !!(user?.id);
  const isAdmin = !!user?.is_admin;
  const nationId = nation?.id || nation?._id;

  const realmItems: MenuItem[] = [
    { label: 'World Map', hint: 'Borders, cities, timezones', icon: 'globe', route: '/world-map' },
    { label: 'Policies', hint: 'Standing law', icon: 'document-text', route: '/policies' },
  ];

  const worldItems: MenuItem[] = [
    { label: 'World News', hint: 'What other nations did', icon: 'newspaper', route: '/world-news' },
    { label: 'Alliances', hint: 'Pacts and diplomacy', icon: 'git-network', route: '/alliances' },
    { label: 'Factions', hint: 'Blocs and vassals', icon: 'flag', route: '/faction-browser' },
    { label: 'Political Compass', hint: 'Where your nation sits', icon: 'compass', route: '/compass' },
    { label: 'Other nations', hint: 'Their page and stats vs yours', icon: 'people', route: '/other-nations' },
    ...(activeWar
      ? ([{
          label: 'War room',
          hint: 'Active campaign',
          icon: 'shield' as const,
          route: `/war-dashboard?warId=${activeWar._id || activeWar.id}&nationId=${nationId}`,
        }] as MenuItem[])
      : []),
  ];

  const accountItems: MenuItem[] = signedIn
    ? [
        { label: 'Profile', hint: 'Leader and identity', icon: 'person', route: '/profile' },
        { label: 'Worlds', hint: 'This world / others', icon: 'globe', route: '/servers' },
        ...(isAdmin
          ? ([{ label: 'Admin', hint: 'Worlds, players, bans', icon: 'shield-checkmark' as const, route: '/admin' }] as MenuItem[])
          : []),
      ]
    : [{ label: 'Sign in', hint: 'Email account', icon: 'log-in', route: '/signin' }];

  const groups = [
    { title: 'Realm', items: realmItems },
    { title: 'World', items: worldItems },
    { title: 'Account', items: accountItems },
  ];

  return (
    <ScreenCanvas>
    <View style={styles.container}>
      <TabChrome title="More" subtitle="The rest" />
      <ScrollView contentContainerStyle={styles.menu}>
        {groups.map((group, gi) => (
          <FadeUp key={`${group.title}-${visit}`} delay={gi * 70} style={styles.group}>
            <Text style={[styles.groupTitle, { color: tint }]}>{group.title}</Text>
            <LiquidGlass radius={28} style={styles.card}>
              {group.items.map((item, i) => (
                <PressScale
                  key={item.route}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.row, i < group.items.length - 1 && styles.rowLine]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={18} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{item.label}</Text>
                    {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </PressScale>
              ))}
            </LiquidGlass>
          </FadeUp>
        ))}
      </ScrollView>
    </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
