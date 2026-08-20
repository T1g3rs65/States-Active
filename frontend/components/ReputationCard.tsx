import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';

interface ReputationEvent {
  id: string;
  event_type: string;
  description: string;
  reputation_change: number;
  related_nation_name?: string;
  related_alliance_name?: string;
  timestamp: string;
}

interface ReputationData {
  nation_id: string;
  nation_name: string;
  overall_score: number;
  alliance_reliability: number;
  diplomatic_standing: number;
  alliances_formed: number;
  alliances_broken: number;
  alliances_honored: number;
  betrayal_rate: number;
  recent_events: ReputationEvent[];
}

interface ReputationCardProps {
  nationId: string;
  themeColor?: string;
  compact?: boolean;
  onPress?: () => void;
}

export const ReputationCard: React.FC<ReputationCardProps> = ({
  nationId,
  themeColor = '#00E0C7',
  compact = false,
  onPress,
}) => {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadReputation();
  }, [nationId]);

  const loadReputation = async () => {
    try {
      setLoading(true);
      const result = await api.getNationReputation(nationId);
      if (result.success) {
        setReputation(result.reputation);
      }
    } catch (error) {
      console.error('Error loading reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReputationLevel = (score: number): { label: string; color: string; icon: string } => {
    if (score >= 180) return { label: 'Legendary', color: '#FFD700', icon: 'star' };
    if (score >= 150) return { label: 'Renowned', color: '#27D17A', icon: 'shield-checkmark' };
    if (score >= 120) return { label: 'Respected', color: '#00E0C7', icon: 'thumbs-up' };
    if (score >= 80) return { label: 'Neutral', color: 'rgba(243,246,250,0.70)', icon: 'remove' };
    if (score >= 50) return { label: 'Questionable', color: '#F2C94C', icon: 'alert' };
    if (score >= 20) return { label: 'Untrustworthy', color: '#FF5A65', icon: 'warning' };
    return { label: 'Infamous', color: '#FF5A65', icon: 'skull' };
  };

  const getReliabilityLevel = (score: number): { label: string; color: string } => {
    if (score >= 150) return { label: 'Unbreakable', color: '#27D17A' };
    if (score >= 100) return { label: 'Reliable', color: '#00E0C7' };
    if (score >= 50) return { label: 'Questionable', color: '#F2C94C' };
    return { label: 'Unreliable', color: '#FF5A65' };
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={themeColor} />
      </View>
    );
  }

  if (!reputation) {
    return null;
  }

  const repLevel = getReputationLevel(reputation.overall_score);
  const reliabilityLevel = getReliabilityLevel(reputation.alliance_reliability);

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: repLevel.color }]}
        onPress={onPress || (() => setExpanded(!expanded))}
        activeOpacity={0.7}
      >
        <Ionicons name={repLevel.icon as any} size={16} color={repLevel.color} />
        <Text style={[styles.compactLabel, { color: repLevel.color }]}>{repLevel.label}</Text>
        <Text style={styles.compactScore}>{reputation.overall_score}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { borderColor: themeColor }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="ribbon" size={20} color={themeColor} />
          <Text style={styles.headerTitle}>Reputation</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.levelBadge, { backgroundColor: repLevel.color + '20' }]}>
            <Ionicons name={repLevel.icon as any} size={14} color={repLevel.color} />
            <Text style={[styles.levelText, { color: repLevel.color }]}>{repLevel.label}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="rgba(243,246,250,0.48)"
          />
        </View>
      </TouchableOpacity>

      {/* Score Bar */}
      <View style={styles.scoreSection}>
        <View style={styles.scoreBar}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${(reputation.overall_score / 200) * 100}%`, backgroundColor: repLevel.color }
            ]}
          />
          <View
            style={[
              styles.scoreMarker,
              { left: '50%' } // Neutral marker at 100
            ]}
          />
        </View>
        <View style={styles.scoreLabels}>
          <Text style={styles.scoreLabelLeft}>0</Text>
          <Text style={styles.scoreLabelCenter}>100</Text>
          <Text style={styles.scoreLabelRight}>200</Text>
        </View>
        <Text style={[styles.scoreValue, { color: repLevel.color }]}>
          {reputation.overall_score}
        </Text>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reputation.alliances_formed}</Text>
              <Text style={styles.statLabel}>Alliances Formed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reputation.alliances_honored}</Text>
              <Text style={styles.statLabel}>Alliances Honored</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, reputation.alliances_broken > 0 && { color: '#FF5A65' }]}>
                {reputation.alliances_broken}
              </Text>
              <Text style={styles.statLabel}>Alliances Broken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, reputation.betrayal_rate > 30 && { color: '#FF5A65' }]}>
                {reputation.betrayal_rate}%
              </Text>
              <Text style={styles.statLabel}>Betrayal Rate</Text>
            </View>
          </View>

          {/* Alliance Reliability */}
          <View style={styles.reliabilitySection}>
            <View style={styles.reliabilityHeader}>
              <Ionicons name="shield" size={16} color={reliabilityLevel.color} />
              <Text style={styles.reliabilityTitle}>Alliance Reliability</Text>
              <Text style={[styles.reliabilityValue, { color: reliabilityLevel.color }]}>
                {reliabilityLevel.label}
              </Text>
            </View>
            <View style={styles.reliabilityBar}>
              <View
                style={[
                  styles.reliabilityBarFill,
                  { width: `${(reputation.alliance_reliability / 200) * 100}%`, backgroundColor: reliabilityLevel.color }
                ]}
              />
            </View>
          </View>

          {/* Recent Events */}
          {reputation.recent_events && reputation.recent_events.length > 0 && (
            <View style={styles.eventsSection}>
              <Text style={styles.eventsSectionTitle}>Recent Activity</Text>
              {reputation.recent_events.slice(0, 5).map((event, index) => (
                <View key={event.id || index} style={styles.eventItem}>
                  <View style={[
                    styles.eventIndicator,
                    { backgroundColor: event.reputation_change >= 0 ? '#27D17A' : '#FF5A65' }
                  ]} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventDescription}>{event.description}</Text>
                    {event.related_alliance_name && (
                      <Text style={styles.eventRelated}>
                        {event.related_alliance_name}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.eventChange,
                    { color: event.reputation_change >= 0 ? '#27D17A' : '#FF5A65' }
                  ]}>
                    {event.reputation_change >= 0 ? '+' : ''}{event.reputation_change}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Inline reputation badge for use in lists
export const ReputationBadge: React.FC<{
  score: number;
  size?: 'small' | 'medium';
}> = ({ score, size = 'small' }) => {
  const getColor = () => {
    if (score >= 150) return '#27D17A';
    if (score >= 100) return '#00E0C7';
    if (score >= 50) return '#F2C94C';
    return '#FF5A65';
  };

  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: getColor() + '20', borderColor: getColor() },
      isSmall && styles.badgeSmall
    ]}>
      <Ionicons
        name="ribbon"
        size={isSmall ? 10 : 12}
        color={getColor()}
      />
      <Text style={[
        styles.badgeText,
        { color: getColor() },
        isSmall && styles.badgeTextSmall
      ]}>
        {score}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  containerCompact: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#11171F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactScore: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreSection: {
    marginTop: 16,
  },
  scoreBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: 'rgba(243,246,250,0.48)',
    marginLeft: -1,
  },
  scoreLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scoreLabelLeft: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.48)',
  },
  scoreLabelCenter: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.48)',
  },
  scoreLabelRight: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.48)',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#0B0F14',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
    textAlign: 'center',
  },
  reliabilitySection: {
    marginTop: 16,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reliabilityTitle: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    flex: 1,
  },
  reliabilityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  reliabilityBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  reliabilityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  eventsSection: {
    marginTop: 16,
  },
  eventsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventContent: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
  },
  eventRelated: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
  eventChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
});

export default ReputationCard;
