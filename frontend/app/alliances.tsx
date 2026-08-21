import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { getRaceTheme } from '../utils/raceColors';
import { leaningColor } from '../utils/politicalCompass';

interface Pact {
  alliance_id: string;
  ally_id: string;
  ally_name: string;
  formed_at: string;
}

interface PactRequest {
  id: string;
  from_nation_id: string;
  from_nation_name: string;
  from_nation_flag?: string;
  to_nation_id: string;
  to_nation_name: string;
  message: string;
  status: string;
  created_at: string;
}

interface OtherNation {
  id: string;
  name: string;
  government_type: string;
}

export default function NonAggressionPacts() {
  const router = useRouter();
  const { nation } = useNationStore();
  
  const MAX_PACTS = 3;  // Maximum non-aggression pacts allowed
  
  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);
  
  const [pacts, setPacts] = useState<Pact[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<PactRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PactRequest[]>([]);
  const [allNations, setAllNations] = useState<OtherNation[]>([]);
  const [filteredNations, setFilteredNations] = useState<OtherNation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pacts' | 'requests' | 'find'>('pacts');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedNation, setSelectedNation] = useState<OtherNation | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Check if at pact limit
  const atPactLimit = pacts.length >= MAX_PACTS;

  const nationId = nation?.id || nation?._id;

  useEffect(() => {
    if (nationId) {
      loadData();
    }
  }, [nationId]);
  
  useEffect(() => {
    // Filter nations based on search query
    if (searchQuery.trim() === '') {
      setFilteredNations(allNations);
    } else {
      const filtered = allNations.filter(n => 
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNations(filtered);
    }
  }, [searchQuery, allNations]);

  const loadData = async () => {
    if (!nationId) return;
    
    setLoading(true);
    try {
      // Get world_id for filtering nations to same world
      const worldId = nation?.world_id;
      
      const [pactsRes, requestsRes, nationsRes, factionRes] = await Promise.all([
        api.getAlliances(nationId),
        api.getAllianceRequests(nationId),
        api.getRankings('gdp', 100, worldId), // Use rankings API to get list of nations from same world
        api.getNationMultiAlliance(nationId), // Get faction to filter members
      ]);
      
      if (pactsRes.success) {
        setPacts(pactsRes.allies || []);
      }
      if (requestsRes.success) {
        setIncomingRequests(requestsRes.incoming || []);
        setOutgoingRequests(requestsRes.outgoing || []);
      }
      if (nationsRes.success && nationsRes.rankings) {
        // Filter out own nation and existing pact nations
        const pactIds = new Set(pactsRes.allies?.map((a: Pact) => a.ally_id) || []);
        
        // Also filter out faction members (can't have pacts with faction mates)
        const factionMemberIds = new Set<string>();
        if (factionRes.success && factionRes.alliance) {
          const faction = factionRes.alliance;
          // Add all members and vassals to the exclusion set
          (faction.members || []).forEach((m: any) => factionMemberIds.add(m.nation_id));
          (faction.vassals || []).forEach((v: any) => factionMemberIds.add(v.nation_id));
        }
        
        const filtered = nationsRes.rankings
          .filter((n: any) => 
            n.nation_id !== nationId && 
            !pactIds.has(n.nation_id) &&
            !factionMemberIds.has(n.nation_id)  // Exclude faction members
          )
          .map((n: any) => ({
            id: n.nation_id,
            name: n.nation_name,
            government_type: n.government_type,
          }));
        setAllNations(filtered);
        setFilteredNations(filtered);
      }
    } catch (error) {
      console.error('Error loading pacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [nationId]);

  const sendRequest = async () => {
    if (!selectedNation || !nation) return;
    
    setSending(true);
    try {
      const response = await api.sendAllianceRequest(
        nationId,
        nation.name,
        selectedNation.id,
        requestMessage,
        nation.flag_base64
      );
      
      if (response.success) {
        if (Platform.OS === 'web') {
          window.alert(`Pact request sent to ${selectedNation.name}!`);
        } else {
          Alert.alert('Request Sent', `Pact request sent to ${selectedNation.name}!`);
        }
        setShowRequestModal(false);
        setSelectedNation(null);
        setRequestMessage('');
        loadData();
      } else {
        throw new Error(response.detail || 'Failed to send request');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to send request');
      } else {
        Alert.alert('Error', error.message || 'Failed to send request');
      }
    } finally {
      setSending(false);
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean, fromName: string) => {
    try {
      const response = await api.respondToAlliance(requestId, accept);
      
      if (response.success) {
        const message = accept 
          ? `Non-Aggression Pact formed with ${fromName}!`
          : 'Request rejected';
        
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert(accept ? 'Pact Formed!' : 'Rejected', message);
        }
        loadData();
      }
    } catch (error) {
      console.error('Error responding to request:', error);
    }
  };

  const breakPact = async (pactId: string, nationName: string) => {
    const confirm = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to break your Non-Aggression Pact with ${nationName}?`)
      : await new Promise<boolean>(resolve => {
          Alert.alert(
            'Break Pact',
            `Are you sure you want to break your Non-Aggression Pact with ${nationName}?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Break Pact', onPress: () => resolve(true), style: 'destructive' }
            ]
          );
        });
    
    if (!confirm) return;
    
    try {
      const response = await api.breakAlliance(pactId, nationId);
      if (response.success) {
        if (Platform.OS === 'web') {
          window.alert('Pact broken');
        } else {
          Alert.alert('Pact Broken', `You are no longer in a Non-Aggression Pact with ${nationName}`);
        }
        loadData();
      }
    } catch (error) {
      console.error('Error breaking pact:', error);
    }
  };

  const renderAllyCard = (pact: Pact) => (
    <View key={pact.alliance_id} style={styles.allyCard}>
      <View style={styles.allyHeader}>
        <View style={styles.nationNameRow}>
          <Ionicons name="shield-checkmark" size={20} color="#27D17A" />
          <Text style={styles.nationName}>{pact.ally_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.breakButton}
          onPress={() => breakPact(pact.alliance_id, pact.ally_name)}
        >
          <Ionicons name="close-circle" size={20} color="#FF5A65" />
        </TouchableOpacity>
      </View>
      <Text style={styles.allyDate}>
        Pact formed on {new Date(pact.formed_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderRequestCard = (request: PactRequest, isIncoming: boolean) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestDirection}>
          {isIncoming ? '📥 From' : '📤 To'}
        </Text>
        <Text style={styles.requestNation}>
          {isIncoming ? request.from_nation_name : request.to_nation_name}
        </Text>
      </View>
      
      {request.message && (
        <Text style={styles.requestMessage}>{'\u201c'}{request.message}{'\u201d'}</Text>
      )}
      
      {isIncoming && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => respondToRequest(request.id, true, request.from_nation_name)}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => respondToRequest(request.id, false, request.from_nation_name)}
          >
            <Ionicons name="close" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isIncoming && (
        <Text style={styles.pendingText}>Waiting for response...</Text>
      )}
    </View>
  );

  const renderNationCard = (otherNation: OtherNation) => {
    // Check if already have pending request
    const hasPending = outgoingRequests.some(r => r.to_nation_id === otherNation.id) ||
                       incomingRequests.some(r => r.from_nation_id === otherNation.id);
    
    return (
      <TouchableOpacity
        key={otherNation.id}
        style={[styles.nationCard, hasPending && styles.nationCardDisabled]}
        onPress={() => {
          if (!hasPending) {
            setSelectedNation(otherNation);
            setShowRequestModal(true);
          }
        }}
        disabled={hasPending}
      >
        <View style={styles.nationInfo}>
          <Text style={styles.nationName}>{otherNation.name}</Text>
          <Text style={styles.nationGovt}>{otherNation.government_type}</Text>
        </View>
        {hasPending ? (
          <Text style={styles.pendingBadge}>Pending</Text>
        ) : (
          <Ionicons name="add-circle" size={24} color={themeColor} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.title}>Non-Aggression Pacts</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={themeColor} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pacts' && [styles.activeTab, { borderColor: themeColor }]]}
          onPress={() => setActiveTab('pacts')}
        >
          <Ionicons name="shield-checkmark" size={16} color={activeTab === 'pacts' ? '#27D17A' : 'rgba(243,246,250,0.48)'} />
          <Text style={[styles.tabText, activeTab === 'pacts' && styles.activeTabText]}>
            Pacts ({pacts.length}/{MAX_PACTS})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && [styles.activeTab, { borderColor: themeColor }]]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons name="mail" size={16} color={activeTab === 'requests' ? themeColor : 'rgba(243,246,250,0.48)'} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({incomingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && [styles.activeTab, { borderColor: themeColor }]]}
          onPress={() => setActiveTab('find')}
          disabled={atPactLimit}
        >
          <Ionicons name="search" size={16} color={atPactLimit ? 'rgba(255,255,255,0.08)' : (activeTab === 'find' ? '#27D17A' : 'rgba(243,246,250,0.48)')} />
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText, atPactLimit && { color: 'rgba(255,255,255,0.08)' }]}>
            Find
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pact Limit Warning */}
      {atPactLimit && (
        <View style={styles.limitBanner}>
          <Ionicons name="information-circle" size={16} color="#F2C94C" />
          <Text style={styles.limitBannerText}>
            Pact limit reached ({MAX_PACTS}/{MAX_PACTS}). Break an existing pact to form a new one.
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading pacts...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'pacts' && (
            pacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={64} color="rgba(255,255,255,0.08)" />
                <Text style={styles.emptyTitle}>No Pacts Yet</Text>
                <Text style={styles.emptyText}>
                  Form Non-Aggression Pacts with other nations!{'\n'}
                  You cannot declare war on pact partners.
                </Text>
              </View>
            ) : (
              pacts.map(ally => renderAllyCard(ally))
            )
          )}

          {activeTab === 'requests' && (
            <>
              {incomingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Incoming Requests</Text>
                  {incomingRequests.map(req => renderRequestCard(req, true))}
                </View>
              )}
              
              {outgoingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sent Requests</Text>
                  {outgoingRequests.map(req => renderRequestCard(req, false))}
                </View>
              )}
              
              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="mail-outline" size={64} color="rgba(255,255,255,0.08)" />
                  <Text style={styles.emptyTitle}>No Pending Requests</Text>
                  <Text style={styles.emptyText}>
                    Pact requests you send or receive{'\n'}
                    will appear here.
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'find' && (
            <View>
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="rgba(243,246,250,0.48)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search nations..."
                  placeholderTextColor="rgba(243,246,250,0.48)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="rgba(243,246,250,0.48)" />
                  </TouchableOpacity>
                )}
              </View>
              
              {filteredNations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="globe-outline" size={64} color="rgba(255,255,255,0.08)" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No Nations Found' : 'No Nations Available'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `No nations match "${searchQuery}"`
                      : 'You already have pacts with everyone\nor have pending requests with all nations.'
                    }
                  </Text>
                </View>
              ) : (
                filteredNations.map(n => renderNationCard(n))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Send Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Non-Aggression Pact</Text>
            <Text style={styles.modalSubtitle}>
              Send pact request to {selectedNation?.name}
            </Text>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message (optional)"
              placeholderTextColor="rgba(243,246,250,0.48)"
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{requestMessage.length}/200</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRequestModal(false);
                  setSelectedNation(null);
                  setRequestMessage('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: themeColor }]}
                onPress={sendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFF" />
                    <Text style={styles.sendButtonText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#11171F',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  refreshButton: {
    padding: 8,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#422006',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2C94C',
  },
  limitBannerText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: '#11171F',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1E3A5F',
    borderWidth: 1,
    borderColor: '#00E0C7',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.48)',
  },
  activeTabText: {
    color: '#F3F6FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  allyCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27D17A',
  },
  allyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  allyDate: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 8,
  },
  breakButton: {
    padding: 4,
  },
  requestCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requestDirection: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  requestNation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  requestMessage: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#27D17A',
  },
  rejectButton: {
    backgroundColor: '#FF5A65',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  pendingText: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
  },
  nationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nationCardDisabled: {
    opacity: 0.5,
  },
  nationInfo: {
    flex: 1,
  },
  nationGovt: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  pendingBadge: {
    fontSize: 12,
    color: '#F2C94C',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#11171F',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginBottom: 20,
  },
  messageInput: {
    backgroundColor: '#0B0F14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#F3F6FA',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F3F6FA',
    paddingVertical: 4,
  },
});
