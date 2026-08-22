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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { DEFAULT_TERRAIN, TerrainSettings } from '../utils/worldNoise';
import { rasterizeWorldPreview } from '../utils/worldPreview';

interface World {
  id: string;
  _id?: string;
  name: string;
  description: string;
  seed: number;
  max_players: number;
  nation_count: number;
  player_count?: number;
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

function Knob({
  label,
  hint,
  display,
  onMinus,
  onPlus,
}: {
  label: string;
  hint: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#F4F5F6', fontSize: 14, fontWeight: '600' }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={onMinus} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#2EE6C5', fontSize: 18, fontWeight: '700' }}>−</Text>
          </TouchableOpacity>
          <Text style={{ color: '#B4B8C0', fontSize: 13, minWidth: 48, textAlign: 'center' }}>{display}</Text>
          <TouchableOpacity onPress={onPlus} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#2EE6C5', fontSize: 18, fontWeight: '700' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ color: '#7C818A', fontSize: 11, marginTop: 4 }}>{hint}</Text>
    </View>
  );
}

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
  const [terrain, setTerrain] = useState<TerrainSettings>({ ...DEFAULT_TERRAIN });
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    loadWorlds();
  }, []);

  useEffect(() => {
    if (!showCreateModal) return;
    const seed = parseInt(newWorldSeed) || 1;
    const t = setTimeout(() => {
      setPreviewUri(rasterizeWorldPreview(seed, terrain));
    }, 80);
    return () => clearTimeout(t);
  }, [showCreateModal, newWorldSeed, terrain]);

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
        noise_settings: { ...terrain },
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
    setTerrain({ ...DEFAULT_TERRAIN });
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

        {/* Current World Badge */}
        {currentWorld && (
          <View style={styles.currentWorldBadge}>
            <Ionicons name="home" size={16} color="#27D17A" />
            <Text style={styles.currentWorldText}>
              Current World: {currentWorld.name}
            </Text>
          </View>
        )}

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E0C7" />
          }
        >
          <Text style={styles.subtitle}>
            Migrate to another world or create your own
          </Text>

          {/* Worlds List */}
          {worlds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={60} color="rgba(243,246,250,0.48)" />
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
                        {isCurrentWorld && <Text style={styles.youBadge}> (You{'\u2019'}re here)</Text>}
                      </Text>
                      <View style={styles.playerBadge}>
                        <Ionicons name="people" size={14} color="#00E0C7" />
                        <Text style={styles.playerCount}>
                          {world.player_count ?? 0} players · {world.nation_count}/{world.max_players}
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
                      
                      {world.allows_migration ? (
                        <View style={styles.migrationBadge}>
                          <Ionicons name="airplane" size={12} color="#27D17A" />
                          <Text style={styles.migrationText}>Migration OK</Text>
                        </View>
                      ) : (
                        <View style={styles.noMigrationBadge}>
                          <Ionicons name="lock-closed" size={12} color="#FF5A65" />
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
                        <ActivityIndicator color="#F3F6FA" size="small" />
                      ) : (
                        <>
                          <Ionicons name="airplane" size={16} color="#F3F6FA" />
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

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Terrain preview</Text>
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.preview} />
                  ) : (
                    <View style={[styles.preview, styles.previewEmpty]} />
                  )}
                  <Text style={styles.formHint}>Live heightmap — same field the map uses</Text>
                </View>
                <Knob
                  label="Continent size"
                  hint="Lower = larger landmasses"
                  display={(1 / terrain.continentFreq / 100).toFixed(1)}
                  onMinus={() => setTerrain(t => ({ ...t, continentFreq: Math.max(0.0008, +(t.continentFreq - 0.0003).toFixed(4)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, continentFreq: Math.min(0.006, +(t.continentFreq + 0.0003).toFixed(4)) }))}
                />
                <Knob
                  label="Land vs ocean"
                  hint="Higher = more land"
                  display={`${Math.round((1 - terrain.landThreshold) * 100)}%`}
                  onMinus={() => setTerrain(t => ({ ...t, landThreshold: Math.min(0.58, +(t.landThreshold + 0.02).toFixed(2)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, landThreshold: Math.max(0.32, +(t.landThreshold - 0.02).toFixed(2)) }))}
                />
                <Knob
                  label="Mountains"
                  hint="Ridged noise"
                  display={terrain.ridgeAmount.toFixed(2)}
                  onMinus={() => setTerrain(t => ({ ...t, ridgeAmount: Math.max(0.08, +(t.ridgeAmount - 0.05).toFixed(2)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, ridgeAmount: Math.min(0.7, +(t.ridgeAmount + 0.05).toFixed(2)) }))}
                />
                <Knob
                  label="Coast detail"
                  hint="Local hills and bays"
                  display={terrain.detailFreq.toFixed(3)}
                  onMinus={() => setTerrain(t => ({ ...t, detailFreq: Math.max(0.004, +(t.detailFreq - 0.002).toFixed(3)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, detailFreq: Math.min(0.03, +(t.detailFreq + 0.002).toFixed(3)) }))}
                />
                <Knob
                  label="Continent weight"
                  hint="Big shapes vs local noise"
                  display={terrain.continentWeight.toFixed(2)}
                  onMinus={() => setTerrain(t => ({ ...t, continentWeight: Math.max(0.35, +(t.continentWeight - 0.05).toFixed(2)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, continentWeight: Math.min(0.9, +(t.continentWeight + 0.05).toFixed(2)) }))}
                />

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
                      trackColor={{ false: 'rgba(255,255,255,0.08)', true: '#27D17A' }}
                      thumbColor="#F3F6FA"
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
    color: '#27D17A',
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
  worldCardCurrent: {
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
  youBadge: {
    fontSize: 12,
    color: '#27D17A',
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
    gap: 12,
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
    color: '#27D17A',
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
    color: '#FF5A65',
    fontWeight: '600',
  },
  migrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E0C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  migrateButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  migrateButtonText: {
    color: '#F3F6FA',
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
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#08090A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewEmpty: {
    opacity: 0.4,
  },
});
