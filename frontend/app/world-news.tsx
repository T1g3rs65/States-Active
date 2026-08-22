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
import ScreenHeader, { HeaderIcon } from '../components/ScreenHeader';

interface AllyInfo {
  ally_id: string;
  ally_name: string;
}

interface VoteSponsor {
  nation_id: string;
  nation_name: string;
  statement: string;
  sponsored_at: string;
}

interface InternationalVote {
  id: string;
  decision_summary: string;
  source_nation_name: string;
  source_nation_id: string;
  issue_title?: string;
  choice_text?: string;
  praise_sponsor?: VoteSponsor;
  condemn_sponsor?: VoteSponsor;
  praise_count: number;
  condemn_count: number;
  neutral_count: number;
  votes: { nation_id: string; nation_name: string; vote_type: string }[];
  created_at: string;
  ends_at: string;
  is_active: boolean;
  outcome?: string;
  time_remaining_hours?: number;
}

export default function WorldNewsScreen() {
  const router = useRouter();
  const { nation } = useNationStore();
  const [activeVotes, setActiveVotes] = useState<InternationalVote[]>([]);
  const [endedVotes, setEndedVotes] = useState<InternationalVote[]>([]);
  const [allies, setAllies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active');
  
  // Voting modal
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<InternationalVote | null>(null);
  const [selectedVoteType, setSelectedVoteType] = useState<'praise' | 'condemn' | 'neutral' | null>(null);
  const [sponsorStatement, setSponsorStatement] = useState('');
  const [voting, setVoting] = useState(false);

  const nationId = nation?.id || nation?._id;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (nationId) {
      loadAllies();
    }
  }, [nationId]);

  const loadAllies = async () => {
    if (!nationId) return;
    try {
      console.log('Loading allies for nation:', nationId);
      const response = await api.getAlliances(nationId);
      console.log('Allies response:', response);
      if (response.success && response.allies) {
        const allyIds = new Set<string>(response.allies.map((a: AllyInfo) => a.ally_id));
        console.log('Ally IDs:', Array.from(allyIds));
        setAllies(allyIds);
      }
    } catch (error) {
      console.error('Error loading allies:', error);
    }
  };

  const isAlly = (otherNationId: string) => {
    const result = allies.has(otherNationId);
    return result;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get world_id from nation for world-specific votes
      const worldId = nation?.world_id;
      
      const [activeResponse, endedResponse] = await Promise.all([
        api.getActiveVotes(worldId),
        api.getEndedVotes(20, worldId),
      ]);
      
      if (activeResponse.success) {
        setActiveVotes(activeResponse.votes || []);
      }
      if (endedResponse.success) {
        setEndedVotes(endedResponse.votes || []);
      }
    } catch (error) {
      console.error('Error loading votes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadAllies()]);
    setRefreshing(false);
  }, [nationId]);

  const hasVoted = (vote: InternationalVote) => {
    if (!nation) return false;
    const nationId = nation.id || nation._id;
    return vote.votes?.some(v => v.nation_id === nationId);
  };

  const isOwnVote = (vote: InternationalVote) => {
    if (!nation) return false;
    const nationId = nation.id || nation._id;
    return vote.source_nation_id === nationId;
  };

  const openVoteModal = (vote: InternationalVote) => {
    if (hasVoted(vote)) {
      if (Platform.OS === 'web') {
        window.alert('You have already voted on this issue');
      } else {
        Alert.alert('Already Voted', 'You have already cast your vote on this issue');
      }
      return;
    }
    
    if (isOwnVote(vote)) {
      if (Platform.OS === 'web') {
        window.alert('You cannot vote on your own decision');
      } else {
        Alert.alert('Cannot Vote', 'You cannot vote on your own decision');
      }
      return;
    }
    
    setSelectedVote(vote);
    setSelectedVoteType(null);
    setSponsorStatement('');
    setShowVoteModal(true);
  };

  const submitVote = async () => {
    if (!selectedVote || !selectedVoteType || !nation) return;
    
    const nationId = nation.id || nation._id;
    const needsStatement = (selectedVoteType === 'praise' && !selectedVote.praise_sponsor) ||
                          (selectedVoteType === 'condemn' && !selectedVote.condemn_sponsor);
    
    if (needsStatement && !sponsorStatement.trim()) {
      if (Platform.OS === 'web') {
        window.alert('As the first to ' + selectedVoteType + ', please write a statement for others to support');
      } else {
        Alert.alert('Statement Required', `As the first to ${selectedVoteType}, please write a statement for others to support`);
      }
      return;
    }
    
    setVoting(true);
    try {
      const response = await api.castVote(
        selectedVote.id,
        nationId,
        nation.name,
        selectedVoteType,
        needsStatement ? sponsorStatement : undefined
      );
      
      if (response.success) {
        const message = response.is_sponsor 
          ? `Your vote has been cast and you are now the ${selectedVoteType} sponsor!`
          : 'Your vote has been cast!';
        
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Vote Cast!', message);
        }
        
        setShowVoteModal(false);
        loadData();
      } else {
        throw new Error(response.detail || 'Failed to cast vote');
      }
    } catch (error: any) {
      console.error('Error casting vote:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to cast vote');
      } else {
        Alert.alert('Error', error.message || 'Failed to cast vote');
      }
    } finally {
      setVoting(false);
    }
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    }
    return `${Math.round(hours)} hours`;
  };

  const renderVoteCard = (vote: InternationalVote) => {
    const totalVotes = vote.praise_count + vote.condemn_count + vote.neutral_count;
    const alreadyVoted = hasVoted(vote);
    const isOwn = isOwnVote(vote);
    
    return (
      <TouchableOpacity
        key={vote.id}
        style={styles.voteCard}
        onPress={() => vote.is_active && openVoteModal(vote)}
        disabled={!vote.is_active}
      >
        {/* Header */}
        <View style={styles.voteHeader}>
          <View style={styles.voteHeaderLeft}>
            {isAlly(vote.source_nation_id) && (
              <Text style={styles.allyStarIcon}>⭐</Text>
            )}
            <Text style={styles.sourceNation}>{vote.source_nation_name}</Text>
            {isOwn && (
              <View style={styles.ownBadge}>
                <Text style={styles.ownBadgeText}>YOUR DECISION</Text>
              </View>
            )}
          </View>
          {vote.is_active ? (
            <View style={styles.timeBadge}>
              <Ionicons name="time" size={12} color="#F2C94C" />
              <Text style={styles.timeText}>
                {formatTimeRemaining(vote.time_remaining_hours || 0)} left
              </Text>
            </View>
          ) : (
            <View style={[styles.outcomeBadge, { 
              backgroundColor: vote.outcome === 'praised' ? '#27D17A' : 
                             vote.outcome === 'condemned' ? '#FF5A65' : 'rgba(243,246,250,0.48)'
            }]}>
              <Text style={styles.outcomeText}>
                {vote.outcome?.toUpperCase() || 'ENDED'}
              </Text>
            </View>
          )}
        </View>

        {/* Decision Summary */}
        <Text style={styles.decisionSummary}>{vote.decision_summary}</Text>
        
        {/* Issue details if available */}
        {vote.issue_title && (
          <Text style={styles.issueTitle}>Re: {vote.issue_title}</Text>
        )}

        {/* Sponsor Statements */}
        {vote.praise_sponsor && (
          <View style={styles.sponsorCard}>
            <View style={styles.sponsorHeader}>
              <Ionicons name="thumbs-up" size={14} color="#27D17A" />
              <Text style={styles.sponsorLabel}>PRAISE - {vote.praise_sponsor.nation_name}</Text>
            </View>
            <Text style={styles.sponsorStatement}>{'\u201c'}{vote.praise_sponsor.statement}{'\u201d'}</Text>
          </View>
        )}
        
        {vote.condemn_sponsor && (
          <View style={styles.sponsorCard}>
            <View style={styles.sponsorHeader}>
              <Ionicons name="thumbs-down" size={14} color="#FF5A65" />
              <Text style={styles.sponsorLabel}>CONDEMN - {vote.condemn_sponsor.nation_name}</Text>
            </View>
            <Text style={styles.sponsorStatement}>{'\u201c'}{vote.condemn_sponsor.statement}{'\u201d'}</Text>
          </View>
        )}

        {/* Vote Counts */}
        <View style={styles.voteCounts}>
          <View style={styles.voteCountItem}>
            <Ionicons name="thumbs-up" size={16} color="#27D17A" />
            <Text style={styles.voteCount}>{vote.praise_count}</Text>
          </View>
          <View style={styles.voteCountItem}>
            <Ionicons name="thumbs-down" size={16} color="#FF5A65" />
            <Text style={styles.voteCount}>{vote.condemn_count}</Text>
          </View>
          <View style={styles.voteCountItem}>
            <Ionicons name="remove-circle" size={16} color="rgba(243,246,250,0.48)" />
            <Text style={styles.voteCount}>{vote.neutral_count}</Text>
          </View>
          <Text style={styles.totalVotes}>{totalVotes} total votes</Text>
        </View>

        {/* Vote Status */}
        {vote.is_active && (
          <View style={styles.voteStatus}>
            {alreadyVoted ? (
              <Text style={styles.votedText}>✓ You voted</Text>
            ) : isOwn ? (
              <Text style={styles.cannotVoteText}>Your decision - cannot vote</Text>
            ) : (
              <Text style={styles.tapToVoteText}>Tap to cast your vote</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <ScreenHeader
        title="World News"
        subtitle="The feed"
        onBack={() => router.back()}
        right={<HeaderIcon name="refresh" onPress={onRefresh} />}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons 
            name="flame" 
            size={18} 
            color={activeTab === 'active' ? '#F2C94C' : 'rgba(243,246,250,0.48)'} 
          />
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Votes ({activeVotes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ended' && styles.activeTab]}
          onPress={() => setActiveTab('ended')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={18} 
            color={activeTab === 'ended' ? '#27D17A' : 'rgba(243,246,250,0.48)'} 
          />
          <Text style={[styles.tabText, activeTab === 'ended' && styles.activeTabText]}>
            Results
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E0C7" />
          <Text style={styles.loadingText}>Loading world news...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'active' ? (
            activeVotes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="globe-outline" size={64} color="rgba(255,255,255,0.08)" />
                <Text style={styles.emptyTitle}>No Active Votes</Text>
                <Text style={styles.emptyText}>
                  When nations make international decisions,{'\n'}
                  votes will appear here for you to weigh in.
                </Text>
              </View>
            ) : (
              activeVotes.map(vote => renderVoteCard(vote))
            )
          ) : (
            endedVotes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="archive-outline" size={64} color="rgba(255,255,255,0.08)" />
                <Text style={styles.emptyTitle}>No Past Votes</Text>
                <Text style={styles.emptyText}>
                  Completed votes and their outcomes{'\n'}
                  will appear here.
                </Text>
              </View>
            ) : (
              endedVotes.map(vote => renderVoteCard(vote))
            )
          )}
        </ScrollView>
      )}

      {/* Vote Modal */}
      <Modal
        visible={showVoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cast Your Vote</Text>
            <Text style={styles.modalSubtitle}>
              {selectedVote && isAlly(selectedVote.source_nation_id) ? '⭐ ' : ''}
              {selectedVote?.source_nation_name}{'\u2019'}s decision
            </Text>
            
            {/* Ally Notice - only for active votes */}
            {selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id) && (
              <View style={styles.allyNotice}>
                <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
                <Text style={styles.allyNoticeText}>
                  This nation is your ally - you cannot condemn them
                </Text>
              </View>
            )}
            
            <Text style={styles.modalDecision}>
              {selectedVote?.decision_summary}
            </Text>

            {/* Vote Options */}
            <View style={styles.voteOptions}>
              <TouchableOpacity
                style={[
                  styles.voteOption,
                  styles.praiseOption,
                  selectedVoteType === 'praise' && styles.selectedOption
                ]}
                onPress={() => setSelectedVoteType('praise')}
              >
                <Ionicons name="thumbs-up" size={24} color="#27D17A" />
                <Text style={styles.voteOptionText}>Praise</Text>
                {!selectedVote?.praise_sponsor && (
                  <Text style={styles.sponsorHint}>Be the sponsor!</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteOption,
                  styles.neutralOption,
                  selectedVoteType === 'neutral' && styles.selectedOption
                ]}
                onPress={() => setSelectedVoteType('neutral')}
              >
                <Ionicons name="remove-circle" size={24} color="rgba(243,246,250,0.48)" />
                <Text style={styles.voteOptionText}>Neutral</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteOption,
                  styles.condemnOption,
                  selectedVoteType === 'condemn' && styles.selectedOption,
                  selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id) && styles.disabledVoteOption
                ]}
                onPress={() => {
                  if (selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id)) {
                    if (Platform.OS === 'web') {
                      window.alert('You cannot condemn an ally!');
                    } else {
                      Alert.alert('Alliance Loyalty', 'You cannot condemn an ally!');
                    }
                    return;
                  }
                  setSelectedVoteType('condemn');
                }}
              >
                <Ionicons 
                  name="thumbs-down" 
                  size={24} 
                  color={selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id) ? 'rgba(255,255,255,0.08)' : '#FF5A65'} 
                />
                <Text style={[
                  styles.voteOptionText,
                  selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id) && styles.disabledVoteText
                ]}>Condemn</Text>
                {selectedVote && selectedVote.is_active && isAlly(selectedVote.source_nation_id) ? (
                  <Text style={styles.allyBlockedHint}>Ally protected</Text>
                ) : !selectedVote?.condemn_sponsor ? (
                  <Text style={styles.sponsorHint}>Be the sponsor!</Text>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Sponsor Statement Input */}
            {selectedVoteType && selectedVoteType !== 'neutral' && (
              ((selectedVoteType === 'praise' && !selectedVote?.praise_sponsor) ||
               (selectedVoteType === 'condemn' && !selectedVote?.condemn_sponsor)) && (
                <View style={styles.sponsorInput}>
                  <Text style={styles.sponsorInputLabel}>
                    As the first to {selectedVoteType}, write a statement:
                  </Text>
                  <TextInput
                    style={styles.statementInput}
                    placeholder={`Why should others ${selectedVoteType} this decision?`}
                    placeholderTextColor="rgba(243,246,250,0.48)"
                    value={sponsorStatement}
                    onChangeText={setSponsorStatement}
                    multiline
                    maxLength={200}
                  />
                  <Text style={styles.charCount}>{sponsorStatement.length}/200</Text>
                </View>
              )
            )}

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowVoteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, !selectedVoteType && styles.disabledButton]}
                onPress={submitVote}
                disabled={!selectedVoteType || voting}
              >
                {voting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Vote</Text>
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    fontSize: 14,
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
    gap: 16,
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
  voteCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  voteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allyStarIcon: {
    fontSize: 14,
  },
  allyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#422006',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#854D0E',
  },
  allyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#FCD34D',
    fontWeight: '500',
  },
  sourceNation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E0C7',
  },
  ownBadge: {
    backgroundColor: '#00E0C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F2C94C',
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  decisionSummary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F3F6FA',
    lineHeight: 22,
    marginBottom: 8,
  },
  issueTitle: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sponsorCard: {
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sponsorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(243,246,250,0.70)',
  },
  sponsorStatement: {
    fontSize: 13,
    color: '#F3F6FA',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  voteCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  voteCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  totalVotes: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginLeft: 'auto',
  },
  voteStatus: {
    marginTop: 12,
    alignItems: 'center',
  },
  votedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27D17A',
  },
  cannotVoteText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
  },
  tapToVoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E0C7',
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
    marginBottom: 16,
  },
  modalDecision: {
    fontSize: 14,
    color: '#F3F6FA',
    backgroundColor: '#0B0F14',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  voteOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  voteOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  praiseOption: {
    borderColor: '#14532D',
  },
  neutralOption: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  condemnOption: {
    borderColor: '#FF5A65',
  },
  selectedOption: {
    backgroundColor: '#1E3A5F',
    borderColor: '#00E0C7',
  },
  disabledVoteOption: {
    opacity: 0.5,
    borderColor: '#11171F',
    backgroundColor: '#0B0F14',
  },
  disabledVoteText: {
    color: 'rgba(255,255,255,0.08)',
  },
  allyBlockedHint: {
    fontSize: 10,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  voteOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  sponsorHint: {
    fontSize: 10,
    color: '#F2C94C',
  },
  sponsorInput: {
    marginBottom: 20,
  },
  sponsorInputLabel: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
  },
  statementInput: {
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
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#00E0C7',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    opacity: 0.7,
  },
});
