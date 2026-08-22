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
import { Ionicons } from '@expo/vector-icons';
import { useRouter , useFocusEffect } from 'expo-router';
import { getRaceTheme } from '../../utils/raceColors';
import { leaningColor, leaningWash } from '../../utils/politicalCompass';
import { colors, typography, spacing, radii } from '../../utils/theme';
import { TabChrome } from '../../components/ScreenHeader';

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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);

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
    <TabChrome title="Issues" subtitle="Decisions" badge={notificationCount} />
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
              color={timerDisplay === 'Available now!' ? "#F2C94C" : "#27D17A"} 
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
    <View style={[styles.container, { backgroundColor: leaningWash(nation, 0.06) }]}>
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
        <Text style={styles.subheader}>Pick one.</Text>

        {issues.map((issue) => (
          <TouchableOpacity
            key={issue.id || issue._id}
            style={[
              styles.issueCard,
              { borderColor: themeColor, borderLeftWidth: 4, backgroundColor: leaningWash(nation, 0.08) },
            ]}
            onPress={() => setSelectedIssue(issue)}
          >
            <View style={styles.issueCardInner}>
              <Text style={[styles.issueCardTitle, { color: themeColor }]}>{issue.title}</Text>
              <Text style={styles.issueCardPreview} numberOfLines={3}>
                {issue.description}
              </Text>
              <View style={styles.issueCardFooter}>
                <Text style={styles.choiceCount}>{issue.choices.length} options</Text>
                <Text style={styles.viewButton}>Open</Text>
              </View>
            </View>
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
            <ActivityIndicator size="large" color="#00E0C7" />
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
            <Ionicons name="checkmark-circle" size={64} color="#27D17A" />
            <Text style={styles.modalTitle}>Decision Made!</Text>
            <Text style={styles.modalSubtitle}>Your choice has shaped the nation</Text>
          </View>

          {policyCreated && (
            <View style={styles.policyCreatedContainer}>
              <Ionicons name="newspaper" size={32} color="#F2C94C" />
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
                    { color: value > 0 ? '#27D17A' : '#FF5A65' }
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
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topHeaderTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 8,
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
    padding: spacing.md,
  },
  header: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: 6,
  },
  subheader: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 20,
  },
  issueCard: {
    marginBottom: 12,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueCardInner: {
    padding: 16,
    backgroundColor: colors.surfaceSolid,
  },
  issueCardTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: 8,
  },
  issueCardPreview: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 14,
  },
  issueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choiceCount: {
    ...typography.small,
    color: colors.text.muted,
  },
  viewButton: {
    ...typography.small,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.accent.primary,
    fontSize: 15,
  },
  issueTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: 12,
  },
  issueDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 24,
    padding: 14,
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choicesHeader: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: 12,
  },
  choiceCard: {
    backgroundColor: colors.surfaceSolid,
    padding: 16,
    borderRadius: radii.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  choiceNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  choiceNumberText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceText: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  choiceDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  effectsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  effectsLabel: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: 4,
  },
  effectText: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: 6,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  nextIssueTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: 8,
    marginBottom: 12,
  },
  nextIssueLabel: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '500',
  },
  nextIssueTime: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  timerHint: {
    color: colors.text.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  generatingTimer: {
    borderColor: colors.warning,
  },
  generatingLabel: {
    color: colors.warning,
  },
  generateButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.sm,
  },
  generateButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.secondary,
    fontSize: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: 22,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginTop: 10,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  policyCreatedContainer: {
    backgroundColor: 'rgba(232,195,106,0.1)',
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  policyCreatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginTop: 10,
    marginBottom: 6,
  },
  policyCreatedName: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  policyCreatedHint: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  statsChangesContainer: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 20,
  },
  statsChangesHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 10,
  },
  statChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statChangeName: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  statChangeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  modalButton: {
    backgroundColor: colors.accent.primary,
    padding: 14,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
