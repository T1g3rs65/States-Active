import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

interface World {
  id: string;
  _id?: string;
  name: string;
  description: string;
  seed: number;
  max_players: number;
  nation_count: number;
  enabled_races: string[];
  owner_nation_name?: string;
  is_active: boolean;
  created_at: string;
}

const RACE_INFO: Record<string, { name: string; emoji: string }> = {
  human: { name: 'Human', emoji: '👤' },
  zythera: { name: 'Zythera', emoji: '🐛' },
};

export default function ServerSelectScreen() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create world form
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldDescription, setNewWorldDescription] = useState('');
  const [newWorldSeed, setNewWorldSeed] = useState(Math.floor(Math.random() * 999999).toString());
  const [newWorldMaxPlayers, setNewWorldMaxPlayers] = useState('50');
  const [allowsMigration, setAllowsMigration] = useState(true);
  const [enabledRaces, setEnabledRaces] = useState<Record<string, boolean>>({
    human: true,
    zythera: true,
  });

  useEffect(() => {
    loadWorlds();
  }, []);

  const loadWorlds = async () => {
    try {
      setLoading(true);
      const response = await api.getWorlds();
      if (response.success) {
        setWorlds(response.worlds || []);
        
        // Auto-select first world if available
        if (response.worlds && response.worlds.length > 0) {
          setSelectedWorld(response.worlds[0].id || response.worlds[0]._id);
        }
      }
    } catch (error) {
      console.error('Error loading worlds:', error);
      Alert.alert('Error', 'Failed to load worlds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      Alert.alert('Error', 'Please enter a world name');
      return;
    }

    const enabledRacesList = Object.entries(enabledRaces)
      .filter(([_, enabled]) => enabled)
      .map(([race]) => race);

    if (enabledRacesList.length === 0) {
      Alert.alert('Error', 'Please enable at least one race');
      return;
    }

    setCreating(true);
    try {
      const response = await api.createWorld({
        name: newWorldName.trim(),
        description: newWorldDescription.trim(),
        seed: parseInt(newWorldSeed) || Math.floor(Math.random() * 999999),
        max_players: parseInt(newWorldMaxPlayers) || 50,
        enabled_races: enabledRacesList,
        allows_migration: allowsMigration,
      });

      if (response.success) {
        Alert.alert('Success', `World "${newWorldName}" created!`);
        setShowCreateModal(false);
        resetForm();
        await loadWorlds();
        // Select the newly created world
        if (response.world?.id) {
          setSelectedWorld(response.world.id);
        }
      } else {
        Alert.alert('Error', response.detail || 'Failed to create world');
      }
    } catch (error: any) {
      console.error('Error creating world:', error);
      Alert.alert('Error', error.message || 'Failed to create world');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewWorldName('');
    setNewWorldDescription('');
    setNewWorldSeed(Math.floor(Math.random() * 999999).toString());
    setNewWorldMaxPlayers('50');
    setAllowsMigration(true);
    setEnabledRaces({ human: true, zythera: true });
  };

  const handleContinue = async () => {
    if (!selectedWorld) {
      Alert.alert('Error', 'Please select a world');
      return;
    }

    // Save selected world ID for nation creation
    await AsyncStorage.setItem('selected_world_id', selectedWorld);
    
    // Find the selected world to pass enabled races
    const world = worlds.find(w => (w.id || w._id) === selectedWorld);
    if (world) {
      await AsyncStorage.setItem('world_enabled_races', JSON.stringify(world.enabled_races));
    }
    
    router.push('/quiz');
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0B0F14', '#11171F', 'rgba(255,255,255,0.08)']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E0C7" />
          <Text style={styles.loadingText}>Loading worlds...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0B0F14', '#11171F', 'rgba(255,255,255,0.08)']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#00E0C7" />
          </TouchableOpacity>
          <Text style={styles.title}>🌍 World Browser</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.createButton}>
            <Ionicons name="add-circle" size={28} color="#27D17A" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
            Select a world to join or create your own
          </Text>

          {/* Worlds List */}
          {worlds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={60} color="rgba(243,246,250,0.48)" />
              <Text style={styles.emptyText}>No worlds yet</Text>
              <Text style={styles.emptySubtext}>Be the first to create a world!</Text>
              <TouchableOpacity 
                style={styles.createFirstButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color="#F3F6FA" />
                <Text style={styles.createFirstButtonText}>Create World</Text>
              </TouchableOpacity>
            </View>
          ) : (
            worlds.map((world) => {
              const worldId = world.id || world._id;
              const isSelected = selectedWorld === worldId;
              
              return (
                <TouchableOpacity
                  key={worldId}
                  style={[styles.worldCard, isSelected && styles.worldCardSelected]}
                  onPress={() => setSelectedWorld(worldId!)}
                >
                  <View style={styles.worldInfo}>
                    <View style={styles.worldHeader}>
                      <Text style={styles.worldName}>{world.name}</Text>
                      <View style={styles.playerBadge}>
                        <Ionicons name="people" size={14} color="#00E0C7" />
                        <Text style={styles.playerCount}>
                          {world.nation_count}/{world.max_players}
                        </Text>
                      </View>
                    </View>
                    
                    {world.description ? (
                      <Text style={styles.worldDescription} numberOfLines={2}>
                        {world.description}
                      </Text>
                    ) : null}
                    
                    <View style={styles.worldMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="dice" size={12} color="rgba(243,246,250,0.48)" />
                        <Text style={styles.metaText}>Seed: {world.seed}</Text>
                      </View>
                      
                      <View style={styles.metaItem}>
                        <Text style={styles.metaText}>
                          {world.enabled_races.map(r => RACE_INFO[r]?.emoji || '❓').join(' ')}
                        </Text>
                      </View>
                      
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar" size={12} color="rgba(243,246,250,0.48)" />
                        <Text style={styles.metaText}>{formatDate(world.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color="#27D17A" />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Continue Button */}
        {worlds.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueButton, !selectedWorld && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!selectedWorld}
            >
              <Text style={styles.continueButtonText}>Enter World</Text>
              <Ionicons name="arrow-forward" size={20} color="#F3F6FA" />
            </TouchableOpacity>
          </View>
        )}

        {/* Create World Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🌍 Create New World</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color="rgba(243,246,250,0.70)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* World Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>World Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newWorldName}
                    onChangeText={setNewWorldName}
                    placeholder="e.g., Terra Nova"
                    placeholderTextColor="rgba(243,246,250,0.48)"
                    maxLength={50}
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={newWorldDescription}
                    onChangeText={setNewWorldDescription}
                    placeholder="A brief description of your world..."
                    placeholderTextColor="rgba(243,246,250,0.48)"
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                </View>

                {/* Map Seed */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Map Seed</Text>
                  <View style={styles.seedRow}>
                    <TextInput
                      style={[styles.formInput, styles.seedInput]}
                      value={newWorldSeed}
                      onChangeText={setNewWorldSeed}
                      placeholder="123456"
                      placeholderTextColor="rgba(243,246,250,0.48)"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity 
                      style={styles.randomButton}
                      onPress={() => setNewWorldSeed(Math.floor(Math.random() * 999999).toString())}
                    >
                      <Ionicons name="shuffle" size={20} color="#00E0C7" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formHint}>Same seed = same map terrain</Text>
                </View>

                {/* Max Players */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Max Players</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newWorldMaxPlayers}
                    onChangeText={setNewWorldMaxPlayers}
                    placeholder="50"
                    placeholderTextColor="rgba(243,246,250,0.48)"
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                {/* Enabled Races */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Enabled Races</Text>
                  {Object.entries(RACE_INFO).map(([raceId, info]) => (
                    <View key={raceId} style={styles.raceRow}>
                      <Text style={styles.raceName}>{info.emoji} {info.name}</Text>
                      <Switch
                        value={enabledRaces[raceId] || false}
                        onValueChange={(value) => 
                          setEnabledRaces(prev => ({ ...prev, [raceId]: value }))
                        }
                        trackColor={{ false: 'rgba(255,255,255,0.08)', true: '#27D17A' }}
                        thumbColor="#F3F6FA"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.createWorldButton}
                  onPress={handleCreateWorld}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#F3F6FA" size="small" />
                  ) : (
                    <>
                      <Ionicons name="planet" size={18} color="#F3F6FA" />
                      <Text style={styles.createWorldButtonText}>Create World</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  createButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#11171F',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 8,
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27D17A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createFirstButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  worldCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  worldCardSelected: {
    borderColor: '#27D17A',
  },
  worldInfo: {
    flex: 1,
  },
  worldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  worldName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    flex: 1,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  playerCount: {
    fontSize: 13,
    color: '#00E0C7',
    fontWeight: '600',
  },
  worldDescription: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
  },
  worldMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  continueButton: {
    backgroundColor: '#00E0C7',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  continueButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#11171F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F6FA',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 14,
    color: '#F3F6FA',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
  },
  seedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  seedInput: {
    flex: 1,
  },
  randomButton: {
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  raceName: {
    fontSize: 16,
    color: '#F3F6FA',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    fontWeight: '600',
  },
  createWorldButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#27D17A',
    gap: 8,
  },
  createWorldButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
});
