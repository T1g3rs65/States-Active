import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { DecisionFeedItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getRaceTheme, getRaceIcon } from '../utils/raceColors';
import { getPoliticalCompassTheme } from '../utils/politicalCompass';
import { useNationStore } from '../store/nationStore';

interface NewsFeedProps {
  themeColor: string;
}

export default function NewsFeed({ themeColor }: NewsFeedProps) {
  const router = useRouter();
  const { nation } = useNationStore();
  const [feed, setFeed] = useState<DecisionFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<DecisionFeedItem | null>(null);
  const [myFactionId, setMyFactionId] = useState<string | null>(null);
  
  const nationId = nation?.id || nation?._id;

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    if (nationId) {
      loadMyFaction();
    }
  }, [nationId]);

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

  const isSameFaction = (item: any) => {
    if (!myFactionId || !item.faction_id) return false;
    return item.faction_id === myFactionId;
  };

  const fetchFeed = async () => {
    try {
      // Filter news feed by nation's world
      const worldId = nation?.world_id;
      const response = await api.getDecisionFeed(20, 0, worldId);
      if (response.success) {
        setFeed(response.feed);
      }
    } catch (error) {
      console.error('Error fetching news feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatIcon = (statName: string) => {
    const icons: Record<string, any> = {
      gdp: 'cash',
      environment: 'leaf',
      military_strength: 'shield',
      civil_rights: 'people',
      happiness: 'happy',
      healthcare_quality: 'medical',
    };
    return icons[statName] || 'trending-up';
  };

  const handleNationTap = (item: DecisionFeedItem) => {
    // If it's an international decision, navigate to world news/voting
    if (item.is_international) {
      router.push('/world-news');
      return;
    }
    // Otherwise navigate to compare
    router.push(`/compare?nationId=${item.nation_id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={themeColor} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >

        {feed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent decisions yet</Text>
          </View>
        ) : (
          feed.map((item, index) => {
            // Check if this is a war event
            const isWarEvent = item.is_war_event || item.event_type?.startsWith('war');
            
            if (isWarEvent) {
              // Render war event
              const warColor = '#EF4444'; // Red for war
              let warIcon = 'flash';
              if (item.event_type === 'war_declared') warIcon = 'flash';
              if (item.event_type === 'war_battle' || item.event_type === 'war_event') warIcon = 'skull';
              if (item.event_type === 'war_ended') warIcon = item.title?.includes('Victorious') ? 'trophy' : 'flag';
              
              // Handler for tapping on war events
              const handleWarTap = () => {
                if (item.war_id) {
                  router.push(`/war-dashboard?warId=${item.war_id}`);
                }
              };
              
              return (
                <TouchableOpacity 
                  key={item.id || index} 
                  style={styles.feedItemWrapper}
                  onPress={handleWarTap}
                  activeOpacity={item.war_id ? 0.7 : 1}
                  disabled={!item.war_id}
                >
                  <View style={[styles.warBanner, { backgroundColor: warColor }]}>
                    <Ionicons name="warning" size={14} color="#FFF" />
                    <Text style={styles.breakingText}>WAR EVENT</Text>
                  </View>

                  <View
                    style={[
                      styles.feedItem,
                      styles.warItem,
                      { borderLeftColor: warColor, borderLeftWidth: 4 }
                    ]}
                  >
                    <View style={styles.feedHeader}>
                      <View style={styles.nationInfo}>
                        <Ionicons name={warIcon as any} size={16} color={warColor} style={{ marginRight: 8 }} />
                        <Text style={[styles.warTitle, { color: warColor }]}>
                          {item.title || 'War Event'}
                        </Text>
                      </View>
                      <View style={styles.actionIcons}>
                        <Text style={styles.timeAgo}>{getTimeAgo(item.timestamp)}</Text>
                        {item.war_id && (
                          <Ionicons name="chevron-forward" size={20} color={warColor} />
                        )}
                      </View>
                    </View>

                    <Text style={styles.warDescription}>
                      {item.description || 'War event details unavailable.'}
                    </Text>
                    
                    {item.war_id && (
                      <Text style={[styles.tapHint, { color: warColor }]}>Tap to view war details</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }
            
            // Regular decision event rendering
            // Get race-based theme colors for nation
            const nationRace = item.race || 'human';
            const raceTheme = getRaceTheme(nationRace);
            const nationColor = raceTheme.color;
            const raceIcon = getRaceIcon(nationRace);
            
            // Get political compass theme for government type
            const politicalTheme = getPoliticalCompassTheme(
              item.civil_rights,
              item.gdp,
              item.political_freedom
            );
            
            // Check if in same faction
            const inSameFaction = isSameFaction(item);

            return (
              <View key={item.id || index} style={styles.feedItemWrapper}>
                {/* Breaking News Banner for International Issues */}
                {item.is_international && (
                  <View style={[styles.breakingBanner, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="alert-circle" size={14} color="#FFF" />
                    <Text style={styles.breakingText}>BREAKING: INTERNATIONAL IMPACT</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.feedItem,
                    { borderLeftColor: nationColor, borderLeftWidth: 4 }
                  ]}
                  onPress={() => handleNationTap(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.feedHeader}>
                    <View style={styles.nationInfo}>
                      {inSameFaction && (
                        <Ionicons name="star" size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
                      )}
                      <Ionicons name={raceIcon as any} size={14} color={nationColor} style={{ marginRight: 6 }} />
                      <Text style={[styles.nationName, { color: nationColor }]}>
                        {item.nation_name}
                      </Text>
                      {item.faction_tag && (
                        <View style={[styles.factionTag, { backgroundColor: item.faction_color || '#8B5CF6' }]}>
                          <Text style={styles.factionTagText}>{item.faction_tag}</Text>
                        </View>
                      )}
                      <Text style={[styles.govType, { color: politicalTheme.color }]}>{item.government_type}</Text>
                    </View>
                    <View style={styles.actionIcons}>
                      <Text style={styles.timeAgo}>{getTimeAgo(item.timestamp)}</Text>
                      <Ionicons name="chevron-forward" size={20} color={nationColor} />
                    </View>
                  </View>

                  <Text style={styles.issueTitle}>{item.issue_title}</Text>
                  <Text style={styles.choiceText} numberOfLines={2}>{item.choice_text}</Text>

                  {item.policy_created && (
                    <TouchableOpacity
                      style={[styles.policyBadge, { backgroundColor: nationColor + '22', borderColor: nationColor }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedPolicy(item);
                      }}
                    >
                      <Ionicons name="document-text" size={14} color={nationColor} />
                      <Text style={[styles.policyText, { color: nationColor }]}>
                        New Law: {item.policy_created}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={nationColor} />
                    </TouchableOpacity>
                  )}

                  {item.stat_changes && Object.keys(item.stat_changes).length > 0 && (
                    <View style={styles.statChanges}>
                      {Object.entries(item.stat_changes).slice(0, 3).map(([stat, change]) => (
                        <View key={stat} style={styles.statChange}>
                          <Ionicons 
                            name={getStatIcon(stat)} 
                            size={12} 
                            color={change > 0 ? '#10B981' : '#EF4444'} 
                          />
                          <Text style={[
                            styles.statChangeText,
                            { color: change > 0 ? '#10B981' : '#EF4444' }
                          ]}>
                            {stat.replace('_', ' ')}: {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.tapHint}>
                    {item.is_international ? 'Tap to vote on this decision' : 'Tap to compare nations'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Policy Detail Modal */}
      <Modal
        visible={!!selectedPolicy}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPolicy(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPolicy(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="newspaper" size={24} color={themeColor} />
              <Text style={styles.modalTitle}>Law Details</Text>
              <TouchableOpacity onPress={() => setSelectedPolicy(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            {selectedPolicy && (
              <>
                <Text style={styles.policyName}>{selectedPolicy.policy_created}</Text>
                <Text style={styles.policyFullDescription}>
                  {selectedPolicy.policy_description || 'No description available'}
                </Text>
                <Text style={styles.nationInfoText}>
                  Enacted by: {selectedPolicy.nation_name}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  feedItemWrapper: {
    marginBottom: 12,
  },
  breakingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
  },
  breakingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  warBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
  },
  warItem: {
    backgroundColor: '#1A1A1A',
  },
  warTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  warDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 8,
  },
  feedItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nationInfo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  nationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  factionTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  factionTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  govType: {
    fontSize: 12,
    color: '#94A3B8',
    width: '100%',
  },
  politicalBadge: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionIcons: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  choiceText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 8,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 6,
  },
  policyText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statChanges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChangeText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  policyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  policyFullDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 16,
  },
  nationInfoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
