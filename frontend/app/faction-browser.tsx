import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { getRaceTheme } from '../utils/raceColors';

interface AllianceMember {
  nation_id: string;
  nation_name: string;
  nation_flag?: string;
  race: string;
  role: string;
  joined_at: string;
  contribution_score: number;
}

interface MultiAlliance {
  _id?: string;
  id: string;
  name: string;
  tag: string;
  description: string;
  motto: string;
  color: string;
  members: AllianceMember[];
  vassals?: AllianceMember[];
  max_members: number;
  is_public: boolean;
  requires_approval: boolean;
  min_reputation: number;
  created_at: string;
  member_count?: number;
}

interface AllianceInvite {
  id: string;
  alliance_id: string;
  alliance_name: string;
  invited_by_nation_name: string;
  message: string;
  created_at: string;
}

const ALLIANCE_COLORS = [
  '#00E0C7', '#FF5A65', '#27D17A', '#F2C94C', '#00E0C7', 
  '#00B8B8', '#00E0C7', '#F97316', '#6366F1', '#84CC16'
];

export default function AllianceBrowserScreen() {
  const router = useRouter();
  const { nation } = useNationStore();
  
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;
  
  const [alliances, setAlliances] = useState<MultiAlliance[]>([]);
  const [myAlliance, setMyAlliance] = useState<MultiAlliance | null>(null);
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-alliance' | 'create'>('browse');
  
  // Create alliance form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allianceName, setAllianceName] = useState('');
  const [allianceTag, setAllianceTag] = useState('');
  const [allianceDescription, setAllianceDescription] = useState('');
  const [allianceMotto, setAllianceMotto] = useState('');
  const [allianceColor, setAllianceColor] = useState('#00E0C7');
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Join request
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedAlliance, setSelectedAlliance] = useState<MultiAlliance | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Join requests state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // Role selection modal for accepting join requests
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // War state - for "Call to War" feature
  const [myActiveWar, setMyActiveWar] = useState<any>(null);
  const [callableMembers, setCallableMembers] = useState<{[key: string]: boolean}>({});
  const [callingToWar, setCallingToWar] = useState<string | null>(null);

  const nationId = nation?.id || nation?._id;

  useEffect(() => {
    if (nationId) {
      loadData();
    }
  }, [nationId]);

  // Check for active war and callable members
  const checkWarStatus = async () => {
    if (!nationId || !myAlliance) return;
    
    try {
      // Check if I'm at war
      const warResult = await api.getNationActiveWar(nationId);
      if (warResult.war) {
        setMyActiveWar(warResult.war);
        
        // Check which faction members can be called
        const allMembers = [
          ...(myAlliance.members || []),
          ...(myAlliance.vassals || [])
        ];
        
        const callableStatus: {[key: string]: boolean} = {};
        for (const member of allMembers) {
          if (member.nation_id !== nationId) {
            const canCall = await api.canCallToWar(member.nation_id);
            callableStatus[member.nation_id] = canCall.can_call;
          }
        }
        setCallableMembers(callableStatus);
      } else {
        setMyActiveWar(null);
        setCallableMembers({});
      }
    } catch (error) {
      console.error('Error checking war status:', error);
    }
  };

  // Check war status when alliance loads or changes
  useEffect(() => {
    if (myAlliance && nationId) {
      checkWarStatus();
    }
  }, [myAlliance, nationId]);

  // Handle calling a member to war
  const handleCallToWar = async (targetNationId: string, targetName: string) => {
    if (!myActiveWar || !nationId) {
      console.log('No active war or nationId');
      return;
    }
    
    // Check if this is a vassal war
    if (myActiveWar.is_vassal_war) {
      Alert.alert('Cannot Call Allies', 'Vassal wars are 1v1 only - no allies can join.');
      return;
    }
    
    // Execute the call to war directly
    setCallingToWar(targetNationId);
    try {
      const result = await api.callToWar(nationId, targetNationId);
      if (result.success) {
        Alert.alert('Success', result.message || `${targetName} has joined the war!`);
        // Refresh data
        await loadData();
      } else {
        Alert.alert('Error', result.detail || 'Failed to call to war');
      }
    } catch (error: any) {
      console.error('Call to war error:', error);
      Alert.alert('Error', error.message || 'Failed to call to war');
    } finally {
      setCallingToWar(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get world_id from nation for world-specific factions
      const worldId = nation?.world_id;
      
      // Load all data in parallel
      const [alliancesRes, myAllianceRes, invitesRes] = await Promise.all([
        api.browseAlliances(50, worldId),
        api.getNationMultiAlliance(nationId!),
        api.getAllianceInvites(nationId!)
      ]);
      
      if (alliancesRes.success) {
        setAlliances(alliancesRes.alliances);
      }
      
      if (myAllianceRes.success && myAllianceRes.alliance) {
        setMyAlliance(myAllianceRes.alliance);
        setActiveTab('my-alliance');
        
        // Check war status immediately after alliance is loaded
        try {
          const warResult = await api.getNationActiveWar(nationId!);
          if (warResult.war) {
            setMyActiveWar(warResult.war);
            
            // Check which faction FULL MEMBERS can be called (NOT vassals)
            // Vassals cannot be called to war
            const fullMembers = myAllianceRes.alliance.members || [];
            
            const callableStatus: {[key: string]: boolean} = {};
            for (const member of fullMembers) {
              if (member.nation_id !== nationId) {
                const canCall = await api.canCallToWar(member.nation_id);
                callableStatus[member.nation_id] = canCall.can_call;
              }
            }
            setCallableMembers(callableStatus);
          } else {
            setMyActiveWar(null);
            setCallableMembers({});
          }
        } catch (warError) {
          console.error('Error checking war status:', warError);
        }
      }
      
      if (invitesRes.success) {
        setInvites(invitesRes.invites);
      }
      
    } catch (error) {
      console.error('Error loading alliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [nationId]);
  
  // Chat functions
  const loadMessages = async () => {
    if (!myAlliance || !nationId) return;
    try {
      const response = await api.getFactionMessages(myAlliance._id || myAlliance.id, nationId);
      if (response.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !myAlliance || !nationId) return;
    
    setSendingMessage(true);
    try {
      await api.sendFactionMessage(myAlliance._id || myAlliance.id, nationId, messageText.trim());
      setMessageText('');
      await loadMessages(); // Reload messages after sending
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Load pending join requests
  const loadPendingRequests = async () => {
    if (!myAlliance || !nationId) return;
    try {
      const allianceId = myAlliance._id || myAlliance.id;
      const response = await api.getMultiAlliance(allianceId);
      if (response.success && response.alliance?.pending_requests) {
        setPendingRequests(response.alliance.pending_requests);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
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
        // Reload alliance data to refresh members and pending requests
        await loadData();
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

  // Calculate available vassal slots
  const getAvailableVassalSlots = () => {
    if (!myAlliance) return 0;
    const memberCount = myAlliance.members?.length || 0;
    const vassalCount = myAlliance.vassals?.length || 0;
    
    // Vassal slots unlock based on member count: 3 members = 1 slot, 6 members = 2 slots, 10 members = 3 slots
    let maxVassalSlots = 0;
    if (memberCount >= 10) maxVassalSlots = 3;
    else if (memberCount >= 6) maxVassalSlots = 2;
    else if (memberCount >= 3) maxVassalSlots = 1;
    
    return Math.max(0, maxVassalSlots - vassalCount);
  };
  
  // Poll messages and pending requests every 5 seconds when on my-alliance tab
  useEffect(() => {
    if (myAlliance && activeTab === 'my-alliance') {
      loadMessages();
      loadPendingRequests();
      const interval = setInterval(() => {
        loadMessages();
        loadPendingRequests();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [myAlliance, activeTab]);

  const handleCreateAlliance = async () => {
    if (!allianceName.trim() || !allianceTag.trim()) {
      Alert.alert('Error', 'Name and tag are required');
      return;
    }
    
    if (allianceTag.length < 2 || allianceTag.length > 6) {
      Alert.alert('Error', 'Tag must be 2-6 characters');
      return;
    }
    
    setCreating(true);
    try {
      const result = await api.createMultiAlliance({
        founder_nation_id: nationId!,
        founder_nation_name: nation!.name,
        founder_nation_flag: nation!.flag_base64,
        founder_race: nation!.race || 'human',
        name: allianceName.trim(),
        tag: allianceTag.trim().toUpperCase(),
        description: allianceDescription.trim(),
        motto: allianceMotto.trim(),
        color: allianceColor,
        is_public: isPublic,
        requires_approval: requiresApproval
      });
      
      if (result.success) {
        Alert.alert('Success', `Alliance "${allianceName}" created!`);
        setShowCreateModal(false);
        resetCreateForm();
        loadData();
      } else {
        Alert.alert('Error', result.detail || 'Failed to create alliance');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create alliance');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setAllianceName('');
    setAllianceTag('');
    setAllianceDescription('');
    setAllianceMotto('');
    setAllianceColor('#00E0C7');
    setIsPublic(true);
    setRequiresApproval(true);
  };

  const handleJoinAlliance = async () => {
    if (!selectedAlliance) return;
    
    setJoining(true);
    try {
      const result = await api.requestToJoinAlliance(
        selectedAlliance.id,
        nationId!,
        nation!.name,
        nation!.flag_base64,
        joinMessage.trim()
      );
      
      if (result.success) {
        Alert.alert('Success', result.message);
        setShowJoinModal(false);
        setJoinMessage('');
        loadData();
      } else {
        Alert.alert('Error', result.detail || 'Failed to join alliance');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join alliance');
    } finally {
      setJoining(false);
    }
  };

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      const result = await api.respondToAllianceInvite(inviteId, accept);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        loadData();
      } else {
        Alert.alert('Error', result.detail || 'Failed to respond');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond');
    }
  };

  const handleLeaveAlliance = async () => {
    console.log('handleLeaveAlliance called');
    console.log('myAlliance:', myAlliance);
    console.log('nationId:', nationId);
    
    if (!myAlliance) {
      console.log('myAlliance is null, returning');
      if (Platform.OS === 'web') {
        window.alert('Error: No faction data found');
      }
      return;
    }
    
    if (!nationId) {
      console.log('nationId is null, returning');
      if (Platform.OS === 'web') {
        window.alert('Error: No nation ID found');
      }
      return;
    }
    
    // Simple confirm for web
    let confirmed = false;
    if (Platform.OS === 'web') {
      confirmed = window.confirm(`Are you sure you want to leave ${myAlliance.name}?`);
    } else {
      // For native, use Alert.alert with a promise wrapper
      confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Leave Faction',
          `Are you sure you want to leave ${myAlliance.name}?`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Leave', onPress: () => resolve(true), style: 'destructive' }
          ]
        );
      });
    }
    
    console.log('User confirmed:', confirmed);
    
    if (!confirmed) {
      return;
    }
    
    try {
      console.log('Calling API with allianceId:', myAlliance.id, 'nationId:', nationId);
      const result = await api.leaveMultiAlliance(myAlliance.id, nationId);
      console.log('API result:', result);
      
      if (result.success) {
        if (Platform.OS === 'web') {
          window.alert(result.message || 'Successfully left the faction');
        } else {
          Alert.alert('Success', result.message);
        }
        setMyAlliance(null);
        setActiveTab('browse');
        loadData();
      } else {
        const errorMsg = result.detail || result.message || 'Failed to leave';
        console.log('API error:', errorMsg);
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error: any) {
      console.log('Exception:', error);
      const errorMsg = error.message || 'Failed to leave';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  // Helper to get current user's role in the faction
  const getMyRole = (): string | null => {
    if (!myAlliance || !nationId) return null;
    
    // Check in members
    const member = myAlliance.members?.find(m => m.nation_id === nationId);
    if (member) return member.role;
    
    // Check in vassals
    const vassal = myAlliance.vassals?.find(v => v.nation_id === nationId);
    if (vassal) return 'vassal';
    
    return null;
  };

  const myRole = getMyRole();
  const isVassal = myRole === 'vassal';
  const isFounder = myRole === 'founder';

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'founder': return '#FFD700';
      case 'leader': return '#C0C0C0';
      case 'officer': return '#CD7F32';
      default: return 'rgba(243,246,250,0.48)';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'founder': return 'star';
      case 'leader': return 'shield';
      case 'officer': return 'ribbon';
      default: return 'person';
    }
  };

  if (!nation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No nation found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Factions</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)}
          style={[styles.createButton, { backgroundColor: themeColor }]}
          disabled={!!myAlliance}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Invites Banner */}
      {invites.length > 0 && (
        <View style={[styles.invitesBanner, { borderColor: themeColor }]}>
          <Ionicons name="mail" size={20} color={themeColor} />
          <Text style={styles.invitesBannerText}>
            You have {invites.length} pending invite{invites.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && { borderBottomColor: themeColor, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && { color: themeColor }]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-alliance' && { borderBottomColor: themeColor, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('my-alliance')}
        >
          <Text style={[styles.tabText, activeTab === 'my-alliance' && { color: themeColor }]}>
            My Faction {myAlliance ? `[${myAlliance.tag}]` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading factions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
        >
          {activeTab === 'browse' && (
            <>
              {/* Pending Invites */}
              {invites.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Pending Invites</Text>
                  {invites.map(invite => (
                    <View key={invite.id} style={[styles.inviteCard, { borderLeftColor: themeColor }]}>
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteAllianceName}>{invite.alliance_name}</Text>
                        <Text style={styles.inviteFrom}>Invited by {invite.invited_by_nation_name}</Text>
                        {invite.message && <Text style={styles.inviteMessage}>{'\u201c'}{invite.message}{'\u201d'}</Text>}
                      </View>
                      <View style={styles.inviteActions}>
                        <TouchableOpacity
                          style={[styles.inviteButton, { backgroundColor: '#27D17A' }]}
                          onPress={() => handleRespondToInvite(invite.id, true)}
                        >
                          <Ionicons name="checkmark" size={20} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.inviteButton, { backgroundColor: '#FF5A65' }]}
                          onPress={() => handleRespondToInvite(invite.id, false)}
                        >
                          <Ionicons name="close" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Alliance List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Public Factions ({alliances.length})</Text>
                {alliances.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="rgba(243,246,250,0.48)" />
                    <Text style={styles.emptyText}>No factions yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to create one!</Text>
                  </View>
                ) : (
                  alliances.map(alliance => (
                    <TouchableOpacity
                      key={alliance.id}
                      style={[styles.allianceCard, { borderLeftColor: alliance.color }]}
                      onPress={() => {
                        if (!myAlliance) {
                          setSelectedAlliance(alliance);
                          setShowJoinModal(true);
                        } else {
                          router.push(`/faction-details?id=${alliance.id}`);
                        }
                      }}
                    >
                      <View style={styles.allianceHeader}>
                        <View style={[styles.allianceTag, { backgroundColor: alliance.color }]}>
                          <Text style={styles.allianceTagText}>{alliance.tag}</Text>
                        </View>
                        <View style={styles.allianceInfo}>
                          <Text style={styles.allianceName}>{alliance.name}</Text>
                          <Text style={styles.allianceMembers}>
                            {alliance.member_count || alliance.members?.length || 0}/{alliance.max_members} members
                          </Text>
                        </View>
                        {!myAlliance && (
                          <TouchableOpacity
                            style={[styles.joinButton, { borderColor: alliance.color }]}
                            onPress={() => {
                              setSelectedAlliance(alliance);
                              setShowJoinModal(true);
                            }}
                          >
                            <Text style={[styles.joinButtonText, { color: alliance.color }]}>Join</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {alliance.description && (
                        <Text style={styles.allianceDescription} numberOfLines={2}>
                          {alliance.description}
                        </Text>
                      )}
                      <View style={styles.allianceMeta}>
                        {alliance.requires_approval && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="lock-closed" size={12} color="rgba(243,246,250,0.48)" />
                            <Text style={styles.metaBadgeText}>Approval</Text>
                          </View>
                        )}
                        {alliance.min_reputation > 0 && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={styles.metaBadgeText}>Rep {alliance.min_reputation}+</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          {activeTab === 'my-alliance' && (
            <>
              {myAlliance ? (
                <View style={styles.section}>
                  {/* Alliance Header */}
                  <View style={[styles.myAllianceHeader, { backgroundColor: myAlliance.color + '20', borderColor: myAlliance.color }]}>
                    <View style={[styles.bigTag, { backgroundColor: myAlliance.color }]}>
                      <Text style={styles.bigTagText}>{myAlliance.tag}</Text>
                    </View>
                    <Text style={styles.myAllianceName}>{myAlliance.name}</Text>
                    {myAlliance.motto && (
                      <Text style={styles.myAllianceMotto}>{'\u201c'}{myAlliance.motto}{'\u201d'}</Text>
                    )}
                    {myAlliance.description && (
                      <Text style={styles.myAllianceDescription}>{myAlliance.description}</Text>
                    )}
                    
                    {/* Settings Button for Founders/Leaders */}
                    {(() => {
                      const myMember = myAlliance.members?.find((m: AllianceMember) => m.nation_id === nationId);
                      const canEdit = myMember?.role === 'founder' || myMember?.role === 'leader';
                      return canEdit ? (
                        <TouchableOpacity
                          style={[styles.settingsButton, { borderColor: myAlliance.color }]}
                          onPress={() => router.push(`/faction-settings?id=${myAlliance.id || myAlliance._id}`)}
                        >
                          <Ionicons name="settings-outline" size={18} color={myAlliance.color} />
                          <Text style={[styles.settingsButtonText, { color: myAlliance.color }]}>Settings</Text>
                        </TouchableOpacity>
                      ) : null;
                    })()}
                  </View>

                  {/* Members List */}
                  <Text style={styles.sectionTitle}>
                    Members ({myAlliance.members?.length || 0}/{myAlliance.max_members})
                  </Text>
                  {myAlliance.members?.map((member: AllianceMember) => (
                    <View key={member.nation_id} style={styles.memberCard}>
                      <View style={[styles.roleIcon, { backgroundColor: getRoleColor(member.role) + '30' }]}>
                        <Ionicons name={getRoleIcon(member.role) as any} size={16} color={getRoleColor(member.role)} />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.nation_name}</Text>
                        <Text style={[styles.memberRole, { color: getRoleColor(member.role) }]}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Text>
                      </View>
                      {member.nation_id === nationId ? (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      ) : myActiveWar && !myActiveWar.is_vassal_war && callableMembers[member.nation_id] ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.callToWarButton,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => {
                            console.log('Call to war button pressed for:', member.nation_name);
                            handleCallToWar(member.nation_id, member.nation_name);
                          }}
                          disabled={callingToWar === member.nation_id}
                        >
                          {callingToWar === member.nation_id ? (
                            <ActivityIndicator size="small" color="#FF5A65" />
                          ) : (
                            <>
                              <Ionicons name="flame" size={14} color="#FF5A65" />
                              <Text style={styles.callToWarText}>Call</Text>
                            </>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  ))}

                  {/* Vassals List */}
                  <Text style={styles.sectionTitle}>
                    🛡️ Vassals ({myAlliance.vassals?.length || 0}/3)
                  </Text>
                  {myAlliance.vassals && myAlliance.vassals.length > 0 ? (
                    myAlliance.vassals.map((vassal: AllianceMember) => (
                      <View key={vassal.nation_id} style={[styles.memberCard, styles.vassalCard]}>
                        <View style={[styles.roleIcon, { backgroundColor: '#F2C94C30' }]}>
                          <Ionicons name="shield" size={16} color="#F2C94C" />
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{vassal.nation_name}</Text>
                          <Text style={[styles.memberRole, { color: '#F2C94C' }]}>
                            Vassal (under 500k)
                          </Text>
                        </View>
                        {vassal.nation_id === nationId && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                        {/* Vassals cannot be called to war */}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyVassals}>
                      No vassals yet. Nations under 500k population can join as vassals.
                      {myAlliance.members?.length < 3 && ' (Unlock 1st slot at 3 members)'}
                    </Text>
                  )}

                  {/* Pending Join Requests - Only visible to founder/leader */}
                  {(() => {
                    const myMember = myAlliance.members?.find((m: AllianceMember) => m.nation_id === nationId);
                    const canManageRequests = myMember?.role === 'founder' || myMember?.role === 'leader';
                    
                    if (!canManageRequests || pendingRequests.length === 0) return null;
                    
                    return (
                      <>
                        <View style={styles.requestsSectionHeader}>
                          <Text style={styles.sectionTitle}>📥 Pending Requests</Text>
                          <View style={[styles.requestCountBadge, { backgroundColor: themeColor }]}>
                            <Text style={styles.requestCountText}>{pendingRequests.length}</Text>
                          </View>
                        </View>
                        
                        {pendingRequests.map((request: any) => (
                          <View key={request.id} style={styles.requestCard}>
                            <View style={styles.requestInfo}>
                              <Text style={styles.requestNationName}>{request.nation_name}</Text>
                              <View style={styles.requestMeta}>
                                <Text style={styles.requestPopulation}>
                                  {formatPopulation(request.nation_population || 0)} pop
                                </Text>
                                {request.is_vassal_eligible && (
                                  <View style={styles.vassalEligibleBadge}>
                                    <Ionicons name="shield-checkmark" size={10} color="#00E0C7" />
                                    <Text style={styles.vassalEligibleText}>Vassal OK</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            
                            {request.message && (
                              <Text style={styles.requestMessage} numberOfLines={2}>{'\u201c'}{request.message}{'\u201d'}</Text>
                            )}
                            
                            <View style={styles.requestActions}>
                              <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => handleRejectRequest(request.id)}
                                disabled={processingRequestId === request.id}
                              >
                                {processingRequestId === request.id ? (
                                  <ActivityIndicator size="small" color="#FF5A65" />
                                ) : (
                                  <>
                                    <Ionicons name="close" size={14} color="#FF5A65" />
                                    <Text style={styles.rejectButtonText}>Reject</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={[styles.acceptButton, { backgroundColor: themeColor }]}
                                onPress={() => handleAcceptRequest(request)}
                                disabled={processingRequestId === request.id}
                              >
                                {processingRequestId === request.id ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <>
                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                    <Text style={styles.acceptButtonText}>Accept</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </>
                    );
                  })()}

                  {/* Faction Chat */}
                  <Text style={styles.sectionTitle}>💬 Faction Chat</Text>
                  <View style={styles.chatContainer}>
                    <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
                      {messages.length > 0 ? (
                        messages.map((msg, index) => (
                          <View key={index} style={styles.messageCard}>
                            <View style={styles.messageHeader}>
                              <Text style={styles.messageSender}>{msg.sender_name}</Text>
                              <Text style={styles.messageTime}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                            <Text style={styles.messageText}>{msg.message}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyChat}>No messages yet. Start the conversation!</Text>
                      )}
                    </ScrollView>
                    
                    <View style={styles.chatInputContainer}>
                      <TextInput
                        style={styles.chatInput}
                        placeholder="Type a message..."
                        placeholderTextColor="rgba(243,246,250,0.48)"
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                        maxLength={500}
                      />
                      <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: messageText.trim() ? themeColor : 'rgba(243,246,250,0.48)' }]}
                        onPress={handleSendMessage}
                        disabled={!messageText.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <ActivityIndicator size="small" color="#F3F6FA" />
                        ) : (
                          <Ionicons name="send" size={20} color="#F3F6FA" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Leave Button - Only for non-vassals and non-founders with other members */}
                  {!isVassal && (
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={() => {
                        console.log('Leave button pressed');
                        handleLeaveAlliance();
                      }}
                    >
                      <Ionicons name="exit-outline" size={20} color="#FF5A65" />
                      <Text style={styles.leaveButtonText}>Leave Faction</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Show info for vassals */}
                  {isVassal && (
                    <View style={styles.vassalInfo}>
                      <Ionicons name="lock-closed" size={16} color="rgba(243,246,250,0.48)" />
                      <Text style={styles.vassalInfoText}>
                        Vassals cannot leave on their own. You must be released by a faction leader.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="rgba(243,246,250,0.48)" />
                  <Text style={styles.emptyText}>You{'\u2019'}re not in a faction</Text>
                  <Text style={styles.emptySubtext}>Browse factions to join one, or create your own!</Text>
                  <TouchableOpacity
                    style={[styles.createAllianceButton, { backgroundColor: themeColor }]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.createAllianceButtonText}>Create Faction</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Create Alliance Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Faction</Text>
            <TouchableOpacity onPress={handleCreateAlliance} disabled={creating}>
              {creating ? (
                <ActivityIndicator size="small" color={themeColor} />
              ) : (
                <Text style={[styles.modalSave, { color: themeColor }]}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Faction Name *</Text>
            <TextInput
              style={styles.input}
              value={allianceName}
              onChangeText={setAllianceName}
              placeholder="e.g., Northern Alliance"
              placeholderTextColor="rgba(243,246,250,0.48)"
              maxLength={30}
            />
            
            <Text style={styles.inputLabel}>Tag * (2-6 characters)</Text>
            <TextInput
              style={styles.input}
              value={allianceTag}
              onChangeText={(text) => setAllianceTag(text.toUpperCase())}
              placeholder="e.g., NATO"
              placeholderTextColor="rgba(243,246,250,0.48)"
              maxLength={6}
              autoCapitalize="characters"
            />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={allianceDescription}
              onChangeText={setAllianceDescription}
              placeholder="What is your faction about?"
              placeholderTextColor="rgba(243,246,250,0.48)"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            
            <Text style={styles.inputLabel}>Motto</Text>
            <TextInput
              style={styles.input}
              value={allianceMotto}
              onChangeText={setAllianceMotto}
              placeholder="e.g., United we stand"
              placeholderTextColor="rgba(243,246,250,0.48)"
              maxLength={50}
            />
            
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {ALLIANCE_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    allianceColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setAllianceColor(color)}
                />
              ))}
            </View>
            
            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Public Faction</Text>
                  <Text style={styles.toggleDescription}>Anyone can find and request to join</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, isPublic && { backgroundColor: themeColor }]}
                  onPress={() => setIsPublic(!isPublic)}
                >
                  <View style={[styles.toggleKnob, isPublic && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Require Approval</Text>
                  <Text style={styles.toggleDescription}>Leaders must approve join requests</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, requiresApproval && { backgroundColor: themeColor }]}
                  onPress={() => setRequiresApproval(!requiresApproval)}
                >
                  <View style={[styles.toggleKnob, requiresApproval && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Join Alliance Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.joinModalOverlay}>
          <View style={styles.joinModalContent}>
            {selectedAlliance && (
              <>
                <View style={[styles.joinModalHeader, { backgroundColor: selectedAlliance.color + '20' }]}>
                  <View style={[styles.joinModalTag, { backgroundColor: selectedAlliance.color }]}>
                    <Text style={styles.joinModalTagText}>{selectedAlliance.tag}</Text>
                  </View>
                  <Text style={styles.joinModalTitle}>{selectedAlliance.name}</Text>
                </View>
                
                <View style={styles.joinModalBody}>
                  {selectedAlliance.requires_approval ? (
                    <>
                      <Text style={styles.joinModalInfo}>
                        This faction requires approval to join. Your request will be reviewed by the leaders.
                      </Text>
                      <TextInput
                        style={[styles.input, styles.joinMessageInput]}
                        value={joinMessage}
                        onChangeText={setJoinMessage}
                        placeholder="Add a message (optional)"
                        placeholderTextColor="rgba(243,246,250,0.48)"
                        multiline
                        numberOfLines={2}
                      />
                    </>
                  ) : (
                    <Text style={styles.joinModalInfo}>
                      You will immediately join this faction.
                    </Text>
                  )}
                </View>
                
                <View style={styles.joinModalActions}>
                  <TouchableOpacity
                    style={styles.joinModalCancelButton}
                    onPress={() => setShowJoinModal(false)}
                  >
                    <Text style={styles.joinModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.joinModalConfirmButton, { backgroundColor: selectedAlliance.color }]}
                    onPress={handleJoinAlliance}
                    disabled={joining}
                  >
                    {joining ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.joinModalConfirmText}>
                        {selectedAlliance.requires_approval ? 'Request to Join' : 'Join'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal for accepting join requests */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRoleModal(false);
          setSelectedRequest(null);
        }}
      >
        <View style={styles.roleModalOverlay}>
          <View style={styles.roleModalContent}>
            <View style={styles.roleModalHeader}>
              <Text style={styles.roleModalTitle}>Choose Role</Text>
              <TouchableOpacity 
                style={styles.roleModalCloseButton}
                onPress={() => {
                  setShowRoleModal(false);
                  setSelectedRequest(null);
                }}
              >
                <Ionicons name="close" size={24} color="rgba(243,246,250,0.70)" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.roleModalSubtitle}>
              Accept <Text style={styles.highlightText}>{selectedRequest?.nation_name}</Text> as:
            </Text>
            
            <Text style={styles.roleModalPopInfo}>
              Population: {formatPopulation(selectedRequest?.nation_population || 0)}
            </Text>
            
            <View style={styles.roleOptions}>
              {/* Member Option */}
              <TouchableOpacity
                style={[styles.roleOption, { borderColor: '#27D17A' }]}
                onPress={() => processJoinRequest(selectedRequest?.id, true, 'member')}
                disabled={processingRequestId === selectedRequest?.id}
              >
                <View style={[styles.roleIconContainer, { backgroundColor: '#27D17A20' }]}>
                  <Ionicons name="people" size={24} color="#27D17A" />
                </View>
                <View style={styles.roleOptionInfo}>
                  <Text style={styles.roleOptionTitle}>Full Member</Text>
                  <Text style={styles.roleOptionDesc}>Full voting rights</Text>
                </View>
                {processingRequestId === selectedRequest?.id ? (
                  <ActivityIndicator size="small" color="#27D17A" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
                )}
              </TouchableOpacity>
              
              {/* Vassal Option - Only show if slots available */}
              {getAvailableVassalSlots() > 0 ? (
                <TouchableOpacity
                  style={[styles.roleOption, { borderColor: '#00E0C7' }]}
                  onPress={() => processJoinRequest(selectedRequest?.id, true, 'vassal')}
                  disabled={processingRequestId === selectedRequest?.id}
                >
                  <View style={[styles.roleIconContainer, { backgroundColor: '#00E0C720' }]}>
                    <Ionicons name="shield-half" size={24} color="#00E0C7" />
                  </View>
                  <View style={styles.roleOptionInfo}>
                    <Text style={styles.roleOptionTitle}>Vassal</Text>
                    <Text style={styles.roleOptionDesc}>Auto-promotes at 500K pop</Text>
                  </View>
                  {processingRequestId === selectedRequest?.id ? (
                    <ActivityIndicator size="small" color="#00E0C7" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.roleOption, styles.roleOptionDisabled]}>
                  <View style={[styles.roleIconContainer, { backgroundColor: 'rgba(255,255,255,0.08)20' }]}>
                    <Ionicons name="shield-half" size={24} color="rgba(243,246,250,0.48)" />
                  </View>
                  <View style={styles.roleOptionInfo}>
                    <Text style={[styles.roleOptionTitle, { color: 'rgba(243,246,250,0.48)' }]}>Vassal</Text>
                    <Text style={styles.roleOptionDesc}>
                      {myAlliance && (myAlliance.members?.length || 0) < 3
                        ? 'Unlock at 3 members'
                        : 'No vassal slots available'}
                    </Text>
                  </View>
                  <Ionicons name="lock-closed" size={18} color="rgba(243,246,250,0.48)" />
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.roleModalCancelButton}
              onPress={() => {
                setShowRoleModal(false);
                setSelectedRequest(null);
              }}
            >
              <Text style={styles.roleModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#11171F',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  invitesBannerText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#11171F',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.48)',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    textAlign: 'center',
  },
  createAllianceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createAllianceButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteCard: {
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteAllianceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  inviteFrom: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    marginTop: 2,
  },
  inviteMessage: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allianceCard: {
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  allianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allianceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  allianceTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  allianceInfo: {
    flex: 1,
  },
  allianceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  allianceMembers: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  allianceDescription: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    marginTop: 8,
  },
  allianceMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.70)',
  },
  myAllianceHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  bigTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  bigTagText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  myAllianceName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  myAllianceMotto: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  myAllianceDescription: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginTop: 8,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
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
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5A65',
    marginTop: 16,
  },
  leaveButtonText: {
    color: '#FF5A65',
    fontSize: 14,
    fontWeight: '600',
  },
  vassalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  vassalInfoText: {
    flex: 1,
    color: 'rgba(243,246,250,0.48)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#11171F',
  },
  modalCancel: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 16,
  },
  modalTitle: {
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  toggleContainer: {
    marginTop: 24,
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleDescription: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    marginLeft: 22,
  },
  // Join Modal
  joinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  joinModalContent: {
    backgroundColor: '#11171F',
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinModalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  joinModalTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  joinModalTagText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  joinModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  joinModalBody: {
    padding: 20,
  },
  joinModalInfo: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  joinMessageInput: {
    marginTop: 8,
  },
  joinModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  joinModalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  joinModalCancelText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  joinModalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinModalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 400,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    flexGrow: 1,
  },
  messageCard: {
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
  messageText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 20,
  },
  emptyChat: {
    textAlign: 'center',
    color: 'rgba(243,246,250,0.48)',
    fontSize: 14,
    marginTop: 40,
    fontStyle: 'italic',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0B0F14',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F1F5F9',
    fontSize: 14,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vassalCard: {
    borderColor: '#F2C94C',
    borderWidth: 1,
    backgroundColor: '#78350F20',
  },
  emptyVassals: {
    textAlign: 'center',
    color: 'rgba(243,246,250,0.48)',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
    backgroundColor: '#11171F',
    borderRadius: 8,
    marginBottom: 16,
  },
  // Pending Requests Styles
  requestsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requestInfo: {
    marginBottom: 6,
  },
  requestNationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 2,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestPopulation: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
  },
  vassalEligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#00E0C720',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vassalEligibleText: {
    fontSize: 10,
    color: '#00E0C7',
    fontWeight: '500',
  },
  requestMessage: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF5A65',
    backgroundColor: '#0B0F14',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A65',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  // Call to War button styles
  callToWarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FF5A6520',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF5A65',
  },
  callToWarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5A65',
  },
  // Role Selection Modal Styles
  roleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  roleModalContent: {
    backgroundColor: '#11171F',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  roleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  roleModalCloseButton: {
    padding: 4,
  },
  roleModalSubtitle: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  highlightText: {
    color: '#F3F6FA',
    fontWeight: '600',
  },
  roleModalPopInfo: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginBottom: 16,
  },
  roleOptions: {
    gap: 10,
    marginBottom: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B0F14',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  roleOptionDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
    opacity: 0.6,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionInfo: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 2,
  },
  roleOptionDesc: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.70)',
  },
  roleModalCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleModalCancelText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.48)',
    fontWeight: '500',
  },
});
