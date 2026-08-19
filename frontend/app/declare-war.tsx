import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../utils/api';

export default function DeclareWarScreen() {
  const { defenderId, defenderName, attackerId } = useLocalSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDeclareWar = async (casusBelli: string, repPenalty: number, label: string) => {
    if (loading) return;
    
    setError(null);
    setLoading(true);
    
    try {
      // Show we're starting
      console.log('Starting war declaration...', { attackerId, defenderId, casusBelli });
      
      const response = await api.declareWar(attackerId as string, defenderId as string, casusBelli);
      
      console.log('Got response:', JSON.stringify(response));
      
      if (response.success && response.war) {
        console.log('Success! War ID:', response.war._id);
        // Small delay to ensure state updates
        setTimeout(() => {
          router.replace(`/war-dashboard?warId=${response.war._id}&nationId=${attackerId}`);
        }, 100);
      } else {
        const errorMsg = response.message || response.detail || 'Failed to declare war - no error message';
        console.error('War failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Exception caught:', error);
      const errorMsg = error.message || error.toString() || 'Unknown error occurred';
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Declare War</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.warningCard}>
          <Text style={styles.warningEmoji}>⚔️</Text>
          <Text style={styles.targetText}>Target: {defenderName}</Text>
          <Text style={styles.warningText}>
            Choose your reason for war. This action will have serious consequences.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Casus Belli:</Text>

        <TouchableOpacity
          style={[styles.optionCard, loading && styles.disabled]}
          onPress={() => handleDeclareWar('ideological_conflict', -5, 'Ideological Conflict')}
          disabled={loading}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>⚖️ Ideological Conflict</Text>
            <View style={styles.repBadge}>
              <Text style={styles.repText}>-5 Rep</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Declare war due to conflicting political ideologies. Moderate reputation penalty.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, loading && styles.disabled]}
          onPress={() => handleDeclareWar('resource_competition', -10, 'Resource Competition')}
          disabled={loading}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>💎 Resource Competition</Text>
            <View style={[styles.repBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.repText}>-10 Rep</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Fight for control of valuable resources. Significant reputation penalty.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, styles.dangerCard, loading && styles.disabled]}
          onPress={() => handleDeclareWar('aggressive_expansion', -20, 'Aggressive Expansion')}
          disabled={loading}
        >
          <View style={styles.optionHeader}>
            <Text style={[styles.optionTitle, { color: '#EF4444' }]}>🔥 Aggressive Expansion</Text>
            <View style={[styles.repBadge, { backgroundColor: '#DC2626' }]}>
              <Text style={styles.repText}>-20 Rep</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Pure conquest and expansion. Severe reputation penalty - you'll be seen as a warmonger.
          </Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>⏳ Declaring war...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>❌ Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => {
                setError(null);
                router.back();
              }}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚠️ War Consequences:</Text>
          <Text style={styles.infoText}>• Wars last until one side reaches ±80 war score or 30 days</Text>
          <Text style={styles.infoText}>• Loser pays tribute (resources + GDP) for 12-24 months</Text>
          <Text style={styles.infoText}>• Truce prevents new wars during tribute period</Text>
          <Text style={styles.infoText}>• Both sides suffer casualties and economic damage</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#EF4444',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  warningEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  targetText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dangerCard: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    flex: 1,
  },
  repBadge: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  repText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FEE2E2',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FECACA',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 4,
  },
});
