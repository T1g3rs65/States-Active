import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { useAccountStore } from '../store/accountStore';
import { DEFAULT_TERRAIN, TerrainSettings } from '../utils/worldNoise';
import { rasterizeWorldPreview } from '../utils/worldPreview';
import { glassAlert, glassConfirm } from '../components/GlassModal';
import ScreenCanvas from '../components/ScreenCanvas';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import StatusDots, { ButtonBusy } from '../components/StatusDots';

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
  owner_nation_name?: string;
  is_active: boolean;
  created_at: string;
}

const RACE_INFO: Record<string, { name: string; icon: 'person' | 'bug' }> = {
  human: { name: 'Human', icon: 'person' },
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
  value: number;
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

export default function ServerSelectScreen() {
  const router = useRouter();
  const { user, loadSession } = useAccountStore();
  const isAdmin = !!user?.is_admin;
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
        
        // Auto-select first world if available
        if (response.worlds && response.worlds.length > 0) {
          setSelectedWorld(response.worlds[0].id || response.worlds[0]._id);
        }
      }
    } catch (error) {
      console.error('Error loading worlds:', error);
      await glassAlert({ title: 'Error', message: 'Failed to load worlds. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      await glassAlert({ title: 'Error', message: 'Please enter a world name' });
      return;
    }

    const enabledRacesList = Object.entries(enabledRaces)
      .filter(([_, enabled]) => enabled)
      .map(([race]) => race);

    if (enabledRacesList.length === 0) {
      await glassAlert({ title: 'Error', message: 'Please enable at least one race' });
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
      });

      if (!response?.success) {
        throw new Error(response?.detail || 'Failed to create world');
      }
      const newId = response.world?.id;
      setShowCreateModal(false);
      resetForm();
      await loadWorlds();
      if (newId) setSelectedWorld(newId);
    } catch (error: any) {
      console.error('Error creating world:', error);
      await glassAlert({ title: 'Error', message: error.message || 'Failed to create world' });
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
    setEnabledRaces({ human: true });
    setTerrain({ ...DEFAULT_TERRAIN });
  };

  const handleContinue = async () => {
    if (!selectedWorld) {
      await glassAlert({ title: 'Error', message: 'Please select a world' });
      return;
    }

    // Save selected world ID for nation creation
    await AsyncStorage.setItem('selected_world_id', selectedWorld);
    
    // Find the selected world to pass enabled races
    const world = worlds.find(w => (w.id || w._id) === selectedWorld);
    if (world) {
      await AsyncStorage.setItem('world_enabled_races', JSON.stringify(world.enabled_races));
    }
    
    router.push('/wheels');
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
      <ScreenCanvas>
        <View style={styles.loadingContainer}>
          <StatusDots status="Loading" color="#F3F6FA" />
          <Text style={styles.loadingText}>Loading worlds...</Text>
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <ScreenHeader
          title="Worlds"
          subtitle="Pick a realm"
          onBack={handleBack}
          right={
            isAdmin ? (
              <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ padding: 6 }}>
                <Ionicons name="add" size={22} color="#F3F6FA" />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
            {isAdmin ? 'Create the official world, or join an existing one.' : 'Join a world to found your nation.'}
          </Text>

          {worlds.length === 0 ? (
            <LiquidGlass radius={28} style={styles.emptyState}>
              <Ionicons name="planet-outline" size={48} color="rgba(243,246,250,0.7)" />
              <Text style={styles.emptyText}>No worlds yet</Text>
              <Text style={styles.emptySubtext}>
                {isAdmin ? 'Create the first official world.' : 'An admin has to create a world first.'}
              </Text>
              {isAdmin ? (
              <TouchableOpacity 
                style={styles.createFirstButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={18} color="#000" />
                <Text style={styles.createFirstButtonText}>Create World</Text>
              </TouchableOpacity>
              ) : null}
            </LiquidGlass>
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
                        {world.enabled_races.map((r) => (
                          <Ionicons key={r} name={RACE_INFO[r]?.icon || 'help'} size={14} color="rgba(243,246,250,0.7)" />
                        ))}
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
            <LiquidGlass dense radius={28} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create world</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={22} color="rgba(243,246,250,0.75)" />
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
                      <Ionicons name="shuffle" size={20} color="#F3F6FA" />
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
                  <Text style={styles.formHint}>Fast heightmap — the live map is Voronoi of this field</Text>
                </View>

                <Knob
                  label="Continent size"
                  hint="Lower = larger landmasses"
                  value={terrain.continentFreq}
                  display={(1 / terrain.continentFreq / 100).toFixed(1)}
                  onMinus={() => setTerrain(t => ({ ...t, continentFreq: Math.max(0.0008, +(t.continentFreq - 0.0003).toFixed(4)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, continentFreq: Math.min(0.006, +(t.continentFreq + 0.0003).toFixed(4)) }))}
                />
                <Knob
                  label="Land vs ocean"
                  hint="Higher = more land"
                  value={1 - terrain.landThreshold}
                  display={`${Math.round((1 - terrain.landThreshold) * 100)}%`}
                  onMinus={() => setTerrain(t => ({ ...t, landThreshold: Math.min(0.58, +(t.landThreshold + 0.02).toFixed(2)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, landThreshold: Math.max(0.32, +(t.landThreshold - 0.02).toFixed(2)) }))}
                />
                <Knob
                  label="Mountains"
                  hint="Ridged noise"
                  value={terrain.ridgeAmount}
                  display={terrain.ridgeAmount.toFixed(2)}
                  onMinus={() => setTerrain(t => ({ ...t, ridgeAmount: Math.max(0.08, +(t.ridgeAmount - 0.05).toFixed(2)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, ridgeAmount: Math.min(0.7, +(t.ridgeAmount + 0.05).toFixed(2)) }))}
                />
                <Knob
                  label="Coast detail"
                  hint="Local hills and bays"
                  value={terrain.detailFreq}
                  display={terrain.detailFreq.toFixed(3)}
                  onMinus={() => setTerrain(t => ({ ...t, detailFreq: Math.max(0.004, +(t.detailFreq - 0.002).toFixed(3)) }))}
                  onPlus={() => setTerrain(t => ({ ...t, detailFreq: Math.min(0.03, +(t.detailFreq + 0.002).toFixed(3)) }))}
                />
                <Knob
                  label="Continent weight"
                  hint="Big shapes vs local noise"
                  value={terrain.continentWeight}
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

                {/* Enabled Races */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Enabled Races</Text>
                  {Object.entries(RACE_INFO).map(([raceId, info]) => (
                    <View key={raceId} style={styles.raceRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={info.icon} size={16} color="#F3F6FA" />
                        <Text style={styles.raceName}>{info.name}</Text>
                      </View>
                      <Switch
                        value={enabledRaces[raceId] || false}
                        onValueChange={(value) => 
                          setEnabledRaces(prev => ({ ...prev, [raceId]: value }))
                        }
                        trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(243,246,250,0.55)' }}
                        thumbColor="#F3F6FA"
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={async () => {
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
                  <ButtonBusy busy={creating} color="#081014">
                    <Ionicons name="planet" size={18} color="#000" />
                    <Text style={styles.createWorldButtonText}>Create World</Text>
                  </ButtonBusy>
                </TouchableOpacity>
              </View>
            </LiquidGlass>
          </View>
        </Modal>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    paddingVertical: 36,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.55)',
    marginTop: 8,
    textAlign: 'center',
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 8,
    marginTop: 16,
  },
  createFirstButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  worldCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  worldCardSelected: {
    borderColor: 'rgba(243,246,250,0.45)',
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
    color: '#F3F6FA',
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
    backgroundColor: '#F3F6FA',
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
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    overflow: 'hidden',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#F3F6FA',
    letterSpacing: -0.3,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  formInput: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    padding: 14,
    color: '#F3F6FA',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
  },
  randomButton: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  createWorldButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#F3F6FA',
    gap: 8,
    overflow: 'hidden',
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
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
  },
  previewEmpty: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  seedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  seedInput: {
    flex: 1,
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
  cancelButtonText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    fontWeight: '600',
  },
  createWorldButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
