import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter , useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useNationStore } from '../../store/nationStore';
import { getRaceTheme } from '../../utils/raceColors';

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
  
  // Get dynamic theme color
  // Get race-based theme color for own nation
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

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

  const handleDeclareWar = (defenderId: string, defenderName: string) => {
    console.log('War button clicked!', defenderId, defenderName);
    
    // Direct confirmation without complex alert
    Alert.alert(
      '⚔️ Declare War?',
      `Attack ${defenderName}? Choose reason:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ideological',
          onPress: () => confirmWar(defenderId, defenderName, 'ideological_conflict'),
        },
        {
          text: 'Resources',
          onPress: () => confirmWar(defenderId, defenderName, 'resource_competition'),
        },
        {
          text: 'Expansion',
          onPress: () => confirmWar(defenderId, defenderName, 'aggressive_expansion'),
        },
      ]
    );
  };

  const confirmWar = async (defenderId: string, defenderName: string, casusBelli: string) => {
    try {
      const response = await api.declareWar(nationId, defenderId, casusBelli);
      
      if (response.success) {
        Alert.alert(
          'War Declared!',
          `You are now at war with ${defenderName}. Check your war dashboard for updates.`,
          [
            {
              text: 'View War Dashboard',
              onPress: () => router.push(`/war-dashboard?warId=${response.war._id}&nationId=${nationId}`),
            },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Cannot Declare War', response.message || 'An error occurred');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to declare war');
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
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
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Rankings</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={24} color={themeColor} />
            {notificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: '#FF5A65' }]}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.profileButton, { borderColor: themeColor }]}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle" size={28} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryHeader}>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'standard' && { backgroundColor: themeColor }]}
            onPress={() => setViewMode('standard')}
          >
            <Text
              style={[styles.modeButtonText, viewMode === 'standard' && styles.modeButtonTextActive]}
            >
              Standard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'extreme' && { backgroundColor: themeColor }]}
            onPress={() => setViewMode('extreme')}
          >
            <Text
              style={[styles.modeButtonText, viewMode === 'extreme' && styles.modeButtonTextActive]}
            >
              Extremes
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
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
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
          }
        >
          {rankings.map((entry, index) => {
            // Use race-based theme colors
            const nationRace = entry.race || 'human';
            const entryRaceTheme = getRaceTheme(nationRace);
            const nationColor = entryRaceTheme.color;
            const isInMyFaction = isSameFaction(entry);
            
            return (
              <View 
                key={entry.nation_id} 
                style={[
                  styles.rankingCard, 
                  { borderLeftWidth: 4, borderLeftColor: nationColor }
                ]}
              >
                <View style={styles.rankContainer}>
                  <Text style={styles.rankText}>{getMedalEmoji(entry.rank)}</Text>
                </View>
                {entry.flag_base64 && renderFlag(entry.flag_base64)}
                <View style={styles.nationInfo}>
                  <View style={styles.nationNameRow}>
                    {isAlly(entry.nation_id) && (
                      <Text style={styles.allyStarIcon}>⭐</Text>
                    )}
                    {isInMyFaction && (
                      <Ionicons name="star" size={14} color="#00E0C7" style={styles.factionStarIcon} />
                    )}
                    <Text style={styles.nationName} numberOfLines={1}>
                      {entry.nation_name}
                    </Text>
                    {entry.faction_tag && (
                      <View style={[styles.factionTagBadge, { backgroundColor: entry.faction_color || '#00E0C7' }]}>
                        <Text style={styles.factionTagText}>{entry.faction_tag}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.governmentType, { color: nationColor }]}>
                    {entry.government_type}
                  </Text>
                </View>
                <View style={styles.statContainer}>
                  <Text style={[styles.statValue, { color: nationColor }]}>
                    {entry.stat_value_display || entry.stat_value.toFixed(1)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.compareButton, { borderColor: nationColor }]}
                  onPress={() => router.push(`/compare?nationId=${entry.nation_id}`)}
                >
                  <Ionicons name="git-compare-outline" size={20} color={nationColor} />
                </TouchableOpacity>
              </View>
            );
          })}

          {rankings.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rankings available yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
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
    backgroundColor: '#11171F',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    backgroundColor: '#11171F',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
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
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0B0F14',
    borderRadius: 16,
    marginRight: 8,
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
  loadingText: {
    marginTop: 16,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00E0C7',
  },
  compareButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    borderWidth: 1,
    // borderColor dynamically set inline
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
