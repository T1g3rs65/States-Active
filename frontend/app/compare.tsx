import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { getRaceTheme, getRaceName } from '../utils/raceColors';
import { leaningColor } from '../utils/politicalCompass';
import { govOperatingBlurb } from '../utils/govOperating';
import { govFrictionRows } from '../utils/wheelFriction';
import { leaderTitle } from '../utils/governmentTitles';
import { colors, typography, spacing, radii } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import StatusDots from '../components/StatusDots';
import EmptyNation from '../components/EmptyNation';
import { exchangeRate, formatFx, currencyLabel } from '../utils/exchangeRate';

type Tab = 'nation' | 'stats';

const COMPARE_GROUPS: { title: string; keys: { key: string; label: string; inverse?: boolean; money?: boolean; digits?: number; suffix?: string }[] }[] = [
  {
    title: 'Economy',
    keys: [
      { key: 'gdp', label: 'GDP', money: true },
      { key: 'economy_growth', label: 'Growth', suffix: '%' },
      { key: 'unemployment', label: 'Unemployment', inverse: true, suffix: '%' },
      { key: 'inflation', label: 'Inflation', inverse: true, suffix: '%' },
    ],
  },
  {
    title: 'Freedoms',
    keys: [
      { key: 'civil_rights', label: 'Civil Rights' },
      { key: 'political_freedom', label: 'Political Freedom' },
      { key: 'voting_rights', label: 'Voting Rights' },
      { key: 'freedom_speech', label: 'Free Speech' },
      { key: 'freedom_press', label: 'Free Press' },
      { key: 'freedom_assembly', label: 'Assembly' },
      { key: 'freedom_religion', label: 'Religion' },
      { key: 'corruption', label: 'Corruption', inverse: true },
      { key: 'political_apathy', label: 'Apathy', inverse: true },
    ],
  },
  {
    title: 'Society',
    keys: [
      { key: 'happiness', label: 'Happiness' },
      { key: 'life_expectancy', label: 'Life Expectancy', suffix: ' yrs' },
      { key: 'obesity_rate', label: 'Obesity', inverse: true, suffix: '%' },
      { key: 'healthcare_quality', label: 'Healthcare' },
      { key: 'literacy_rate', label: 'Literacy', suffix: '%' },
      { key: 'income_equality', label: 'Equality' },
      { key: 'gini_coefficient', label: 'Gini', inverse: true, digits: 3 },
    ],
  },
  {
    title: 'Land',
    keys: [
      { key: 'environment', label: 'Environment' },
      { key: 'pollution', label: 'Pollution', inverse: true },
      { key: 'biodiversity', label: 'Biodiversity' },
      { key: 'eco_footprint', label: 'Eco Footprint', inverse: true },
    ],
  },
  {
    title: 'Order',
    keys: [
      { key: 'crime_rate', label: 'Crime', inverse: true },
      { key: 'law_enforcement', label: 'Law' },
      { key: 'military_strength', label: 'Military' },
      { key: 'international_approval', label: 'Approval' },
    ],
  },
  {
    title: 'Science',
    keys: [
      { key: 'scientific_advancement', label: 'Science' },
      { key: 'university_attendance', label: 'University', suffix: '%' },
    ],
  },
  {
    title: 'People',
    keys: [
      { key: 'population', label: 'Population', suffix: 'k', digits: 1 },
      { key: 'population_growth', label: 'Pop. Growth', suffix: '%' },
    ],
  },
  {
    title: 'Budget',
    keys: [
      { key: 'tax_rate', label: 'Tax Rate', suffix: '%' },
      { key: 'tax_revenue', label: 'Tax Take', suffix: '% GDP' },
      { key: 'national_debt', label: 'Debt', suffix: '% GDP' },
      { key: 'budget_education', label: 'Education', suffix: '%' },
      { key: 'budget_defense', label: 'Defense', suffix: '%' },
      { key: 'budget_healthcare', label: 'Health spend', suffix: '%' },
      { key: 'budget_welfare', label: 'Welfare', suffix: '%' },
      { key: 'budget_environment', label: 'Green spend', suffix: '%' },
      { key: 'budget_infrastructure', label: 'Infrastructure', suffix: '%' },
      { key: 'budget_other', label: 'Other spend', suffix: '%' },
    ],
  },
];

function fmtStat(value: any, digits = 1, suffix = '', money = false) {
  if (money) return value ?? '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}${suffix}`;
}

function Flag({ flag, size = 120 }: { flag?: string | null; size?: number }) {
  if (!flag) return null;
  const h = Math.round(size * 0.66);
  if (flag.includes('svg')) {
    const b64 = flag.split('base64,')[1];
    if (!b64) return null;
    return <SvgXml xml={atob(b64)} width={size} height={h} />;
  }
  return <Image source={{ uri: flag }} style={{ width: size, height: h }} resizeMode="contain" />;
}

export default function Compare() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { nation: myNation } = useNationStore();
  const [them, setThem] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('nation');
  const [info, setInfo] = useState<string | null>(null);

  const otherId = String(params.nationId || '');
  const myTint = leaningColor(myNation);
  const theirTint = leaningColor(them);

  useEffect(() => {
    if (!otherId) return;
    (async () => {
      try {
        const [n, p] = await Promise.all([
          api.getNation(otherId),
          api.getPolicies(otherId).catch(() => ({ policies: [] })),
        ]);
        if (n.success) setThem(n.nation);
        setPolicies(p?.policies || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [otherId]);

  if (!myNation) return <EmptyNation />;
  if (loading || !them) {
    return (
      <ScreenCanvas>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <StatusDots status="Loading" color={myTint} />
        </View>
      </ScreenCanvas>
    );
  }

  const myTheme = getRaceTheme(myNation.race);
  const theirTheme = getRaceTheme(them.race);
  const myStats: any = myNation.stats || {};
  const theirStats: any = them.stats || {};

  const showGov = () => {
    const blurb =
      govOperatingBlurb(them) ||
      'No operating brief for this exact mix yet.';
    const fric = govFrictionRows(them)
      .map((r) => `${r.label}\n+ ${r.plus}\n− ${r.minus}`)
      .join('\n\n');
    setInfo(fric ? `${blurb}\n\n${fric}` : blurb);
  };

  const openGraph = (stat: string, label: string) => {
    router.push({
      pathname: '/stat-detail',
      params: { stat, label, otherId, otherName: them.name },
    });
  };

  const created = them.created_at ? new Date(them.created_at) : null;
  const myCur = currencyLabel(myNation.name, myNation.currency);
  const theirCur = currencyLabel(them.name, them.currency);
  const fx = exchangeRate(
    Number(myStats.gdp ?? 20),
    Number(myStats.inflation ?? 2),
    Number(theirStats.gdp ?? 20),
    Number(theirStats.inflation ?? 2),
  );
  const fxLine = `1 ${myCur} ≈ ${formatFx(fx)} ${theirCur}`;
  const fxRev = `1 ${theirCur} ≈ ${formatFx(fx > 0 ? 1 / fx : 0)} ${myCur}`;

  return (
    <ScreenCanvas>
      <View style={styles.wrap}>
        <ScreenHeader
          title={them.name}
          subtitle={`vs ${myNation.name}`}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/nation');
        }}
        />
        <View style={styles.tabs}>
          {(['nation', 'stats'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && { backgroundColor: myTint }]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'nation' ? 'Nation' : 'Stats'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'nation' ? (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.hero}>
              <Flag flag={them.flag_base64} size={140} />
              <Text style={styles.nationName}>{them.name}</Text>
              <Text style={[styles.gov, { color: theirTint }]}>
                {them.display_name || them.government_subtype || them.name}
              </Text>
              <Text style={styles.race}>{getRaceName(them.race)}</Text>
              {them.motto ? <Text style={styles.motto}>“{them.motto}”</Text> : null}
              <TouchableOpacity onPress={showGov} style={styles.govBtn}>
                <Ionicons name="information-circle-outline" size={16} color={theirTint} />
                <Text style={[styles.govBtnText, { color: theirTint }]}>Government info</Text>
              </TouchableOpacity>
            </View>

            {them.government_form !== 'anarchy' && them.leader_name ? (
              <LiquidGlass radius={22} style={styles.block}>
                <Text style={styles.blockLabel}>Leader</Text>
                <Text style={styles.leaderTitle}>
                  {leaderTitle({
                    subtype: them.government_subtype,
                    territorial: them.territorial_structure,
                    race: them.race,
                    leaderName: them.leader_name,
                  })}
                </Text>
                <Text style={styles.leaderName}>{them.leader_name}</Text>
                {them.co_leader_name ? (
                  <Text style={styles.leaderName}>Co-leader: {them.co_leader_name}</Text>
                ) : null}
              </LiquidGlass>
            ) : null}

            {them.description ? (
              <LiquidGlass radius={22} style={styles.block}>
                <Text style={styles.blockLabel}>National description</Text>
                <Text style={styles.desc}>{them.description}</Text>
              </LiquidGlass>
            ) : null}

            <LiquidGlass radius={22} style={styles.block}>
              <Text style={styles.blockLabel}>Realm</Text>
              <Text style={styles.meta}>Currency: {them.currency || '—'}</Text>
              <Text style={styles.meta}>
                Inflation: {Number(theirStats.inflation ?? 0).toFixed(1)}% · yours {Number(myStats.inflation ?? 0).toFixed(1)}%
              </Text>
              <Text style={styles.meta}>{fxLine}</Text>
              <Text style={styles.meta}>{fxRev}</Text>
              <Text style={styles.hint}>
                Rate from income (GDP per person) and inflation. Richer / lower inflation → stronger unit. Same word like Credits is still two different moneys.
              </Text>
              <Text style={styles.meta}>Animal: {them.national_animal || '—'}</Text>
              {created ? <Text style={styles.meta}>Founded: {format(created, 'MMM d, yyyy')}</Text> : null}
              <Text style={styles.meta}>Decisions: {them.total_decisions ?? 0}</Text>
            </LiquidGlass>

            <LiquidGlass radius={22} style={styles.block}>
              <Text style={styles.blockLabel}>Policies</Text>
              {policies.length === 0 ? (
                <Text style={styles.meta}>No standing laws yet.</Text>
              ) : (
                policies.map((p, i) => (
                  <View key={i} style={styles.policy}>
                    <Text style={styles.policyName}>{p.name}</Text>
                    <Text style={styles.policyBody}>{p.news_snippet || p.short_description}</Text>
                  </View>
                ))
              )}
            </LiquidGlass>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.legend}>
              <View style={[styles.dot, { backgroundColor: myTint }]} />
              <Text style={styles.legendText}>{myNation.name}</Text>
              <View style={[styles.dot, { backgroundColor: theirTint, marginLeft: 14 }]} />
              <Text style={styles.legendText}>{them.name}</Text>
            </View>
            <Text style={styles.hint}>Tap a row to open the line graph for both nations.</Text>
            <LiquidGlass radius={16} style={styles.statRow}>
              <Text style={[styles.statMine, { color: myTint }]} numberOfLines={2}>{myCur}</Text>
              <Text style={styles.statLabel}>FX{'\n'}{fxLine}</Text>
              <Text style={[styles.statTheirs, { color: theirTint }]} numberOfLines={2}>{theirCur}</Text>
            </LiquidGlass>
            {COMPARE_GROUPS.map((group) => (
              <View key={group.title}>
                <Text style={styles.group}>{group.title}</Text>
                {group.keys.map((row) => {
                  const mine = row.money ? myNation.gdp_display : myStats[row.key];
                  const theirs = row.money ? them.gdp_display : theirStats[row.key];
                  return (
                    <TouchableOpacity key={row.key} onPress={() => openGraph(row.key, row.label)} activeOpacity={0.8}>
                      <LiquidGlass radius={16} style={styles.statRow}>
                        <Text style={[styles.statMine, { color: myTint }]}>
                          {fmtStat(mine, row.digits ?? 1, row.suffix || '', !!row.money)}
                        </Text>
                        <Text style={styles.statLabel}>{row.label}</Text>
                        <Text style={[styles.statTheirs, { color: theirTint }]}>
                          {fmtStat(theirs, row.digits ?? 1, row.suffix || '', !!row.money)}
                        </Text>
                      </LiquidGlass>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}

        {info ? (
          <TouchableOpacity style={styles.modalScrim} activeOpacity={1} onPress={() => setInfo(null)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{them.display_name || them.government_subtype}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                <Text style={styles.modalBody}>{info}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalOk} onPress={() => setInfo(null)}>
                <Text style={styles.modalOkText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText: { ...typography.label, color: colors.text.muted },
  tabTextOn: { color: '#08090A', fontWeight: '700' },
  body: { padding: spacing.md, paddingBottom: 48, gap: 12 },
  hero: { alignItems: 'center', marginBottom: 8 },
  nationName: { ...typography.display, color: colors.text.primary, marginTop: 10, textAlign: 'center' },
  gov: { ...typography.body, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  race: { ...typography.small, color: colors.text.muted, marginTop: 2 },
  motto: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  govBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  govBtnText: { ...typography.small, fontWeight: '600' },
  block: { padding: 14 },
  blockLabel: { ...typography.label, color: colors.text.muted, marginBottom: 8 },
  leaderTitle: { color: colors.accent.gold, fontWeight: '600', marginBottom: 4 },
  leaderName: { ...typography.body, color: colors.text.primary },
  desc: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  meta: { ...typography.body, color: colors.text.secondary, marginBottom: 4 },
  policy: { marginBottom: 10 },
  policyName: { ...typography.body, fontWeight: '600', color: colors.text.primary },
  policyBody: { ...typography.small, color: colors.text.secondary, marginTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.small, color: colors.text.primary, marginLeft: 6 },
  hint: { ...typography.small, color: colors.text.muted, marginBottom: 8 },
  group: { ...typography.label, color: colors.text.muted, marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statMine: { width: 88, fontWeight: '700', fontSize: 13 },
  statTheirs: { width: 88, fontWeight: '700', fontSize: 13, textAlign: 'right' },
  statLabel: { flex: 1, textAlign: 'center', color: colors.text.primary, fontWeight: '600' },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#12151A',
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { ...typography.headline, color: colors.text.primary, marginBottom: 10 },
  modalBody: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  modalOk: { marginTop: 14, alignSelf: 'flex-end' },
  modalOkText: { color: colors.text.primary, fontWeight: '700' },
});
