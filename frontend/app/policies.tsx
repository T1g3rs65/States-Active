import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { Policy } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getRaceTheme } from '../utils/raceColors';
import { leaningColor } from '../utils/politicalCompass';
import ScreenHeader from '../components/ScreenHeader';
import EmptyNation from '../components/EmptyNation';
import StatusDots from '../components/StatusDots';

export default function Policies() {
  const router = useRouter();
  const { nation } = useNationStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'laws' | 'statutes'>('laws');
  const [expandedPolicies, setExpandedPolicies] = useState<Set<number>>(new Set());

  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);

  useEffect(() => {
    if (nation?.id || nation?._id) {
      fetchPolicies();
    }
  }, [nation]);

  const fetchPolicies = async () => {
    if (!nation?.id && !nation?._id) return;
    
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getPolicies(nationId);
      if (response.success) {
        setPolicies(response.policies);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPolicies();
  };

  // Group policies by category
  const policiesByCategory = policies.reduce((acc, policy) => {
    if (!acc[policy.category]) {
      acc[policy.category] = [];
    }
    acc[policy.category].push(policy);
    return acc;
  }, {} as Record<string, Policy[]>);

  const togglePolicy = (index: number) => {
    setExpandedPolicies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      energy: 'flash',
      civil_rights: 'people',
      economy: 'cash',
      healthcare: 'medical',
      education: 'school',
      environment: 'leaf',
      military: 'shield',
      technology: 'phone-portrait',
      immigration: 'airplane',
      foreign_policy: 'globe',
      general: 'document-text',
    };
    return icons[category] || 'document-text';
  };

  if (!nation) {
    return <EmptyNation />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Policies" subtitle="Standing law" onBack={() => router.back()} />

      <View style={styles.tabs}>
        {(['laws', 'statutes'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabT, tab === t && { color: themeColor }]}>{t === 'laws' ? 'Laws' : 'Statutes'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <StatusDots status="Loading" color={themeColor} />
          <Text style={styles.loadingText}>Loading policies...</Text>
        </View>
      ) : tab === 'statutes' ? (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}>
          <Text style={styles.statsSubtext}>On or off. Stamped by the issues you pick.</Text>
          {Object.values(nation.policy_flags || {}).length === 0 ? (
            <Text style={styles.emptyText}>No statutes yet. Issue answers that ban, legalize, or draft will land here.</Text>
          ) : (
            Object.values(nation.policy_flags || {}).map((f: any) => (
              <View key={f.id} style={styles.policyCard}>
                <View style={styles.policyHeader}>
                  <Ionicons name={f.on ? 'checkmark-circle' : 'close-circle'} size={22} color={f.on ? '#27D17A' : '#FF5A65'} />
                  <View style={styles.policyHeaderText}>
                    <Text style={styles.policyName}>{f.label}</Text>
                    <Text style={styles.policyDate}>{f.on ? 'In force' : 'Repealed'}{f.source ? ` · ${f.source}` : ''}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : policies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="rgba(243,246,250,0.48)" />
          <Text style={styles.emptyTitle}>No Policies Yet</Text>
          <Text style={styles.emptyText}>
            Make important decisions to create defining policies for your nation!
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
          }
        >
          <View style={styles.statsCard}>
            <Text style={styles.statsText}>
              Total Policies: <Text style={[styles.statsNumber, { color: themeColor }]}>{policies.length}</Text>
            </Text>
            <Text style={styles.statsSubtext}>Defining your nation since day one</Text>
          </View>

          {Object.entries(policiesByCategory).map(([category, categoryPolicies]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons name={getCategoryIcon(category)} size={20} color={themeColor} />
                <Text style={styles.categoryTitle}>
                  {category.replace('_', ' ').toUpperCase()}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: themeColor + '33' }]}>
                  <Text style={[styles.categoryBadgeText, { color: themeColor }]}>
                    {categoryPolicies.length}
                  </Text>
                </View>
              </View>

              {categoryPolicies.map((policy, policyIndex) => {
                const globalIndex = policies.indexOf(policy);
                const isExpanded = expandedPolicies.has(globalIndex);
                
                return (
                  <TouchableOpacity 
                    key={policyIndex} 
                    style={styles.policyCard}
                    onPress={() => togglePolicy(globalIndex)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.policyContent}>
                      <View style={styles.policyHeader}>
                        <Ionicons name="newspaper" size={24} color={themeColor} />
                        <View style={styles.policyHeaderText}>
                          <Text style={styles.policyName}>{policy.name}</Text>
                          <Text style={styles.policyDate}>
                            {new Date(policy.enacted_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={themeColor} 
                        />
                      </View>
                      
                      {!isExpanded && (
                        <TouchableOpacity 
                          style={styles.expandHint}
                          onPress={() => togglePolicy(globalIndex)}
                        >
                          <Text style={[styles.expandHintText, { color: themeColor }]}>
                            Tap to view details
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {isExpanded && (
                        <View style={[styles.newsSnippet, { borderLeftColor: themeColor }]}>
                          <Text style={styles.newsSnippetText}>{policy.news_snippet}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: 'rgba(243,246,250,0.1)' },
  tabT: { color: 'rgba(243,246,250,0.55)', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statsText: {
    fontSize: 16,
    color: '#F3F6FA',
    fontWeight: '600',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsSubtext: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginLeft: 8,
    flex: 1,
    letterSpacing: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  policyCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  policyContent: {
    padding: 16,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  expandHint: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandHintText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  policyHeaderText: {
    flex: 1,
  },
  policyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  policyDate: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  newsSnippet: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  newsSnippetText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#F3F6FA',
    fontSize: 16,
  },
});
