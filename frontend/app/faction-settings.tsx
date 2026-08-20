import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { getRaceTheme } from '../utils/raceColors';

const ALLIANCE_COLORS = [
  '#00E0C7', '#FF5A65', '#27D17A', '#F2C94C', '#00E0C7', 
  '#00B8B8', '#00E0C7', '#F97316', '#6366F1', '#84CC16'
];

const AVAILABLE_RACES = ['human', 'zythera'];

// Expanded political compass positions matching politicalCompass.ts
const IDEOLOGY_QUADRANTS = [
  // Authoritarian (libertarian < 35)
  { id: 'stalinist', name: 'Stalinist', color: '#991B1B', description: 'Totalitarian Communist' },
  { id: 'monarchist', name: 'Monarchist', color: '#00B8B8', description: 'Absolute Royalist' },
  { id: 'autocrat', name: 'Autocrat', color: '#78350F', description: 'Authoritarian State' },
  
  // Center-Auth (libertarian 35-50)
  { id: 'socialist', name: 'Socialist', color: '#FF5A65', description: 'Democratic Socialist' },
  { id: 'corporatist', name: 'Corporatist', color: '#00B8B8', description: 'State Capitalist' },
  { id: 'statist', name: 'Statist', color: '#71717A', description: 'Big Government' },
  
  // Center-Lib (libertarian 50-65)
  { id: 'progressive', name: 'Progressive', color: '#00B8B8', description: 'Social Democrat' },
  { id: 'centrist', name: 'Centrist', color: 'rgba(243,246,250,0.48)', description: 'Moderate Pragmatist' },
  { id: 'conservative', name: 'Conservative', color: '#0EA5E9', description: 'Traditional Capitalist' },
  
  // Libertarian (libertarian > 65)
  { id: 'anarchist', name: 'Anarchist', color: '#27D17A', description: 'Libertarian Socialist' },
  { id: 'libertarian', name: 'Libertarian', color: '#F97316', description: 'Civil Libertarian' },
  { id: 'minarchist', name: 'Minarchist', color: '#EAB308', description: 'Free Market Capitalist' },
];

export default function FactionSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const allianceId = params.id as string;
  const { nation } = useNationStore();
  
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;
  
  const nationId = nation?.id || nation?._id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alliance, setAlliance] = useState<any>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  
  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [motto, setMotto] = useState('');
  const [color, setColor] = useState('#00E0C7');
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [minReputation, setMinReputation] = useState('0');
  const [minPopulation, setMinPopulation] = useState('0');
  const [maxMembers, setMaxMembers] = useState('10');
  const [allowedRaces, setAllowedRaces] = useState<string[]>([]);
  const [allowedIdeologies, setAllowedIdeologies] = useState<string[]>([]); // Empty = all allowed
  
  // Pending requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // Role selection modal (for accepting join requests)
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Promote member modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    if (allianceId) {
      loadAlliance();
    }
  }, [allianceId]);

  const loadAlliance = async () => {
    try {
      setLoading(true);
      const result = await api.getMultiAlliance(allianceId);
      
      if (result.success && result.alliance) {
        const a = result.alliance;
        setAlliance(a);
        
        // Set form values
        setName(a.name || '');
        setDescription(a.description || '');
        setMotto(a.motto || '');
        setColor(a.color || '#00E0C7');
        setIsPublic(a.is_public ?? true);
        setRequiresApproval(a.requires_approval ?? true);
        setMinReputation(String(a.min_reputation || 0));
        setMinPopulation(String(a.min_population || 0));
        setMaxMembers(String(a.max_members || 10));
        setAllowedRaces(a.allowed_races || []);
        setAllowedIdeologies(a.allowed_ideologies || []);
        
        // Set pending requests from alliance data
        setPendingRequests(a.pending_requests || []);
        
        // Find my role
        const me = a.members?.find((m: any) => m.nation_id === nationId);
        setMyRole(me?.role || null);
      }
    } catch (error) {
      console.error('Error loading alliance:', error);
      Alert.alert('Error', 'Failed to load faction settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Faction name is required');
      return;
    }
    
    setSaving(true);
    try {
      const result = await api.editAllianceSettings({
        alliance_id: allianceId,
        editor_nation_id: nationId!,
        name: name.trim(),
        description: description.trim(),
        motto: motto.trim(),
        color,
        is_public: isPublic,
        requires_approval: requiresApproval,
        min_reputation: parseInt(minReputation) || 0,
        min_population: parseInt(minPopulation) || 0,
        max_members: parseInt(maxMembers) || 10,
        allowed_races: allowedRaces,
        allowed_ideologies: allowedIdeologies,
      });
      
      if (result.success) {
        Alert.alert('Success', 'Faction settings updated');
        router.back();
      } else {
        Alert.alert('Error', result.detail || 'Failed to update settings');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleRace = (race: string) => {
    if (allowedRaces.includes(race)) {
      setAllowedRaces(allowedRaces.filter(r => r !== race));
    } else {
      setAllowedRaces([...allowedRaces, race]);
    }
  };

  const toggleIdeology = (ideologyId: string) => {
    if (allowedIdeologies.includes(ideologyId)) {
      setAllowedIdeologies(allowedIdeologies.filter(i => i !== ideologyId));
    } else {
      setAllowedIdeologies([...allowedIdeologies, ideologyId]);
    }
  };

  const handlePromoteMember = async (memberId: string, newRole: string) => {
    try {
      const result = await api.promoteMember(allianceId, nationId!, memberId, newRole);
      if (result.success) {
        Alert.alert('Success', result.message);
        loadAlliance();
        setShowPromoteModal(false);
      } else {
        Alert.alert('Error', result.detail || 'Failed to promote member');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to promote member');
    }
  };

  const handleTransferLeadership = async (newFounderId: string) => {
    Alert.alert(
      'Transfer Leadership',
      'Are you sure you want to transfer founder status? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.transferLeadership(allianceId, nationId!, newFounderId);
              if (result.success) {
                Alert.alert('Success', 'Leadership transferred');
                router.back();
              } else {
                Alert.alert('Error', result.detail || 'Failed to transfer leadership');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to transfer leadership');
            }
          }
        }
      ]
    );
  };

  // Handle accepting a join request with role selection
  const handleAcceptRequest = async (request: any) => {
    // Check if eligible for vassal (under 500k population)
    if (request.is_vassal_eligible) {
      // Show modal to choose role
      setSelectedRequest(request);
      setShowRoleModal(true);
    } else {
      // Over 500k - can only be member, accept directly
      await processJoinRequest(request.id, true, 'member');
    }
  };

  // Process the join request with selected role
  const processJoinRequest = async (requestId: string, accept: boolean, role?: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await api.handleJoinRequest(requestId, nationId!, accept, role);
      if (result.success) {
        Alert.alert('Success', result.message);
        setShowRoleModal(false);
        setSelectedRequest(null);
        loadAlliance(); // Reload to update member list and pending requests
      } else {
        Alert.alert('Error', result.detail || 'Failed to process request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Handle rejecting a join request
  const handleRejectRequest = async (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this join request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => processJoinRequest(requestId, false)
        }
      ]
    );
  };

  // Format population for display
  const formatPopulation = (pop: number) => {
    if (pop >= 1000) {
      return `${(pop / 1000).toFixed(1)}M`;
    }
    return `${pop.toFixed(0)}K`;
  };

  const canEdit = myRole === 'founder' || myRole === 'leader';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading faction settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!alliance || !canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Faction Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={48} color="rgba(243,246,250,0.48)" />
          <Text style={styles.errorText}>You{'\u2019'} don{'\u2019'}t have permission to edit this faction</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Faction Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={themeColor} />
          ) : (
            <Text style={[styles.saveButton, { color: themeColor }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          <Text style={styles.inputLabel}>Faction Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Faction Name"
            placeholderTextColor="rgba(243,246,250,0.48)"
            maxLength={30}
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is your faction about?"
            placeholderTextColor="rgba(243,246,250,0.48)"
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          
          <Text style={styles.inputLabel}>Motto</Text>
          <TextInput
            style={styles.input}
            value={motto}
            onChangeText={setMotto}
            placeholder="Faction motto"
            placeholderTextColor="rgba(243,246,250,0.48)"
            maxLength={50}
          />
          
          <Text style={styles.inputLabel}>Color</Text>
          <View style={styles.colorPicker}>
            {ALLIANCE_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionSelected
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Access Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access Settings</Text>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Public Faction</Text>
              <Text style={styles.toggleDescription}>Visible in faction browser</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: 'rgba(255,255,255,0.08)', true: themeColor }}
            />
          </View>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Require Approval</Text>
              <Text style={styles.toggleDescription}>Leaders must approve join requests</Text>
            </View>
            <Switch
              value={requiresApproval}
              onValueChange={setRequiresApproval}
              trackColor={{ false: 'rgba(255,255,255,0.08)', true: themeColor }}
            />
          </View>
          
          <Text style={styles.inputLabel}>Maximum Members (max 10)</Text>
          <TextInput
            style={styles.input}
            value={maxMembers}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              if (num <= 10) {
                setMaxMembers(text);
              } else {
                setMaxMembers('10');
              }
            }}
            placeholder="10"
            placeholderTextColor="rgba(243,246,250,0.48)"
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.inputHint}>Hard cap: 10 members + 3 vassals</Text>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join Requirements</Text>
          
          <Text style={styles.inputLabel}>Minimum Reputation (0-200)</Text>
          <TextInput
            style={styles.input}
            value={minReputation}
            onChangeText={setMinReputation}
            placeholder="0"
            placeholderTextColor="rgba(243,246,250,0.48)"
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Race Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed Races</Text>
          <Text style={styles.sectionDescription}>
            Leave all unchecked to allow any race
          </Text>
          
          <View style={styles.raceGrid}>
            {AVAILABLE_RACES.map(race => (
              <TouchableOpacity
                key={race}
                style={[
                  styles.raceOption,
                  allowedRaces.includes(race) && { borderColor: themeColor, backgroundColor: themeColor + '20' }
                ]}
                onPress={() => toggleRace(race)}
              >
                <Ionicons
                  name={allowedRaces.includes(race) ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={allowedRaces.includes(race) ? themeColor : 'rgba(243,246,250,0.48)'}
                />
                <Text style={[
                  styles.raceOptionText,
                  allowedRaces.includes(race) && { color: themeColor }
                ]}>
                  {race.charAt(0).toUpperCase() + race.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ideology Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed Ideologies</Text>
          <Text style={styles.sectionDescription}>
            Select which political compass quadrants can join. Leave all unchecked for any ideology.
          </Text>
          
          <View style={styles.ideologyGrid}>
            {IDEOLOGY_QUADRANTS.map(ideology => (
              <TouchableOpacity
                key={ideology.id}
                style={[
                  styles.ideologyOption,
                  { borderColor: ideology.color },
                  allowedIdeologies.includes(ideology.id) && { borderColor: ideology.color, backgroundColor: ideology.color + '20' }
                ]}
                onPress={() => toggleIdeology(ideology.id)}
              >
                <Ionicons
                  name={allowedIdeologies.includes(ideology.id) ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={allowedIdeologies.includes(ideology.id) ? ideology.color : 'rgba(243,246,250,0.48)'}
                />
                <View style={styles.ideologyInfo}>
                  <Text style={[
                    styles.ideologyOptionText,
                    allowedIdeologies.includes(ideology.id) && { color: ideology.color }
                  ]}>
                    {ideology.name}
                  </Text>
                  <Text style={styles.ideologyDescription}>
                    {ideology.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Member Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Management</Text>
          
          {alliance.members?.map((member: any) => (
            <View key={member.nation_id} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.nation_name}</Text>
                <Text style={[styles.memberRole, { color: getRoleColor(member.role) }]}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
              </View>
              
              {member.nation_id !== nationId && myRole === 'founder' && (
                <View style={styles.memberActions}>
                  {member.role !== 'leader' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { borderColor: '#27D17A' }]}
                      onPress={() => handlePromoteMember(member.nation_id, 'leader')}
                    >
                      <Ionicons name="arrow-up" size={16} color="#27D17A" />
                    </TouchableOpacity>
                  )}
                  {member.role === 'leader' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { borderColor: '#F2C94C' }]}
                      onPress={() => handlePromoteMember(member.nation_id, 'member')}
                    >
                      <Ionicons name="arrow-down" size={16} color="#F2C94C" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: '#FFD700' }]}
                    onPress={() => handleTransferLeadership(member.nation_id)}
                  >
                    <Ionicons name="star" size={16} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              )}
              
              {member.nation_id === nationId && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRoleModal(false);
          setSelectedRequest(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Role</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowRoleModal(false);
                  setSelectedRequest(null);
                }}
              >
                <Ionicons name="close" size={24} color="rgba(243,246,250,0.70)" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Accept <Text style={styles.highlightText}>{selectedRequest?.nation_name}</Text> as:
            </Text>
            
            <Text style={styles.modalPopInfo}>
              Population: {formatPopulation(selectedRequest?.nation_population || 0)}
            </Text>
            
            <View style={styles.roleOptions}>
              {/* Member Option */}
              <TouchableOpacity
                style={[styles.roleOption, { borderColor: '#27D17A' }]}
                onPress={() => processJoinRequest(selectedRequest?.id, true, 'member')}
                disabled={processingRequestId === selectedRequest?.id}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="people" size={28} color="#27D17A" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>Full Member</Text>
                  <Text style={styles.roleDescription}>
                    Full voting rights, can participate in all faction activities
                  </Text>
                </View>
                {processingRequestId === selectedRequest?.id ? (
                  <ActivityIndicator size="small" color="#27D17A" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
                )}
              </TouchableOpacity>
              
              {/* Vassal Option */}
              <TouchableOpacity
                style={[styles.roleOption, { borderColor: '#00E0C7' }]}
                onPress={() => processJoinRequest(selectedRequest?.id, true, 'vassal')}
                disabled={processingRequestId === selectedRequest?.id}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="shield-half" size={28} color="#00E0C7" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>Vassal</Text>
                  <Text style={styles.roleDescription}>
                    Subordinate member. Auto-promotes to full member at 500K population
                  </Text>
                </View>
                {processingRequestId === selectedRequest?.id ? (
                  <ActivityIndicator size="small" color="#00E0C7" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowRoleModal(false);
                setSelectedRequest(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'founder': return '#FFD700';
    case 'leader': return '#C0C0C0';
    case 'officer': return '#CD7F32';
    default: return 'rgba(243,246,250,0.48)';
  }
};

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  errorText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 12,
    color: '#F3F6FA',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#11171F',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#F3F6FA',
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  inputHint: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  raceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  raceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#11171F',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  raceOptionText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
  },
  ideologyGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  ideologyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#11171F',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ideologyInfo: {
    flex: 1,
  },
  ideologyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(243,246,250,0.70)',
  },
  ideologyDescription: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: '#0B0F14',
  },
  youBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.70)',
    fontWeight: '600',
  },
  // Pending Requests Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requestCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requestCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  requestCard: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestNationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestPopulation: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
  },
  vassalEligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E0C720',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vassalEligibleText: {
    fontSize: 11,
    color: '#00E0C7',
    fontWeight: '500',
  },
  requestMessage: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5A65',
    backgroundColor: '#0B0F14',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5A65',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Modal Styles
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  highlightText: {
    color: '#F3F6FA',
    fontWeight: '600',
  },
  modalPopInfo: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.48)',
    marginBottom: 20,
  },
  roleOptions: {
    gap: 12,
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B0F14',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#11171F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 16,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    fontWeight: '500',
  },
});
