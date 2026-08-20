import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNationStore } from '../../store/nationStore';
import { api } from '../../utils/api';
import { Issue } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { getRaceTheme } from '../../utils/raceColors';

export default function Issues() {
  const router = useRouter();
  const { nation, setNation, issues, setIssues } = useNationStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [statChanges, setStatChanges] = useState<Record<string, number>>({});
  const [policyCreated, setPolicyCreated] = useState<string | null>(null);
  const [timerDisplay, setTimerDisplay] = useState<string>('Loading...');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [atCap, setAtCap] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

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
    if (nation) {
      loadIssues();
      
      // Poll every 30 seconds to check for new issues and update timer
      pollIntervalRef.current = setInterval(() => {
        loadIssues(false, true); // silent refresh
      }, 30000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [nation]);

  // When seconds_remaining is near 0, poll more frequently
  useEffect(() => {
    if (secondsRemaining !== null && secondsRemaining <= 60 && secondsRemaining > 0) {
      // Poll every 5 seconds when close to generating
      const quickPoll = setInterval(() => {
        loadIssues(false, true);
      }, 5000);
      
      return () => clearInterval(quickPoll);
    }
  }, [secondsRemaining]);

  const loadIssues = async (forceGenerate = false, silent = false) => {
    if (!nation?.id && !nation?._id) return;
    
    if (!silent) setLoading(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getIssues(nationId, forceGenerate);
      if (response.success) {
        setIssues(response.issues);
        setTimerDisplay(response.timer_display || 'Loading...');
        setSecondsRemaining(response.seconds_remaining);
        setAtCap(response.at_cap || false);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
      if (!silent) Alert.alert('Error', 'Failed to load issues');
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleDecision = async (issue: Issue, choiceIndex: number) => {
    if (!nation?.id && !nation?._id) return;
    
    setSubmitting(true);
    try {
      const nationId = nation.id || nation._id;
      const issueId = issue.id || issue._id;
      const response = await api.submitDecision(nationId, issueId, choiceIndex);
      
      if (response.success) {
        // Capture results immediately
        const changes = response.stat_changes || {};
        const policy = response.policy_created || null;
        
        // Update nation stats immediately
        const updatedNation = { ...nation, stats: response.new_stats };
        setNation(updatedNation);
        
        // Set state for modal
        setStatChanges(changes);
        setPolicyCreated(policy);
        
        // Close issue detail modal FIRST
        setSelectedIssue(null);
        
        // Remove issue from list
        const remainingIssues = issues.filter(i => (i.id || i._id) !== issueId);
        setIssues(remainingIssues);
        
        // Show results modal AFTER state is updated
        // Small delay ensures DOM is ready
        requestAnimationFrame(() => {
          setShowResultsModal(true);
        });
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      Alert.alert('Error', 'Failed to submit decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatStatChanges = (changes: Record<string, number>) => {
    return Object.entries(changes)
      .slice(0, 5)
      .map(([key, value]) => {
        const sign = value > 0 ? '+' : '';
        return `${key}: ${sign}${value.toFixed(1)}`;
      })
      .join('\n');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadIssues(true);
  };

  // Header component to be reused
  const renderHeader = () => (
    <View style={styles.topHeader}>
      <Text style={styles.topHeaderTitle}>Issues</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications" size={24} color={themeColor} />
          {notificationCount > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: '#EF4444' }]}>
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
  );

  // Render main content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading issues...</Text>
        </View>
      );
    }

    if (issues.length === 0) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
          }
        >
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No Active Issues</Text>
          <Text style={styles.emptyText}>Your nation is running smoothly for now</Text>
          
          <View style={[styles.nextIssueTimer, timerDisplay === 'Available now!' && styles.generatingTimer]}>
            <Ionicons 
              name={timerDisplay === 'Available now!' ? "hourglass" : "time-outline"} 
              size={20} 
              color={timerDisplay === 'Available now!' ? "#F59E0B" : "#22C55E"} 
            />
            <Text style={[styles.nextIssueLabel, timerDisplay === 'Available now!' && styles.generatingLabel]}>
              {timerDisplay === 'Available now!' ? 'Generating...' : 'Next issue in:'}
            </Text>
            {timerDisplay !== 'Available now!' && (
              <Text style={styles.nextIssueTime}>{timerDisplay}</Text>
            )}
          </View>
          
          <Text style={styles.timerHint}>3 issues per day, every 8 hours</Text>
        </ScrollView>
      );
    }

    return null; // Will render issue list below
  };

  // Always render wrapper with modal
  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
      
      {!loading && issues.length > 0 && (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >
        <Text style={styles.header}>Pending Issues</Text>
        <Text style={styles.subheader}>Your nation awaits your decisions</Text>

        {issues.map((issue) => (
          <TouchableOpacity
            key={issue.id || issue._id}
            style={styles.issueCard}
            onPress={() => setSelectedIssue(issue)}
          >
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.issueCardGradient}>
              <Text style={styles.issueCardTitle}>{issue.title}</Text>
              <Text style={styles.issueCardPreview} numberOfLines={3}>
                {issue.description}
              </Text>
              <View style={styles.issueCardFooter}>
                <Text style={styles.choiceCount}>{issue.choices.length} options</Text>
                <Text style={styles.viewButton}>View →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
      
      {selectedIssue && (
      <Modal visible={!!selectedIssue} animationType="slide" onRequestClose={() => setSelectedIssue(null)}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedIssue(null)}>
            <Text style={styles.backButtonText}>← Back to Issues</Text>
          </TouchableOpacity>

          <Text style={styles.issueTitle}>{selectedIssue.title}</Text>
          <Text style={styles.issueDescription}>{selectedIssue.description}</Text>

          <Text style={styles.choicesHeader}>How will you respond?</Text>

          {selectedIssue.choices.map((choice, index) => (
            <TouchableOpacity
              key={index}
              style={styles.choiceCard}
              onPress={() => handleDecision(selectedIssue, index)}
              disabled={submitting}
            >
              <View style={styles.choiceNumber}>
                <Text style={styles.choiceNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.choiceText}>{choice.text}</Text>
              <Text style={styles.choiceDescription}>{choice.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {submitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Processing decision...</Text>
          </View>
        )}
      </View>
      </Modal>
      )}
      
      <ResultsModal
        visible={showResultsModal}
        statChanges={statChanges}
        policyCreated={policyCreated}
        onClose={() => {
          setShowResultsModal(false);
          setPolicyCreated(null);
        }}
      />
    </View>
  );
}

// Results Modal Component
function ResultsModal({ 
  visible, 
  statChanges, 
  policyCreated,
  onClose 
}: { 
  visible: boolean; 
  statChanges: Record<string, number>; 
  policyCreated: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.modalTitle}>Decision Made!</Text>
            <Text style={styles.modalSubtitle}>Your choice has shaped the nation</Text>
          </View>

          {policyCreated && (
            <View style={styles.policyCreatedContainer}>
              <Ionicons name="newspaper" size={32} color="#F59E0B" />
              <Text style={styles.policyCreatedText}>New Law Enacted!</Text>
              <Text style={styles.policyCreatedName}>{policyCreated}</Text>
              <Text style={styles.policyCreatedHint}>View in Policies page</Text>
            </View>
          )}

          <View style={styles.statsChangesContainer}>
            <Text style={styles.statsChangesHeader}>Stat Changes:</Text>
            {Object.entries(statChanges).map(([stat, value]) => (
              <View key={stat} style={styles.statChangeRow}>
                <Text style={styles.statChangeName}>{stat}</Text>
                <Text
                  style={[
                    styles.statChangeValue,
                    { color: value > 0 ? '#10B981' : '#EF4444' }
                  ]}
                >
                  {value > 0 ? '+' : ''}{value.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
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
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
  },
  issueCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  issueCardGradient: {
    padding: 20,
  },
  issueCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  issueCardPreview: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 16,
  },
  issueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choiceCount: {
    fontSize: 12,
    color: '#64748B',
  },
  viewButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  issueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  issueDescription: {
    fontSize: 16,
    color: '#CBD5E1',
    lineHeight: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  choicesHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  choiceCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  choiceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  choiceNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  choiceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  choiceDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  effectsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  effectsLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  effectText: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  nextIssueTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    gap: 8,
    marginBottom: 12,
  },
  nextIssueLabel: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
  },
  nextIssueTime: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerHint: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  generatingTimer: {
    borderColor: '#F59E0B',
  },
  generatingLabel: {
    color: '#F59E0B',
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  policyCreatedContainer: {
    backgroundColor: '#F59E0B22',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  policyCreatedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginTop: 12,
    marginBottom: 8,
  },
  policyCreatedName: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  policyCreatedHint: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  statsChangesContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statsChangesHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  statChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statChangeName: {
    fontSize: 15,
    color: '#E2E8F0',
    flex: 1,
  },
  statChangeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
