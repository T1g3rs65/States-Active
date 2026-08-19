import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';

interface World {
  id: string;
  _id?: string;
  name: string;
  description: string;
  seed: number;
  max_players: number;
  nation_count: number;
  enabled_races: string[];
  allows_migration: boolean;
  owner_nation_name?: string;
  is_active: boolean;
  created_at: string;
}

const RACE_INFO: Record<string, { name: string; emoji: string }> = {
  human: { name: 'Human', emoji: '👤' },
  zythera: { name: 'Zythera', emoji: '🐛' },
};

export default function WorldBrowserScreen() {
  const router = useRouter();
  const { nation, refreshNation } = useNationStore();
  const nationId = nation?.id || nation?._id;
  const currentWorldId = nation?.world_id;
  
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [migrating, setMigrating] = useState(false);
  
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
      }
    } catch (error) {
      console.error('Error loading worlds:', error);
      Alert.alert('Error', 'Failed to load worlds. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWorlds();
  }, []);

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
        creator_nation_id: nationId,
        creator_nation_name: nation?.name,
      });

      if (response.success) {
        Alert.alert('Success', `World "${newWorldName}" created!`);
        setShowCreateModal(false);
        resetForm();
        await loadWorlds();
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

  const handleMigrateToWorld = async (world: World) => {
    const worldId = world.id || world._id;
    if (!worldId || !nationId) return;
    
    // Check if this is the current world
    if (worldId === currentWorldId) {
      Alert.alert('Info', 'You are already in this world');
      return;
    }
    
    // Check if migration is allowed
    if (!world.allows_migration) {
      Alert.alert('Migration Disabled', 'This world does not allow migration from other worlds.');
      return;
    }
    
    // Check if world is full
    if (world.nation_count >= world.max_players) {
      Alert.alert('World Full', 'This world has reached its maximum player count.');
      return;
    }
    
    // Check if race is allowed
    const nationRace = nation?.race || 'human';
    if (!world.enabled_races.includes(nationRace)) {
      Alert.alert('Race Not Allowed', `Your race (${RACE_INFO[nationRace]?.name || nationRace}) is not allowed in this world.`);
      return;
    }
    
    Alert.alert(
      'Migrate to World',
      `Are you sure you want to migrate "${nation?.name}" to "${world.name}"?\n\nWarning: You will lose all your territories and need to reclaim them in the new world.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          style: 'destructive',
          onPress: async () => {
            setMigrating(true);
            try {
              const response = await api.migrateToWorld(worldId, nationId);
              if (response.success) {
                Alert.alert('Success', response.message || 'Migration successful!');
                // Refresh nation data
                await refreshNation();
                await loadWorlds();
              } else {
                Alert.alert('Error', response.detail || 'Migration failed');
              }
            } catch (error: any) {
              console.error('Error migrating:', error);
              Alert.alert('Error', error.message || 'Failed to migrate');
            } finally {
              setMigrating(false);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Find current world
  const currentWorld = worlds.find(w => (w.id || w._id) === currentWorldId);

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B', '#334155']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading worlds...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#334155']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <Text style={styles.title}>🌍 World Browser</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.createButton}>
            <Ionicons name="add-circle" size={28} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Current World Badge */}
        {currentWorld && (
          <View style={styles.currentWorldBadge}>
            <Ionicons name="home" size={16} color="#10B981" />
            <Text style={styles.currentWorldText}>
              Current World: {currentWorld.name}
            </Text>
          </View>
        )}

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        >
          <Text style={styles.subtitle}>
            Migrate to another world or create your own
          </Text>

          {/* Worlds List */}
          {worlds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={60} color="#64748B" />
              <Text style={styles.emptyText}>No worlds yet</Text>
              <Text style={styles.emptySubtext}>Be the first to create a world!</Text>
            </View>
          ) : (
            worlds.map((world) => {
              const worldId = world.id || world._id;
              const isCurrentWorld = worldId === currentWorldId;
              const canMigrate = world.allows_migration && !isCurrentWorld && world.nation_count < world.max_players;
              
              return (
                <View
                  key={worldId}
                  style={[styles.worldCard, isCurrentWorld && styles.worldCardCurrent]}
                >
                  <View style={styles.worldInfo}>
                    <View style={styles.worldHeader}>
                      <Text style={styles.worldName}>
                        {world.name}
                        {isCurrentWorld && <Text style={styles.youBadge}> (You're here)</Text>}
                      </Text>
                      <View style={styles.playerBadge}>
                        <Ionicons name="people" size={14} color="#3B82F6" />
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
                        <Ionicons name="dice" size={12} color="#64748B" />
                        <Text style={styles.metaText}>Seed: {world.seed}</Text>
                      </View>
                      
                      <View style={styles.metaItem}>
                        <Text style={styles.metaText}>
                          {world.enabled_races.map(r => RACE_INFO[r]?.emoji || '❓').join(' ')}
                        </Text>
                      </View>
                      
                      {world.allows_migration ? (
                        <View style={styles.migrationBadge}>
                          <Ionicons name="airplane" size={12} color="#10B981" />
                          <Text style={styles.migrationText}>Migration OK</Text>
                        </View>
                      ) : (
                        <View style={styles.noMigrationBadge}>
                          <Ionicons name="lock-closed" size={12} color="#EF4444" />
                          <Text style={styles.noMigrationText}>Closed</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {!isCurrentWorld && (
                    <TouchableOpacity
                      style={[styles.migrateButton, !canMigrate && styles.migrateButtonDisabled]}
                      onPress={() => handleMigrateToWorld(world)}
                      disabled={!canMigrate || migrating}
                    >
                      {migrating ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="airplane" size={16} color="#FFFFFF" />
                          <Text style={styles.migrateButtonText}>Migrate</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

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
                  <Ionicons name="close" size={24} color="#94A3B8" />
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
                    placeholderTextColor="#64748B"
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
                    placeholderTextColor="#64748B"
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
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity 
                      style={styles.randomButton}
                      onPress={() => setNewWorldSeed(Math.floor(Math.random() * 999999).toString())}
                    >
                      <Ionicons name="shuffle" size={20} color="#3B82F6" />
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
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                {/* Allow Migration */}
                <View style={styles.formGroup}>
                  <View style={styles.raceRow}>
                    <View>
                      <Text style={styles.raceName}>Allow Migration</Text>
                      <Text style={styles.formHint}>Let players migrate from other worlds</Text>
                    </View>
                    <Switch
                      value={allowsMigration}
                      onValueChange={setAllowsMigration}
                      trackColor={{ false: '#334155', true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
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
                        trackColor={{ false: '#334155', true: '#10B981' }}
                        thumbColor="#FFFFFF"
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
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="planet" size={18} color="#FFFFFF" />
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
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  createButton: {
    padding: 8,
  },
  currentWorldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  currentWorldText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1E293B',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  worldCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  worldCardCurrent: {
    borderColor: '#10B981',
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
    color: '#F8FAFC',
    flex: 1,
  },
  youBadge: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '400',
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
    color: '#3B82F6',
    fontWeight: '600',
  },
  worldDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  worldMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  migrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  migrationText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  noMigrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  noMigrationText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  migrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  migrateButtonDisabled: {
    backgroundColor: '#475569',
  },
  migrateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
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
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
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
    color: '#94A3B8',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  raceName: {
    fontSize: 16,
    color: '#F8FAFC',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#94A3B8',
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
    backgroundColor: '#10B981',
    gap: 8,
  },
  createWorldButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
