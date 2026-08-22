import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../utils/api';
import ScreenHeader from '../components/ScreenHeader';

function leaveWarRoom() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/advisors');
}

export default function WarDashboard() {
  const { warId, nationId } = useLocalSearchParams();
  const [war, setWar] = useState<any>(null);
  const [participants, setParticipants] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [battleTimerDisplay, setBattleTimerDisplay] = useState<string>('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadWarDetails();
    
    // Poll every 30 seconds to update timer and check for battles
    pollIntervalRef.current = setInterval(() => {
      loadWarDetails(true);
    }, 30000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [warId]);

  const loadWarDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.getWarDetails(warId as string);
      setWar(response.war);
      setBattleTimerDisplay(response.war?.battle_timer_display || '');
      
      // Load participants
      const participantsResponse = await api.getWarParticipants(warId as string);
      if (participantsResponse.success) {
        setParticipants(participantsResponse.participants);
      }
    } catch (error) {
      console.error('Failed to load war:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSurrender = () => {
    Alert.alert(
      'Surrender?',
      'Are you sure you want to surrender? This will end the war with devastating consequences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Surrender',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.surrenderWar(warId as string, nationId as string);
              Alert.alert('War Ended', 'You have surrendered.');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to surrender');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="War Room" subtitle="Loading" onBack={leaveWarRoom} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A65" />
          <Text style={styles.loadingText}>Loading War Status...</Text>
        </View>
      </View>
    );
  }

  if (!war) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="War Room" subtitle="No war" onBack={leaveWarRoom} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No active war.</Text>
          <TouchableOpacity onPress={leaveWarRoom} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check if current user is a participant in this war
  const isParticipant = nationId && (war.attacker_id === nationId || war.defender_id === nationId);
  const isAttacker = war.attacker_id === nationId;
  const myNation = isParticipant ? (isAttacker ? war.attacker_name : war.defender_name) : null;
  const enemyNation = isParticipant ? (isAttacker ? war.defender_name : war.attacker_name) : null;
  
  // Calculate war score from perspective (attacker's perspective if spectating)
  const displayScore = isAttacker ? war.war_score : -war.war_score;
  const scoreColor = displayScore > 0 ? '#27D17A' : displayScore < 0 ? '#FF5A65' : 'rgba(243,246,250,0.48)';
  
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="War Room"
        subtitle={isParticipant ? 'In the field' : 'Spectating'}
        onBack={leaveWarRoom}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* War Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {war.attacker_name} vs {war.defender_name}
          </Text>
          <Text style={styles.dayText}>Day {war.day} of War</Text>
          <Text style={styles.caususBelli}>{war.casus_belli.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>

        {/* War Score */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>War Score</Text>
          <View style={styles.scoreBarContainer}>
            <View style={styles.scoreBarTrack}>
              <View 
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${50 + (displayScore / 2)}%`,
                    backgroundColor: scoreColor,
                  }
                ]} 
              />
            </View>
            <Text style={[styles.scoreText, { color: scoreColor }]}>
              {displayScore > 0 ? '+' : ''}{displayScore}
            </Text>
          </View>
          <View style={styles.scoreLabels}>
            <Text style={styles.scoreLabelLeft}>Losing (-100)</Text>
            <Text style={styles.scoreLabelCenter}>Stalemate (0)</Text>
            <Text style={styles.scoreLabelRight}>Winning (+100)</Text>
          </View>
        </View>

        {/* Next Battle Timer */}
        <View style={styles.battleTimerCard}>
          <View style={styles.battleTimerHeader}>
            <Text style={styles.battleTimerIcon}>⏰</Text>
            <Text style={styles.battleTimerTitle}>Next Battle</Text>
          </View>
          <Text style={styles.battleTimerValue}>{battleTimerDisplay || 'Loading...'}</Text>
          <Text style={styles.battleTimerHint}>
            Battles occur every 24 hours automatically
          </Text>
        </View>

        {/* War Participants */}
        {participants && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>War Participants</Text>
            
            {/* Attackers Side */}
            <View style={styles.participantsSide}>
              <Text style={styles.sideTitle}>⚔️ Attackers</Text>
              <Text style={styles.sidePower}>
                Combined Strength: {participants.total_attacker_strength}
              </Text>
              {participants.attackers?.map((attacker: any, index: number) => (
                <View key={attacker.nation_id} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <Text style={[
                      styles.participantName,
                      attacker.is_primary && styles.primaryParticipant
                    ]}>
                      {attacker.name}
                      {attacker.is_primary && ' 👑'}
                    </Text>
                    <Text style={styles.participantRace}>
                      {attacker.race} · 🗡️ {attacker.military_strength}
                    </Text>
                  </View>
                  {attacker.nation_id === nationId && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            
            <View style={styles.vsSeparator}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            
            {/* Defenders Side */}
            <View style={styles.participantsSide}>
              <Text style={styles.sideTitle}>🛡️ Defenders</Text>
              <Text style={styles.sidePower}>
                Combined Strength: {participants.total_defender_strength}
              </Text>
              {participants.defenders?.map((defender: any, index: number) => (
                <View key={defender.nation_id} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <Text style={[
                      styles.participantName,
                      defender.is_primary && styles.primaryParticipant
                    ]}>
                      {defender.name}
                      {defender.is_primary && ' 👑'}
                    </Text>
                    <Text style={styles.participantRace}>
                      {defender.race} · 🗡️ {defender.military_strength}
                    </Text>
                  </View>
                  {defender.nation_id === nationId && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            
            {war.is_vassal_war && (
              <View style={styles.vassalWarNotice}>
                <Text style={styles.vassalWarText}>
                  ⚠️ Vassal War - 1v1 Only (No allies can join)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Events */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent War Events</Text>
          {war.events && war.events.length > 0 ? (
            war.events.slice(-5).reverse().map((event: any, index: number) => (
              <View key={index} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={[
                    styles.eventScore,
                    { color: event.war_score_change > 0 ? '#27D17A' : '#FF5A65' }
                  ]}>
                    {event.war_score_change > 0 ? '+' : ''}{event.war_score_change}
                  </Text>
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <Text style={styles.eventDate}>
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noEvents}>No battles yet. War begins soon...</Text>
          )}
        </View>

        {/* Actions - Only show for participants */}
        {isParticipant && (
          <View style={styles.actionsCard}>
            <TouchableOpacity 
              style={styles.surrenderButton}
              onPress={handleSurrender}
            >
              <Text style={styles.surrenderButtonText}>🏳️ Surrender</Text>
            </TouchableOpacity>
            <Text style={styles.warningText}>
              Wars resolve automatically. Events occur daily. You can surrender at any time, but consequences will be severe.
            </Text>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(243,246,250,0.70)',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#11171F',
    borderBottomWidth: 2,
    borderBottomColor: '#FF5A65',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#FF5A65',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5A65',
    flex: 1,
  },
  spectatorBadge: {
    backgroundColor: 'rgba(243,246,250,0.48)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  spectatorText: {
    color: '#F3F6FA',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  dayText: {
    fontSize: 16,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginBottom: 4,
  },
  caususBelli: {
    fontSize: 14,
    color: '#FF5A65',
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  scoreBarContainer: {
    marginBottom: 12,
  },
  scoreBarTrack: {
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  scoreLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scoreLabelLeft: {
    fontSize: 12,
    color: '#FF5A65',
  },
  scoreLabelCenter: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  scoreLabelRight: {
    fontSize: 12,
    color: '#27D17A',
  },
  battleTimerCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F2C94C',
    alignItems: 'center',
  },
  battleTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  battleTimerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  battleTimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F2C94C',
  },
  battleTimerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 8,
  },
  battleTimerHint: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
  },
  eventScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  noEvents: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionsCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF5A65',
  },
  surrenderButton: {
    backgroundColor: '#FF5A65',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  surrenderButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  // Participants Section Styles
  participantsSide: {
    marginBottom: 8,
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  sidePower: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    marginBottom: 6,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F6FA',
  },
  primaryParticipant: {
    fontWeight: '700',
    color: '#F2C94C',
  },
  participantRace: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: '#00E0C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  vsSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  vsText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF5A65',
  },
  vassalWarNotice: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F2C94C20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F2C94C',
  },
  vassalWarText: {
    fontSize: 12,
    color: '#F2C94C',
    textAlign: 'center',
    fontWeight: '500',
  },
});
