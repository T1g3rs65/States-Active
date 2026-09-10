import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter , useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useNationStore } from '../../store/nationStore';
import { getRaceTheme } from '../../utils/raceColors';
import { leaningColor } from '../../utils/politicalCompass';
import { colors } from '../../utils/theme';
import { TabChrome } from '../../components/ScreenHeader';
import ScreenCanvas from '../../components/ScreenCanvas';
import LiquidGlass from '../../components/LiquidGlass';
import FadeUp from '../../components/FadeUp';
import { glassAlert, glassConfirm } from '../../components/GlassModal';
import { LeaderboardPodium, LeaderboardList } from '../../components/LeaderboardPodium';
import StatusDots from '../../components/StatusDots';

interface AllyInfo {
  ally_id: string;
  ally_name: string;
}

interface FactionInfo {
  faction_id: string;
  faction_tag: string;
  faction_name: string;
  faction_color: string;
}

const RANKING_CATEGORIES = [
  { key: 'gdp', label: 'GDP per Capita' },
  { key: 'happiness', label: 'Happiness' },
  { key: 'civil_rights', label: 'Civil Rights' },
  { key: 'political_freedom', label: 'Political Freedom' },
  { key: 'environment', label: 'Environment' },
  { key: 'income_equality', label: 'Income Equality' },
  { key: 'healthcare_quality', label: 'Healthcare' },
  { key: 'scientific_advancement', label: 'Science' },
];

const EXTREME_CATEGORIES = [
  { key: 'happiest', label: 'Happiest Nations' },
  { key: 'most_free', label: 'Most Free' },
  { key: 'richest', label: 'Richest' },
  { key: 'greenest', label: 'Greenest' },
  { key: 'lowest_crime', label: 'Safest' },
  { key: 'highest_taxes', label: 'Highest Taxes' },
];

export default function Rankings() {
  const router = useRouter();
  const { nation } = useNationStore();
  const [selectedCategory, setSelectedCategory] = useState('gdp');
  const [rankings, setRankings] = useState<any[]>([]);
  const [allies, setAllies] = useState<Set<string>>(new Set());
  const [myFactionId, setMyFactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'extreme'>('standard');
  const [notificationCount, setNotificationCount] = useState(0);
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((v) => v + 1);
    }, [])
  );
  
  // Get dynamic theme color
  // Get race-based theme color for own nation
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);

  const nationId = nation?.id || nation?._id;

  // Load notification count on focus
  useFocusEffect(
    useCallback(() => {
      if (nation?.id || nation?._id) {
        loadNotificationCount();
      }
    }, [])
  );

  const loadNotificationCount = async () => {
    if (!nation?.id && !nation?._id) return;
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getWarJoinRequests(nationId);
      if (response.success) {
        setNotificationCount(response.count || 0);
      }
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [selectedCategory, viewMode]);

  useEffect(() => {
    // Load allies and faction when nation changes
    if (nationId) {
      loadAllies();
      loadMyFaction();
    }
  }, [nationId]);

  const loadAllies = async () => {
    if (!nationId) return;
    try {
      const response = await api.getAlliances(nationId);
      if (response.success && response.allies) {
        const allyIds = new Set<string>(response.allies.map((a: AllyInfo) => a.ally_id));
        setAllies(allyIds);
      }
    } catch (error) {
      console.error('Error loading allies:', error);
    }
  };

  const loadMyFaction = async () => {
    if (!nationId) return;
    try {
      const response = await api.getNationMultiAlliance(nationId);
      if (response.success && response.alliance) {
        setMyFactionId(response.alliance.id || response.alliance._id);
      } else {
        setMyFactionId(null);
      }
    } catch (error) {
      console.error('Error loading faction:', error);
    }
  };

  const loadRankings = async () => {
    setLoading(true);
    try {
      // Get world_id from the current nation
      const worldId = nation?.world_id;
      
      let response;
      if (viewMode === 'extreme') {
        response = await api.getExtremeRankings(selectedCategory, worldId);
      } else {
        response = await api.getRankings(selectedCategory, 50, worldId);
      }
      
      if (response.success) {
        setRankings(response.rankings);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRankings();
    loadAllies();
    loadMyFaction();
  };

  const isAlly = (otherNationId: string) => {
    return allies.has(otherNationId);
  };

  const isSameFaction = (entry: any) => {
    // Check if the entry has a faction_id and it matches our faction
    if (!myFactionId || !entry.faction_id) return false;
    return entry.faction_id === myFactionId;
  };

  const handleDeclareWar = async (defenderId: string, defenderName: string) => {
    console.log('War button clicked!', defenderId, defenderName);
    
    // Direct confirmation without complex alert
    await glassAlert({ title: 'Declare War?', message: `Attack ${defenderName}? Choose reason:` });
  };

  const confirmWar = async (defenderId: string, defenderName: string, casusBelli: string) => {
    try {
      const response = await api.declareWar(nationId, defenderId, casusBelli);
      
      if (response.success) {
        await glassAlert({ title: 'War Declared!', message: `You are now at war with ${defenderName}. Check your war dashboard for updates.` });
      } else {
        await glassAlert({ title: 'Cannot Declare War', message: response.message || 'An error occurred' });
      }
    } catch (error: any) {
      await glassAlert({ title: 'Error', message: error.message || 'Failed to declare war' });
    }
  };

  const renderFlag = (flagBase64: string | null | undefined) => {
    if (!flagBase64) return null;
    
    const isSvg = flagBase64.includes('svg');
    
    if (isSvg) {
      const base64Data = flagBase64.split('base64,')[1];
      const svgString = atob(base64Data);
      return <SvgXml xml={svgString} width={24} height={16} style={styles.flagIcon} />;
    } else {
      return <Image source={{ uri: flagBase64 }} style={styles.flagIcon} resizeMode="contain" />;
    }
  };

  return (
    <ScreenCanvas>
    <View style={styles.container}>
      <TabChrome title="Rankings" subtitle="Who is on top" badge={notificationCount} />

      <View style={styles.categoryHeader}>
        <LiquidGlass radius={999} style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'standard' && { backgroundColor: themeColor }]}
            onPress={() => setViewMode('standard')}
          >
            <Text
              style={[styles.modeButtonText, viewMode === 'standard' && { color: '#000' }]}
            >
              Standard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'extreme' && { backgroundColor: themeColor }]}
            onPress={() => setViewMode('extreme')}
          >
            <Text
              style={[styles.modeButtonText, viewMode === 'extreme' && { color: '#000' }]}
            >
              Extremes
            </Text>
          </TouchableOpacity>
        </LiquidGlass>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:16, paddingBottom:12, gap:8}}
        >
          {(viewMode === 'standard' ? RANKING_CATEGORIES : EXTREME_CATEGORIES).map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                selectedCategory === category.key && { backgroundColor: themeColor },
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.key && styles.categoryChipTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderFill}>
          <StatusDots status="Loading" color={themeColor} pattern="carve" />
        </View>
      ) : (
        <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1, paddingBottom:80}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
          }
        >
          <FadeUp key={`rankings-${visit}-${viewMode}-${selectedCategory}`}>
          {/* Podium for top 3 */}
          <LeaderboardPodium
            entries={rankings.slice(0, 3).map((entry: any) => ({
              nation_id: entry.nation_id,
              userName: entry.nation_name,
              rank: entry.rank,
              value: entry.stat_value_display || entry.stat_value.toFixed(1),
              flag_base64: entry.flag_base64,
              government_subtype: entry.government_subtype || entry.display_name || '',
              race: entry.race,
              faction_tag: entry.faction_tag,
              faction_color: entry.faction_color,
            }))}
            currentNationId={nationId}
            themeColor={themeColor}
            onEntryPress={(nid) => router.push(`/compare?nationId=${nid}`)}
          />

          {/* Remaining entries as list */}
          {rankings.slice(3).length > 0 ? (
          <LeaderboardList
            entries={rankings.slice(3).map((entry: any) => ({
              nation_id: entry.nation_id,
              nation_name: entry.nation_name,
              rank: entry.rank,
              value: entry.stat_value,
              stat_value_display: entry.stat_value_display,
              flag_base64: entry.flag_base64,
              government_subtype: entry.government_subtype || entry.display_name || '',
              race: entry.race,
              faction_tag: entry.faction_tag,
              faction_color: entry.faction_color,
            }))}
            currentNationId={nationId}
            themeColor={themeColor}
            onEntryPress={(nid) => router.push(`/compare?nationId=${nid}`)}
          />
          ) : null}
          </FadeUp>
        </ScrollView>
      )}
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  profileButton: {
    padding: 4,
  },
  categoryHeader: {
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 8,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 999,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    marginRight: 8,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  compareButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  modeButtonActive: {
    // backgroundColor dynamically set inline
  },
  modeButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#F3F6FA',
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChipActive: {
    // backgroundColor dynamically set inline
  },
  categoryChipText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#F3F6FA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderFill: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  flagIcon: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  allyStarIcon: {
    fontSize: 14,
  },
  factionStarIcon: {
    marginRight: 2,
  },
  factionTagBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  factionTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  nationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    flex: 1,
  },
  governmentType: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  statContainer: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
  },
});
