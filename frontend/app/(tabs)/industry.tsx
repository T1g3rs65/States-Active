import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useNationStore } from '../../store/nationStore';
import { api } from '../../utils/api';
import { getRaceTheme } from '../../utils/raceColors';
import {
  RESOURCES,
  RESOURCE_BY_ID,
  TIER_COLORS,
  TIER_LABELS,
  calculateIndustryStats,
  NationIndustryStats,
  ResourceDefinition,
} from '../../utils/resources';

const { width } = Dimensions.get('window');

export default function Industry() {
  const router = useRouter();
  const { nation, setNation } = useNationStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [industryStats, setIndustryStats] = useState<NationIndustryStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'resources' | 'leaderboard'>('overview');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

  useEffect(() => {
    if (nation) {
      loadIndustryData();
    }
  }, [nation]);

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

  const loadIndustryData = async () => {
    if (!nation) return;
    
    setLoading(true);
    try {
      // Try to get fresh territory data from server
      const nationId = nation.id || nation._id;
      let resourceCounts: Record<string, number> = {};
      let totalTiles = 0;
      
      // Always fetch fresh territory data from API
      if (nationId) {
        try {
          const territoryResponse = await api.getTerritoryCounts(nationId);
          if (territoryResponse.success) {
            resourceCounts = territoryResponse.resource_counts || {};
            totalTiles = territoryResponse.total_territories || 0;
            console.log(`Loaded territory data: ${totalTiles} tiles, ${Object.keys(resourceCounts).length} resource types`);
          }
        } catch (e) {
          console.log('Could not fetch territory data:', e);
          // Fallback to stored data
          resourceCounts = nation.resource_counts || {};
          totalTiles = nation.total_territories || 0;
        }
      }
      
      // Pass nation stats for proper GDP calculation
      const nationStats = {
        population: nation.stats?.population || 0,
        gdp: nation.stats?.gdp || 50
      };
      
      const stats = calculateIndustryStats(resourceCounts, totalTiles, nationStats);
      setIndustryStats(stats);

      // Load leaderboard data
      await loadLeaderboard();
    } catch (error) {
      console.error('Error loading industry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      // Filter by nation's world_id
      const worldId = nation?.world_id;
      const response = await api.getIndustryLeaderboard(worldId);
      if (response.success) {
        setLeaderboardData(response.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const nationId = nation?.id || nation?._id;
      if (nationId) {
        const response = await api.getNation(nationId);
        if (response.success && response.nation) {
          setNation(response.nation);
        }
      }
      await loadIndustryData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatValue = (value: number): string => {
    if (value >= 1000000000000) {
      return `$${(value / 1000000000000).toFixed(1)}T`;
    } else if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const renderOverview = () => {
    if (!industryStats) return null;

    // Prepare pie chart data
    const pieData = industryStats.topResources.slice(0, 6).map((item, index) => ({
      name: item.resource.name,
      population: Math.round((item.value / Math.max(industryStats.totalValue, 1)) * 100),
      color: item.resource.color,
      legendFontColor: 'rgba(243,246,250,0.70)',
      legendFontSize: 11,
    }));

    // Add "Other" if there are more resources
    if (industryStats.topResources.length > 6) {
      const otherValue = industryStats.topResources
        .slice(6)
        .reduce((sum, item) => sum + item.value, 0);
      pieData.push({
        name: 'Other',
        population: Math.round((otherValue / Math.max(industryStats.totalValue, 1)) * 100),
        color: 'rgba(243,246,250,0.48)',
        legendFontColor: 'rgba(243,246,250,0.70)',
        legendFontSize: 11,
      });
    }

    // If no resources, show placeholder
    if (pieData.length === 0) {
      pieData.push({
        name: 'No Resources',
        population: 100,
        color: 'rgba(255,255,255,0.08)',
        legendFontColor: 'rgba(243,246,250,0.70)',
        legendFontSize: 11,
      });
    }

    return (
      <View>
        {/* Stats Summary Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: themeColor }]}>
            <Text style={styles.statLabel}>Total Resource Value</Text>
            <Text style={[styles.statValue, { color: themeColor }]}>
              {industryStats.totalValue.toFixed(1)}
            </Text>
            <Text style={styles.statSubtext}>Value Units</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#27D17A' }]}>
            <Text style={styles.statLabel}>GDP Contribution</Text>
            <Text style={[styles.statValue, { color: '#27D17A' }]}>
              {formatValue(industryStats.gdpContribution)}
            </Text>
            <Text style={styles.statSubtext}>{industryStats.industryPercentOfGDP.toFixed(1)}% of GDP</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: '#F2C94C' }]}>
            <Text style={styles.statLabel}>Resource Tiles</Text>
            <Text style={[styles.statValue, { color: '#F2C94C' }]}>
              {industryStats.resourceTiles}
            </Text>
            <Text style={styles.statSubtext}>of {industryStats.totalTiles} total</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#00E0C7' }]}>
            <Text style={styles.statLabel}>Resource Types</Text>
            <Text style={[styles.statValue, { color: '#00E0C7' }]}>
              {Object.keys(industryStats.resourceCounts).length}
            </Text>
            <Text style={styles.statSubtext}>Unique Resources</Text>
          </View>
        </View>

        {/* Tier Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resource Tier Breakdown</Text>
        </View>
        <View style={styles.tierRow}>
          <View style={[styles.tierCard, { borderLeftColor: TIER_COLORS.common }]}>
            <Text style={styles.tierLabel}>Common</Text>
            <Text style={styles.tierCount}>{industryStats.tierBreakdown.common.count} tiles</Text>
            <Text style={styles.tierValue}>{industryStats.tierBreakdown.common.value.toFixed(1)} value</Text>
          </View>
          <View style={[styles.tierCard, { borderLeftColor: TIER_COLORS.uncommon }]}>
            <Text style={styles.tierLabel}>Uncommon</Text>
            <Text style={styles.tierCount}>{industryStats.tierBreakdown.uncommon.count} tiles</Text>
            <Text style={styles.tierValue}>{industryStats.tierBreakdown.uncommon.value.toFixed(1)} value</Text>
          </View>
          <View style={[styles.tierCard, { borderLeftColor: TIER_COLORS.rare }]}>
            <Text style={styles.tierLabel}>Rare</Text>
            <Text style={styles.tierCount}>{industryStats.tierBreakdown.rare.count} tiles</Text>
            <Text style={styles.tierValue}>{industryStats.tierBreakdown.rare.value.toFixed(1)} value</Text>
          </View>
        </View>

        {/* Resource Distribution Pie Chart */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resource Distribution</Text>
        </View>
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            width={width - 48}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>
    );
  };

  const renderResources = () => {
    if (!industryStats) return null;

    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Resources</Text>
          <Text style={styles.sectionSubtitle}>
            {industryStats.topResources.length} resource types across {industryStats.resourceTiles} tiles
          </Text>
        </View>

        {industryStats.topResources.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="rgba(243,246,250,0.48)" />
            <Text style={styles.emptyStateText}>No resources discovered yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Visit the World Map to claim territory with resources
            </Text>
          </View>
        ) : (
          industryStats.topResources.map((item, index) => (
            <View key={item.resource.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <View style={[styles.resourceIcon, { backgroundColor: item.resource.color + '30' }]}>
                  <Ionicons 
                    name={item.resource.icon as any} 
                    size={24} 
                    color={item.resource.color} 
                  />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceName}>{item.resource.name}</Text>
                  <View style={styles.resourceMeta}>
                    <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.resource.tier] + '30' }]}>
                      <Text style={[styles.tierBadgeText, { color: TIER_COLORS[item.resource.tier] }]}>
                        {TIER_LABELS[item.resource.tier]}
                      </Text>
                    </View>
                    <Text style={styles.resourceValue}>
                      {item.resource.value}x value
                    </Text>
                  </View>
                </View>
                <View style={styles.resourceStats}>
                  <Text style={styles.resourceCount}>{item.count}</Text>
                  <Text style={styles.resourceCountLabel}>tiles</Text>
                </View>
              </View>
              <View style={styles.resourceFooter}>
                <Text style={styles.resourceDescription}>{item.resource.description}</Text>
                <View style={styles.resourceValueRow}>
                  <Text style={styles.resourceTotalLabel}>Total Value:</Text>
                  <Text style={[styles.resourceTotalValue, { color: item.resource.color }]}>
                    {item.value.toFixed(1)}
                  </Text>
                  <Text style={styles.resourcePercentage}>
                    ({Math.round((item.value / Math.max(industryStats.totalValue, 1)) * 100)}%)
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderLeaderboard = () => {
    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Industry Leaderboard</Text>
          <Text style={styles.sectionSubtitle}>Top nations by total resource value</Text>
        </View>

        {leaderboardData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="rgba(243,246,250,0.48)" />
            <Text style={styles.emptyStateText}>Loading leaderboard...</Text>
          </View>
        ) : (
          leaderboardData.slice(0, 10).map((entry, index) => {
            const isCurrentNation = entry.nation_id === (nation?.id || nation?._id);
            return (
              <View 
                key={entry.nation_id} 
                style={[
                  styles.leaderboardEntry,
                  isCurrentNation && { borderColor: themeColor, borderWidth: 2 }
                ]}
              >
                <View style={styles.leaderboardRank}>
                  <Text style={[
                    styles.rankText,
                    index === 0 && { color: '#FCD34D' },
                    index === 1 && { color: 'rgba(243,246,250,0.70)' },
                    index === 2 && { color: '#F97316' }
                  ]}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{entry.nation_name}</Text>
                  <Text style={styles.leaderboardStats}>
                    {entry.resource_tiles} tiles • {entry.unique_resources} resources
                  </Text>
                </View>
                <View style={styles.leaderboardValue}>
                  <Text style={styles.leaderboardValueText}>{entry.total_value.toFixed(1)}</Text>
                  <Text style={styles.leaderboardValueLabel}>value</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  if (!nation) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color="rgba(243,246,250,0.48)" />
          <Text style={styles.emptyStateText}>No nation found</Text>
          <Text style={styles.emptyStateSubtext}>Create a nation to view industry stats</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading industry data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Industry</Text>
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

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && { backgroundColor: themeColor }]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'resources' && { backgroundColor: themeColor }]}
          onPress={() => setSelectedTab('resources')}
        >
          <Text style={[styles.tabText, selectedTab === 'resources' && styles.tabTextActive]}>
            Resources
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'leaderboard' && { backgroundColor: themeColor }]}
          onPress={() => setSelectedTab('leaderboard')}
        >
          <Text style={[styles.tabText, selectedTab === 'leaderboard' && styles.tabTextActive]}>
            Rankings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E0C7" />
        }
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'resources' && renderResources()}
        {selectedTab === 'leaderboard' && renderLeaderboard()}

        {/* Hint to visit world map */}
        {(!industryStats || industryStats.resourceTiles === 0) && (
          <View style={styles.hintCard}>
            <Ionicons name="map-outline" size={32} color="#F2C94C" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.hintTitle}>Sync Your Territory</Text>
              <Text style={styles.hintText}>
                Visit the World Map to discover resources in your territory. The map needs to be loaded to sync resource data.
              </Text>
              <TouchableOpacity 
                style={styles.hintButton}
                onPress={() => router.push('/world-map')}
              >
                <Text style={styles.hintButtonText}>Open World Map</Text>
                <Ionicons name="arrow-forward" size={16} color="#F3F6FA" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#0B0F14',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#11171F',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
  },
  tabTextActive: {
    color: '#F3F6FA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(243,246,250,0.70)',
    marginTop: 12,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statSubtext: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    marginTop: 4,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  tierCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  tierValue: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.70)',
  },
  chartContainer: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resourceCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resourceValue: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  resourceStats: {
    alignItems: 'flex-end',
  },
  resourceCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  resourceCountLabel: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
  resourceFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  resourceDescription: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 18,
  },
  resourceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  resourceTotalLabel: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  resourceTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  resourcePercentage: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 8,
    textAlign: 'center',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(243,246,250,0.70)',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 8,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  leaderboardStats: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  leaderboardValue: {
    alignItems: 'flex-end',
  },
  leaderboardValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27D17A',
  },
  leaderboardValueLabel: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#78350F33',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 18,
    marginBottom: 12,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2C94C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  hintButtonText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '600',
  },
});
