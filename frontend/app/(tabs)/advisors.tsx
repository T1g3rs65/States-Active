import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../../store/nationStore';
import { api } from '../../utils/api';
import { getRaceTheme } from '../../utils/raceColors';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

// Portrait mappings by race, slot, and gender
const PORTRAITS: Record<string, Record<string, any>> = {
  zythera: {
    '1': require('../../assets/portraits/zythera_advisor_1_first_minister.png'),
    '2': require('../../assets/portraits/zythera_advisor_2_treasurer.png'),
    '3': require('../../assets/portraits/zythera_advisor_3_marshal.png'),
    '4': require('../../assets/portraits/zythera_advisor_4_minister_of_culture.png'),
    '5': require('../../assets/portraits/zythera_advisor_5_spymaster.png'),
    '6': require('../../assets/portraits/zythera_advisor_6_chief_builder.png'),
    '7': require('../../assets/portraits/zythera_advisor_7_grand_diplomat.png'),
    '8': require('../../assets/portraits/zythera_advisor_8_royal_scientist.png'),
  },
  human_male: {
    '1': require('../../assets/portraits/human_advisor_1_first_minister_male.png'),
    '2': require('../../assets/portraits/human_advisor_2_treasurer.png'),
    '3': require('../../assets/portraits/human_advisor_3_marshal.png'),
    '4': require('../../assets/portraits/human_advisor_4_minister_of_culture_male.png'),
    '5': require('../../assets/portraits/human_advisor_5_spymaster.png'),
    '6': require('../../assets/portraits/human_advisor_6_chief_builder_male.png'),
    '7': require('../../assets/portraits/human_advisor_7_grand_diplomat.png'),
    '8': require('../../assets/portraits/human_advisor_8_royal_scientist_male.png'),
  },
  human_female: {
    '1': require('../../assets/portraits/human_advisor_1_first_minister.png'),
    '2': require('../../assets/portraits/human_advisor_2_treasurer_female.png'),
    '3': require('../../assets/portraits/human_advisor_3_marshal_female.png'),
    '4': require('../../assets/portraits/human_advisor_4_minister_of_culture.png'),
    '5': require('../../assets/portraits/human_advisor_5_spymaster_female.png'),
    '6': require('../../assets/portraits/human_advisor_6_chief_builder.png'),
    '7': require('../../assets/portraits/human_advisor_7_grand_diplomat_female.png'),
    '8': require('../../assets/portraits/human_advisor_8_royal_scientist.png'),
  },
};

// Common male and female name patterns
const MALE_NAME_PATTERNS = ['john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'raymond', 'frank', 'benjamin', 'gregory', 'samuel', 'patrick', 'alexander', 'jack', 'dennis', 'jerry', 'tyler', 'marcus', 'victor', 'henry', 'carl', 'gerald', 'harold', 'vincent', 'albert', 'eugene', 'bruce', 'wayne', 'ralph', 'roy', 'louis', 'phillip', 'aaron', 'sean', 'adam', 'douglas', 'nathan', 'zachary', 'peter', 'kyle', 'noah', 'ethan', 'jeremy', 'walter', 'christian', 'keith', 'roger', 'terry', 'austin', 'russell', 'bobby', 'johnny'];
const FEMALE_NAME_PATTERNS = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise', 'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis', 'lori', 'elena', 'clara', 'rose', 'jane', 'anne', 'eleanor', 'lucy', 'julia', 'eva', 'lily', 'stella', 'ruby', 'violet', 'zoe', 'chloe', 'mia', 'aurora', 'hazel', 'ivy'];

// Detect likely gender from name
const detectGender = (name: string): 'male' | 'female' => {
  if (!name) return 'male';
  const firstName = name.split(' ')[0].toLowerCase();
  
  if (MALE_NAME_PATTERNS.includes(firstName)) return 'male';
  if (FEMALE_NAME_PATTERNS.includes(firstName)) return 'female';
  
  // Check common endings
  if (firstName.endsWith('a') || firstName.endsWith('ie') || firstName.endsWith('ine') || firstName.endsWith('ella') || firstName.endsWith('ette')) return 'female';
  if (firstName.endsWith('us') || firstName.endsWith('on') || firstName.endsWith('ck') || firstName.endsWith('ard')) return 'male';
  
  // Default to male if unknown
  return 'male';
};

// Get portrait for advisor based on race and name gender
const getAdvisorPortrait = (race: string | undefined, slot: number, advisorName?: string) => {
  const slotKey = String(slot);
  
  // For Zythera, always use the slot portrait (all female except slot 3)
  if (race?.toLowerCase() === 'zythera') {
    return PORTRAITS.zythera[slotKey] || PORTRAITS.zythera['1'];
  }
  
  // For humans, detect gender from name and use appropriate portrait
  const gender = detectGender(advisorName || '');
  const portraitSet = gender === 'female' ? PORTRAITS.human_female : PORTRAITS.human_male;
  
  return portraitSet[slotKey] || PORTRAITS.human_male['1'];
};

export default function Advisors() {
  const { nation, setNation } = useNationStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReformModal, setShowReformModal] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<any>(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [reformInstructions, setReformInstructions] = useState('');
  const [sendingTask, setSendingTask] = useState(false);
  const [sendingReform, setSendingReform] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // War-related state
  const [showDeclareWarModal, setShowDeclareWarModal] = useState(false);
  const [showJoinWarModal, setShowJoinWarModal] = useState(false);
  const [availableNationsForWar, setAvailableNationsForWar] = useState<any[]>([]);
  const [alliesAtWar, setAlliesAtWar] = useState<any[]>([]);
  const [activeWar, setActiveWar] = useState<any>(null);

  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

  useEffect(() => {
    fetchNation();
    checkActiveWar();
  }, []);
  
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
  
  const checkActiveWar = async () => {
    if (!nation?.id && !nation?._id) return;
    
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getNationActiveWar(nationId);
      setActiveWar(response.war);
    } catch (error) {
      console.error('Failed to check active war:', error);
    }
  };
  
  const isMilitaryAdvisor = (advisor: any) => {
    const title = advisor.title?.toLowerCase() || '';
    return title.includes('defense') || 
           title.includes('military') ||
           title.includes('general') ||
           title.includes('marshal') ||
           title.includes('commander') ||
           title.includes('admiral') ||
           title.includes('war');
  };

  const isForeignAdvisor = (advisor: any) => {
    const title = advisor.title?.toLowerCase() || '';
    return title.includes('foreign') || 
           title.includes('diplomat') ||
           title.includes('ambassador') ||
           title.includes('external') ||
           title.includes('international') ||
           title.includes('state');
  };

  // Check if advisor is the First Minister / Chief of Staff type
  const isFirstMinister = (advisor: any) => {
    const title = advisor.title?.toLowerCase() || '';
    return title.includes('prime') ||
           (title.includes('chief') && !title.includes('builder')) ||  // Exclude Chief Builder
           title.includes('first minister') ||
           title.includes('chancellor') ||
           title.includes('premier') ||
           title.includes('vizier') ||
           title.includes('secretary general');
  };

  // Filter to only show feature-complete advisors
  const isFeatureComplete = (advisor: any) => {
    // Explicitly exclude non-complete advisors
    const title = advisor.title?.toLowerCase() || '';
    if (title.includes('builder') || 
        title.includes('infrastructure') ||
        title.includes('culture') ||
        title.includes('arts') ||
        title.includes('education') ||
        title.includes('economic') ||
        title.includes('finance') ||
        title.includes('treasury') ||
        title.includes('intelligence') ||
        title.includes('spy') ||
        title.includes('interior') ||
        title.includes('health') ||
        title.includes('environment')) {
      return false;
    }
    
    return isMilitaryAdvisor(advisor) || isForeignAdvisor(advisor) || isFirstMinister(advisor);
  };
  
  const handleOpenDeclareWarModal = async () => {
    try {
      // Fetch all nations from rankings - filtered by world
      const worldId = nation?.world_id;
      const response = await api.getRankings('population', 100, worldId);
      const nationId = nation?.id || nation?._id;
      
      // Get my faction to filter out faction members and vassals
      let myFactionMemberIds: string[] = [];
      try {
        const factionResponse = await api.getNationAlliance(nationId);
        if (factionResponse.success && factionResponse.alliance) {
          // Collect all member and vassal nation IDs
          const members = factionResponse.alliance.members || [];
          const vassals = factionResponse.alliance.vassals || [];
          myFactionMemberIds = [
            ...members.map((m: any) => m.nation_id),
            ...vassals.map((v: any) => v.nation_id)
          ];
        }
      } catch (e) {
        // Not in a faction, that's fine
      }
      
      // Filter out self AND faction members/vassals
      const available = response.rankings.filter((n: any) => {
        // Filter out self
        if (n.nation_id === nationId) return false;
        // Filter out faction members and vassals
        if (myFactionMemberIds.includes(n.nation_id)) return false;
        return true;
      });
      
      // Fetch full nation data for each to get stats
      const nationsWithStats = await Promise.all(
        available.map(async (n: any) => {
          try {
            const response = await api.getNation(n.nation_id);
            const nationData = response.nation || response;
            return {
              ...n,
              pop_display: nationData.pop_display || '0 million',
              budget_defense: nationData.stats?.budget_defense || 0,
              gdp_display: nationData.gdp_display || '$0',
            };
          } catch (error) {
            console.error(`Failed to fetch nation ${n.nation_id}:`, error);
            return n;
          }
        })
      );
      
      setAvailableNationsForWar(nationsWithStats);
      setShowDeclareWarModal(true);
    } catch (error) {
      console.error('Failed to fetch nations:', error);
      Alert.alert('Error', 'Failed to load nations list');
    }
  };
  
  const handleViewActiveWar = () => {
    if (activeWar) {
      const nationId = nation?.id || nation?._id;
      router.push(`/war-dashboard?warId=${activeWar._id || activeWar.id}&nationId=${nationId}`);
    }
  };
  
  const handleDeclareWarOnNation = (targetNationId: string, targetNationName: string) => {
    setShowDeclareWarModal(false);
    const nationId = nation?.id || nation?._id;
    router.push(`/declare-war?defenderId=${targetNationId}&defenderName=${targetNationName}&attackerId=${nationId}`);
  };
  
  const canDeclareWar = () => {
    return !activeWar; // Can only declare if not already at war
  };
  
  const hasActiveWar = () => {
    return !!activeWar;
  };

  const fetchNation = async () => {
    if (!nation) return;
    
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getNation(nationId);
      if (response.success) {
        setNation(response.nation);
      }
    } catch (error) {
      console.error('Error fetching nation:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNation();
  };

  const getAbilityColor = (ability: number) => {
    if (ability >= 80) return '#10B981';
    if (ability >= 60) return '#3B82F6';
    if (ability >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getAbilityLabel = (ability: number) => {
    if (ability >= 80) return 'Excellent';
    if (ability >= 60) return 'Good';
    if (ability >= 40) return 'Average';
    return 'Poor';
  };

  const getApprovalColor = (approval: number) => {
    if (approval >= 70) return '#10B981';
    if (approval >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const canSendTaskToday = () => {
    if (!nation.advisors) return false;
    
    const now = new Date();
    const today = now.toDateString();
    
    for (const advisor of nation.advisors) {
      if (advisor.last_task_sent) {
        const lastTaskDate = new Date(advisor.last_task_sent).toDateString();
        if (lastTaskDate === today) {
          return false;
        }
      }
    }
    return true;
  };

  // Global reform cooldown - check nation-level last_reform_sent
  const canSendReform = () => {
    if (!nation.last_reform_sent) return true;
    
    const now = new Date();
    const lastReformDate = new Date(nation.last_reform_sent);
    const daysSinceReform = Math.floor((now.getTime() - lastReformDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceReform >= 7;
  };

  const getDaysUntilReformAvailable = () => {
    if (!nation.last_reform_sent) return 0;
    const now = new Date();
    const lastReformDate = new Date(nation.last_reform_sent);
    const daysSince = Math.floor((now.getTime() - lastReformDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysSince);
  };

  const hasActivePolicies = () => {
    return nation.policies && nation.policies.length > 0;
  };

  const handleOpenTaskModal = (advisor: any) => {
    if (!canSendTaskToday()) {
      Alert.alert('Daily Limit Reached', 'You can only send one task per day to any advisor.');
      return;
    }
    setSelectedAdvisor(advisor);
    setShowTaskModal(true);
  };

  const handleSendTask = async () => {
    if (!taskDescription.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    setSendingTask(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.sendAdvisorTask(nationId, selectedAdvisor.slot, taskDescription);
      
      if (response.success) {
        Alert.alert('Success', 'Task sent! Check the Issues tab for the advisor response.');
        setShowTaskModal(false);
        setTaskDescription('');
        fetchNation();
      }
    } catch (error) {
      console.error('Error sending task:', error);
      Alert.alert('Error', 'Failed to send task');
    } finally {
      setSendingTask(false);
    }
  };

  const handleOpenReformModal = (advisor: any) => {
    if (!canSendReform()) {
      const daysRemaining = getDaysUntilReformAvailable();
      Alert.alert('Reform Cooldown', `Your nation needs ${daysRemaining} more days before another policy can be reformed.`);
      return;
    }
    if (!hasActivePolicies()) {
      Alert.alert('No Policies', 'You need at least one policy before you can reform it.');
      return;
    }
    setSelectedAdvisor(advisor);
    setSelectedPolicy(null);
    setReformInstructions('');
    setShowReformModal(true);
  };

  const handleSendReform = async () => {
    if (!selectedPolicy) {
      Alert.alert('Error', 'Please select a policy to reform');
      return;
    }
    
    if (!reformInstructions.trim()) {
      Alert.alert('Instructions Required', 'Please describe how you want the policy changed. Be specific about what you want your advisor to do.');
      return;
    }

    setSendingReform(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.sendAdvisorReform(
        nationId, 
        selectedAdvisor.slot, 
        selectedPolicy.name,
        reformInstructions
      );
      
      if (response.success) {
        let alertTitle = '';
        let alertMessage = '';
        
        switch (response.outcome_type) {
          case 'excellent':
            alertTitle = '🌟 Excellent Reform!';
            alertMessage = `Your advisor brilliantly reformed the policy!\n\n${response.reform_summary}\n\nNew Policy: "${response.new_policy_name}"`;
            break;
          case 'good':
            alertTitle = '✅ Successful Reform';
            alertMessage = `The reform was successful.\n\n${response.reform_summary}\n\nNew Policy: "${response.new_policy_name}"`;
            break;
          case 'mixed':
            alertTitle = '⚠️ Mixed Results';
            alertMessage = `The reform had mixed results - some improvements, some setbacks.\n\n${response.reform_summary}\n\nNew Policy: "${response.new_policy_name}"`;
            break;
          case 'poor':
          default:
            alertTitle = '❌ Reform Failed!';
            alertMessage = `Your advisor bungled the reform, potentially making things worse!\n\n${response.reform_summary}\n\nNew Policy: "${response.new_policy_name}"\n\nConsider using a more capable advisor next time.`;
            break;
        }
        
        // Show stat effects if available
        if (response.stat_effects && Object.keys(response.stat_effects).length > 0) {
          const effects = Object.entries(response.stat_effects)
            .map(([stat, change]) => {
              const num = change as number;
              const sign = num >= 0 ? '+' : '';
              return `${stat.replace(/_/g, ' ')}: ${sign}${num}`;
            })
            .join(', ');
          alertMessage += `\n\nEffects: ${effects}`;
        }
        
        Alert.alert(alertTitle, alertMessage);
        setShowReformModal(false);
        setSelectedPolicy(null);
        setReformInstructions('');
        fetchNation();
      } else {
        Alert.alert('❌ Error', response.detail || 'Failed to reform policy');
      }
    } catch (error: any) {
      console.error('Error reforming policy:', error);
      Alert.alert('❌ Error', error.message || 'Failed to reform policy');
    } finally {
      setSendingReform(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading advisors...</Text>
      </View>
    );
  }

  if (!nation || !nation.advisors || nation.advisors.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No advisors available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Advisors</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={24} color={themeColor} />
            {notificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.profileButton, { borderColor: themeColor }]}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle" size={28} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>

    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
      }
    >
      <View style={styles.header}>
        <Ionicons name="people" size={28} color={themeColor} />
        <Text style={styles.headerTitle}>
          {(() => {
            const govType = nation.government_type || 'Democracy';
            
            // Monarchies
            if (govType.includes('Father Knows Best')) return 'Royal Council';
            
            // Democracies and Republics
            if (govType.includes('Democracy') || govType.includes('Republic') || 
                govType.includes('Paradise') || govType.includes('Liberal')) return 'Cabinet';
            
            // Theocracies
            if (govType.includes('Theocratic')) return 'Holy Council';
            
            // Dictatorships
            if (govType.includes('Dictatorship') || govType.includes('Authoritarian') || 
                govType.includes('Iron Fist') || govType.includes('Psychotic')) return 'Inner Circle';
            
            // Corporate states
            if (govType.includes('Corporate') || govType.includes('Bordello')) return 'Board of Directors';
            
            // Anarchy
            if (govType.includes('Anarchy')) return 'Collective';
            
            // Socialist/Communist
            if (govType.includes('Socialist') || govType.includes('Eco-Socialist')) return 'Politburo';
            
            // Technocracies
            if (govType.includes('Tech') || govType.includes('Syndicate') || govType.includes('Meritocracy')) return 'Executive Board';
            
            // Military states
            if (govType.includes('Martial')) return 'War Council';
            
            // Default
            return 'Council of Advisors';
          })()}
        </Text>
      </View>

      <Text style={styles.subtitle}>
        Your key advisors serve {nation.name}
      </Text>

      {!canSendTaskToday() && (
        <View style={styles.dailyLimitBanner}>
          <Ionicons name="time-outline" size={20} color="#F59E0B" />
          <Text style={styles.dailyLimitText}>Daily task limit reached. Try again tomorrow.</Text>
        </View>
      )}

      <View style={styles.advisorsGrid}>
        {nation.advisors.filter(isFeatureComplete).map((advisor) => (
          <View key={advisor.slot} style={styles.advisorCard}>
            <View style={[styles.portrait, { borderColor: themeColor }]}>
              <Image 
                source={getAdvisorPortrait(nation.race, advisor.slot, advisor.name)}
                style={styles.portraitImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.advisorTitle}>{advisor.title}</Text>
            <Text style={styles.advisorName}>{advisor.name}</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Ability:</Text>
              <Text style={[styles.statValue, { color: getAbilityColor(advisor.ability) }]}>
                {advisor.ability}/100
              </Text>
            </View>

            <Text style={[styles.abilityLabel, { color: getAbilityColor(advisor.ability) }]}>
              ({getAbilityLabel(advisor.ability)})
            </Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Approval:</Text>
              <Text style={[styles.statValue, { color: getApprovalColor(advisor.approval) }]}>
                {advisor.approval}%
              </Text>
            </View>

            {isMilitaryAdvisor(advisor) ? (
              // War buttons for Military advisor
              <>
                <TouchableOpacity
                  style={[
                    styles.warButton,
                    { backgroundColor: canDeclareWar() ? '#EF4444' : '#64748B' }
                  ]}
                  onPress={handleOpenDeclareWarModal}
                  disabled={!canDeclareWar()}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                  <Text style={styles.warButtonText}>Declare War</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.warButton,
                    { 
                      backgroundColor: hasActiveWar() ? '#F59E0B' : '#334155',
                      opacity: hasActiveWar() ? 1 : 0.6
                    }
                  ]}
                  onPress={handleViewActiveWar}
                  disabled={!hasActiveWar()}
                >
                  <Ionicons name={hasActiveWar() ? "flame" : "moon-outline"} size={14} color="#FFFFFF" />
                  <Text style={styles.warButtonText}>
                    {hasActiveWar() ? 'View Active War' : 'No Active War'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : isForeignAdvisor(advisor) ? (
              // Diplomacy button for Foreign Affairs advisor
              <>
                <TouchableOpacity
                  style={[
                    styles.warButton,
                    { backgroundColor: '#10B981' }
                  ]}
                  onPress={() => router.push('/alliances')}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.warButtonText}>Non-Aggression Pacts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendTaskButton,
                    { backgroundColor: canSendTaskToday() ? themeColor : '#64748B' }
                  ]}
                  onPress={() => handleOpenTaskModal(advisor)}
                  disabled={!canSendTaskToday()}
                >
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                  <Text style={styles.sendTaskText}>Send Task</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Regular buttons for other advisors
              <>
                <TouchableOpacity
                  style={[
                    styles.sendTaskButton,
                    { backgroundColor: canSendTaskToday() ? themeColor : '#64748B' }
                  ]}
                  onPress={() => handleOpenTaskModal(advisor)}
                  disabled={!canSendTaskToday()}
                >
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                  <Text style={styles.sendTaskText}>Send Task</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reformButton,
                    { 
                      borderColor: canSendReform() && hasActivePolicies() ? themeColor : '#64748B',
                      opacity: canSendReform() && hasActivePolicies() ? 1 : 0.5
                    }
                  ]}
                  onPress={() => handleOpenReformModal(advisor)}
                  disabled={!canSendReform() || !hasActivePolicies()}
                >
                  <Ionicons 
                    name="construct" 
                    size={14} 
                    color={canSendReform() && hasActivePolicies() ? themeColor : '#64748B'} 
                  />
                  <Text style={[
                    styles.reformButtonText, 
                    { color: canSendReform() && hasActivePolicies() ? themeColor : '#64748B' }
                  ]}>
                    Reform
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}
      </View>

      {/* Global Reform Cooldown Banner */}
      {!canSendReform() && hasActivePolicies() && (
        <View style={[styles.dailyLimitBanner, { marginTop: 16 }]}>
          <Ionicons name="construct-outline" size={20} color="#F59E0B" />
          <Text style={styles.dailyLimitText}>
            Reform cooldown: {getDaysUntilReformAvailable()} days remaining before another policy can be reformed.
          </Text>
        </View>
      )}

      {/* Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTaskModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send Task</Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedAdvisor && (
            <View style={styles.modalContent}>
              <View style={styles.advisorInfo}>
                <View style={[styles.smallPortrait, { borderColor: themeColor }]}>
                  <Ionicons name="person" size={24} color={themeColor} />
                </View>
                <View>
                  <Text style={styles.modalAdvisorTitle}>{selectedAdvisor.title}</Text>
                  <Text style={styles.modalAdvisorName}>{selectedAdvisor.name}</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>What task would you like to assign?</Text>
              <TextInput
                style={styles.taskInput}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="e.g., Investigate corruption in the treasury department"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: themeColor }]}
                onPress={handleSendTask}
                disabled={sendingTask}
              >
                {sendingTask ? (
                  <Text style={styles.submitButtonText}>Sending...</Text>
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Send Task</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                Your advisor will generate a special issue based on this task. Results depend on their ability level.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Reform Policy Modal */}
      <Modal
        visible={showReformModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowReformModal(false);
          setSelectedPolicy(null);
          setReformInstructions('');
        }}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowReformModal(false);
              setSelectedPolicy(null);
              setReformInstructions('');
            }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reform Policy</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedAdvisor && (
              <>
                <View style={styles.advisorInfo}>
                  <View style={[styles.smallPortrait, { borderColor: themeColor }]}>
                    <Ionicons name="person" size={24} color={themeColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalAdvisorTitle}>{selectedAdvisor.title}</Text>
                    <Text style={styles.modalAdvisorName}>{selectedAdvisor.name}</Text>
                    <Text style={[styles.abilityHint, { color: getAbilityColor(selectedAdvisor.ability) }]}>
                      Ability: {selectedAdvisor.ability}/100 ({getAbilityLabel(selectedAdvisor.ability)})
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Select a policy to reform:</Text>
                
                {nation.policies && nation.policies.length > 0 ? (
                  <View style={styles.policyList}>
                    {nation.policies.map((policy: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.policyItem,
                          selectedPolicy?.name === policy.name && { 
                            borderColor: themeColor,
                            backgroundColor: `${themeColor}15`
                          }
                        ]}
                        onPress={() => setSelectedPolicy(policy)}
                      >
                        <View style={styles.policyItemHeader}>
                          <Text style={styles.policyItemName}>{policy.name}</Text>
                          {selectedPolicy?.name === policy.name && (
                            <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                          )}
                        </View>
                        <Text style={styles.policyItemCategory}>{policy.category}</Text>
                        <Text style={styles.policyItemDesc} numberOfLines={2}>
                          {policy.short_description || policy.news_snippet}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noPolicies}>
                    <Ionicons name="document-outline" size={32} color="#64748B" />
                    <Text style={styles.noPoliciesText}>No policies to reform yet</Text>
                  </View>
                )}

                {selectedPolicy && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                      How do you want this policy changed? (required)
                    </Text>
                    <TextInput
                      style={styles.taskInput}
                      value={reformInstructions}
                      onChangeText={setReformInstructions}
                      placeholder="e.g., Make it more business-friendly, reduce restrictions, add environmental protections..."
                      placeholderTextColor="#64748B"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    <TouchableOpacity
                      style={[
                        styles.submitButton, 
                        { backgroundColor: reformInstructions.trim() ? themeColor : '#64748B' }
                      ]}
                      onPress={handleSendReform}
                      disabled={sendingReform || !reformInstructions.trim()}
                    >
                      {sendingReform ? (
                        <Text style={styles.submitButtonText}>Reforming...</Text>
                      ) : (
                        <>
                          <Ionicons name="construct" size={18} color="#FFFFFF" />
                          <Text style={styles.submitButtonText}>Reform Policy</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.reformWarning}>
                  <Ionicons name="information-circle" size={16} color="#F59E0B" />
                  <Text style={styles.reformWarningText}>
                    Reform outcomes depend on advisor ability. High ability = improvements, low ability = may make things worse. Your nation can only reform one policy every 7 days. Be specific in your instructions!
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Declare War Modal */}
      <Modal
        visible={showDeclareWarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeclareWarModal(false)}
      >
        <View style={styles.warModalOverlay}>
          <View style={styles.warModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚔️ Declare War</Text>
              <TouchableOpacity onPress={() => setShowDeclareWarModal(false)}>
                <Ionicons name="close" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a nation to declare war on:
            </Text>

            <FlatList
              data={availableNationsForWar}
              keyExtractor={(item) => item.nation_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.nationSelectItem}
                  onPress={() => handleDeclareWarOnNation(item.nation_id, item.nation_name)}
                >
                  <View style={styles.nationSelectInfo}>
                    <View style={styles.nationSelectHeader}>
                      <Text style={styles.nationSelectName}>{item.nation_name}</Text>
                      {item.faction_tag && (
                        <View style={[styles.factionTagSmall, { backgroundColor: item.faction_color || '#8B5CF6' }]}>
                          <Text style={styles.factionTagTextSmall}>{item.faction_tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nationSelectStats}>
                      Pop: {item.pop_display || '0 million'} | 
                      Mil Budget: ${item.budget_defense ? item.budget_defense.toFixed(1) : '0'}T | 
                      GDP: {item.gdp_display || '$0'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
              style={styles.nationList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No nations available for war</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  dailyLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  dailyLimitText: {
    color: '#FCD34D',
    fontSize: 14,
    flex: 1,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  noDataText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  advisorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  advisorCard: {
    width: (width - 44) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
  },
  portrait: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: '#0F172A',
    marginBottom: 12,
    overflow: 'hidden',
  },
  portraitImage: {
    width: 80,
    height: 110,
    resizeMode: 'cover',
  },
  advisorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 4,
  },
  advisorName: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  abilityLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  sendTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sendTaskText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalClose: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalContent: {
    padding: 16,
  },
  advisorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 24,
  },
  smallPortrait: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAdvisorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalAdvisorName: {
    fontSize: 14,
    color: '#94A3B8',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  taskInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 15,
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  reformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  reformButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  abilityHint: {
    fontSize: 12,
    marginTop: 4,
  },
  policyList: {
    gap: 12,
  },
  policyItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  },
  policyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  policyItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    flex: 1,
  },
  policyItemCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  policyItemDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 6,
    lineHeight: 18,
  },
  noPolicies: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noPoliciesText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
  },
  reformWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#78350F33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  reformWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#FCD34D',
    lineHeight: 18,
  },
  warButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  warButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  nationList: {
    maxHeight: 400,
    marginTop: 16,
  },
  nationSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nationSelectInfo: {
    flex: 1,
  },
  nationSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  nationSelectStats: {
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
    marginTop: 40,
  },
  warModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  nationSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  factionTagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  factionTagTextSmall: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

