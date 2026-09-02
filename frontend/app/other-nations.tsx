import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { leaningColor } from '../utils/politicalCompass';
import { colors, typography, spacing } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import PressScale from '../components/PressScale';
import EmptyNation from '../components/EmptyNation';
import StatusDots from '../components/StatusDots';

type Row = {
  nation_id: string;
  nation_name: string;
  flag_base64?: string | null;
  display_name?: string;
  government_subtype?: string;
};

function Flag({ flag }: { flag?: string | null }) {
  if (!flag) {
    return (
      <View style={styles.flagFallback}>
        <Ionicons name="flag-outline" size={16} color={colors.text.muted} />
      </View>
    );
  }
  if (flag.includes('svg')) {
    const b64 = flag.split('base64,')[1];
    if (!b64) return null;
    return <SvgXml xml={atob(b64)} width={40} height={26} />;
  }
  return <Image source={{ uri: flag }} style={styles.flagImg} resizeMode="contain" />;
}

export default function OtherNations() {
  const router = useRouter();
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  const mine = nation?.id || nation?._id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!mine) return;
    try {
      const worldId = (nation as any)?.world_id;
      const res = await api.getRankings('gdp', 100, worldId);
      const list = (res?.rankings || []) as any[];
      setRows(
        list
          .map((e) => ({
            nation_id: String(e.nation_id || e.id || e._id || ''),
            nation_name: e.nation_name || e.name || 'Unknown',
            flag_base64: e.flag_base64,
            display_name: e.display_name,
            government_subtype: e.government_subtype,
          }))
          .filter((e) => e.nation_id && e.nation_id !== String(mine)),
      );
    } catch (e) {
      console.error('other nations', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [mine]),
  );

  if (!nation) return <EmptyNation />;

  return (
    <ScreenCanvas>
      <View style={styles.wrap}>
        <ScreenHeader
          title="Other nations"
          subtitle="Compare mode"
          onBack={() => router.back()}
        />
        {loading ? (
          <View style={styles.center}>
            <StatusDots status="Loading" color={tint} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={tint} />
            }
          >
            {rows.length === 0 ? (
              <Text style={styles.empty}>No other nations in this world yet.</Text>
            ) : (
              <LiquidGlass radius={28} style={styles.card}>
                {rows.map((row, i) => (
                  <PressScale
                    key={row.nation_id}
                    onPress={() => router.push(`/compare?nationId=${row.nation_id}` as any)}
                    style={[styles.row, i < rows.length - 1 && styles.rowLine]}
                  >
                    <Flag flag={row.flag_base64} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{row.nation_name}</Text>
                      <Text style={styles.hint} numberOfLines={1}>
                        {row.display_name || row.government_subtype || 'Nation'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                  </PressScale>
                ))}
              </LiquidGlass>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 40 },
  card: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { ...typography.body, fontWeight: '600', color: colors.text.primary },
  hint: { ...typography.small, color: colors.text.muted, marginTop: 1 },
  empty: { ...typography.body, color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  flagImg: { width: 40, height: 26, borderRadius: 4 },
  flagFallback: {
    width: 40,
    height: 26,
    borderRadius: 4,
    backgroundColor: colors.glass.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
