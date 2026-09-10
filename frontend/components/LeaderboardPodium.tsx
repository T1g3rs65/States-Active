import { View, Text, StyleSheet, Platform, Image, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import LiquidGlass from './LiquidGlass';
import { leaningColor, mixIntoDark, hexAlpha } from '../utils/politicalCompass';

export interface PodiumEntry {
  userId?: string;
  userName: string;
  rank: number;
  value: number | string;
  flag_base64?: string | null;
  government_subtype?: string;
  display_name?: string;
  race?: string;
  faction_tag?: string;
  faction_color?: string;
}

export interface LeaderboardEntry {
  nation_id?: string;
  nation_name: string;
  rank: number;
  value: number | string;
  stat_value?: number;
  stat_value_display?: string;
  flag_base64?: string | null;
  government_subtype?: string;
  display_name?: string;
  race?: string;
  faction_tag?: string;
  faction_color?: string;
  resource_tiles?: number;
  unique_resources?: number;
}

const MEDAL_COLORS = ['#FCD34D', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
const PODIUM_HEIGHTS = [100, 78, 64]; // 1st tallest, 2nd, 3rd

function renderFlag(flagBase64?: string | null, size = 28) {
  if (!flagBase64) return null;
  const isSvg = flagBase64.includes('svg');
  if (isSvg) {
    const base64Data = flagBase64.split('base64,')[1];
    if (!base64Data) return null;
    const svgString = atob(base64Data);
    return <SvgXml xml={svgString} width={size} height={size * 0.66} style={styles.flagIcon} />;
  }
  return <Image source={{ uri: flagBase64 }} style={[styles.flagIcon, { width: size, height: size * 0.66 }]} resizeMode="contain" />;
}

export function LeaderboardPodium({
  entries,
  currentNationId,
  themeColor,
  onEntryPress,
}: {
  entries: PodiumEntry[];
  currentNationId?: string;
  themeColor?: string;
  onEntryPress?: (nationId: string) => void;
}) {
  if (entries.length === 0) return null;

  // Order for display: 2nd, 1st, 3rd (visual podium)
  const order = [1, 0, 2].filter((i) => entries[i]);
  const accent = themeColor || '#F3F6FA';

  return (
    <View style={styles.podiumRow}>
      {order.map((idx) => {
        const entry = entries[idx];
        if (!entry) return null;
        const height = PODIUM_HEIGHTS[idx] ?? 56;
        const medalColor = MEDAL_COLORS[idx] ?? 'rgba(243,246,250,0.4)';
        const isYou = currentNationId && (entry as any).nation_id === currentNationId;

        const nid = (entry as any).nation_id as string | undefined;
        const Col: any = onEntryPress && nid ? TouchableOpacity : View;
        const colProps = onEntryPress && nid ? { onPress: () => onEntryPress(nid), activeOpacity: 0.85 } : {};

        return (
          <Col key={idx} style={styles.podiumColumn} {...colProps}>
            <View style={styles.podiumHeader}>
              {renderFlag(entry.flag_base64, 24)}
              <Text style={[styles.podiumName, isYou && { color: accent }]} numberOfLines={2}>
                {entry.userName}
              </Text>
              {entry.faction_tag && (
                <View style={[styles.factionTag, { backgroundColor: entry.faction_color || accent }]}>
                  <Text style={styles.factionTagText}>{entry.faction_tag}</Text>
                </View>
              )}
            </View>

            {/* Rank medallion */}
            <View style={[styles.medallion, { borderColor: medalColor }]}>
              <Text style={[styles.medallionText, { color: medalColor }]}>{entry.rank}</Text>
            </View>

            {/* Podium block — gold/silver/bronze glass tint */}
            <View
              style={[
                styles.podiumBlock,
                { height },
                Platform.OS === 'web'
                  ? {
                      backgroundColor: hexAlpha(medalColor, 0.18),
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 10px rgba(0,0,0,0.15)`,
                      borderColor: hexAlpha(medalColor, 0.35),
                      borderWidth: 1,
                    }
                  : {
                      backgroundColor: hexAlpha(medalColor, 0.16),
                      borderWidth: 1,
                      borderColor: hexAlpha(medalColor, 0.30),
                    },
              ]}
            >
              <Text style={[styles.podiumValue, { color: '#F3F6FA' }]}>
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              </Text>
            </View>
          </Col>
        );
      })}
    </View>
  );
}

export function LeaderboardList({
  entries,
  currentNationId,
  themeColor,
  onEntryPress,
  showByline = true,
}: {
  entries: LeaderboardEntry[];
  currentNationId?: string;
  themeColor?: string;
  onEntryPress?: (nationId: string) => void;
  showByline?: boolean;
}) {
  const accent = themeColor || '#F3F6FA';

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No rankings available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {entries.map((entry, index) => {
        const isCurrent = currentNationId && entry.nation_id === currentNationId;
        return (
          <LiquidGlass
            key={entry.nation_id || index}
            radius={22}
            style={[
              styles.listEntry,
              isCurrent && { borderColor: accent, borderWidth: 1.5 },
            ]}
          >
            {/* Rank number */}
            <View style={styles.listRank}>
              <Text
                style={[
                  styles.listRankText,
                  index === 0 && { color: MEDAL_COLORS[0] },
                  index === 1 && { color: MEDAL_COLORS[1] },
                  index === 2 && { color: MEDAL_COLORS[2] },
                ]}
              >
                {entry.rank || index + 1}
              </Text>
            </View>

            {/* Flag */}
            {entry.flag_base64 && renderFlag(entry.flag_base64, 22)}

            {/* Nation info */}
            <View style={styles.listInfo}>
              <View style={styles.listNameRow}>
                <Text style={[styles.listName, isCurrent && { color: accent }]} numberOfLines={1}>
                  {entry.nation_name}
                </Text>
                {entry.faction_tag && (
                  <View style={[styles.factionTag, { backgroundColor: entry.faction_color || accent }]}>
                    <Text style={styles.factionTagText}>{entry.faction_tag}</Text>
                  </View>
                )}
              </View>
              {showByline && (
                <Text style={styles.listByline}>
                  {entry.government_subtype || entry.display_name || entry.nation_name || ''}
                  {entry.resource_tiles != null ? ` · ${entry.resource_tiles} tiles · ${entry.unique_resources} res` : ''}
                </Text>
              )}
            </View>

            {/* Value */}
            <View style={styles.listValue}>
              <Text style={[styles.listValueText, { color: accent }]}>
                {entry.stat_value_display || (typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value)}
              </Text>
            </View>

            {/* Compare / tap action */}
            {onEntryPress && entry.nation_id && (
              <TouchableOpacity
                style={styles.listAction}
                onPress={() => onEntryPress(entry.nation_id!)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={18} color={accent} />
              </TouchableOpacity>
            )}
          </LiquidGlass>
        );
      })}
    </View>
  );
}

// Need Ionicons
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
  },
  podiumHeader: {
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 6,
  },
  podiumName: {
    color: '#F3F6FA',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  medallion: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  medallionText: {
    fontSize: 16,
    fontWeight: '800',
  },
  podiumBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  podiumValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  flagIcon: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  factionTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  factionTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  // List styles
  listContainer: {
    gap: 8,
  },
  listEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  listRank: {
    width: 36,
    alignItems: 'center',
  },
  listRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  listInfo: {
    flex: 1,
    marginLeft: 10,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F6FA',
    flex: 1,
  },
  listByline: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.5)',
    marginTop: 2,
  },
  listValue: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  listValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  listAction: {
    marginLeft: 6,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(243,246,250,0.5)',
    fontSize: 16,
  },
});