import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNationStore } from '../../store/nationStore';
import { format } from 'date-fns';
import { api } from '../../utils/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { getNationSizeClass } from '../../utils/nationSize';
import { getRaceTheme, getRaceName, getRaceIcon } from '../../utils/raceColors';
import { leaningColor, leaningWash, hexAlpha } from '../../utils/politicalCompass';
import { colors, typography, spacing, radii } from '../../utils/theme';
import { govTitle, govBlurb } from '../../utils/govCopy';
import NewsFeed from '../../components/NewsFeed';
import CollapsibleSection from '../../components/CollapsibleSection';
import { TabChrome } from '../../components/ScreenHeader';

// Race descriptions
const RACE_DESCRIPTIONS: Record<string, { description: string; lore: string }> = {
  human: {
    description: "Adaptable and ambitious, humans are known for their diversity and drive to explore and expand.",
    lore: "Humans arrived on this world generations ago, their origins lost to time. They have since spread across the continents, building cities, forging alliances, and occasionally waging wars. Their short lifespans drive them to achieve greatness quickly."
  },
  zythera: {
    description: "Beautiful insectoid beings native to this world, the Zythera live in caste-based societies ruled by their Queens.",
    lore: "The Zythera have called this world home since before recorded history. Their great Hive-Cities dot the landscape, magnificent structures of hardite secretions and crystalline architecture. Each Hive is led by a Queen, whose wisdom guides her people. The Zythera remember when the humans first arrived, and the two species have had a complex relationship ever since."
  }
};

// Leader portrait mappings
const LEADER_PORTRAITS: Record<string, any> = {
  // Zythera - always Queen with wings (fallback)
  zythera_queen: require('../../assets/portraits/zythera_leader_queen.png'),
  
  // Human leaders by government style and gender
  president_male: require('../../assets/portraits/human_leader_president_male.png'),
  president_female: require('../../assets/portraits/human_leader_president_female.png'),
  prime_minister_male: require('../../assets/portraits/human_leader_prime_minister_male.png'),
  prime_minister_female: require('../../assets/portraits/human_leader_prime_minister_female.png'),
  king: require('../../assets/portraits/human_leader_king.png'),
  queen: require('../../assets/portraits/human_leader_queen.png'),
  emperor: require('../../assets/portraits/human_leader_emperor.png'),
  empress: require('../../assets/portraits/human_leader_empress.png'),
  dictator_male: require('../../assets/portraits/human_leader_dictator_male.png'),
  dictator_female: require('../../assets/portraits/human_leader_dictator_female.png'),
  chairman_male: require('../../assets/portraits/human_leader_chairman_male.png'),
  chairwoman_female: require('../../assets/portraits/human_leader_chairwoman_female.png'),
  ceo_male: require('../../assets/portraits/human_leader_ceo_male.png'),
  ceo_female: require('../../assets/portraits/human_leader_ceo_female.png'),
  high_priest: require('../../assets/portraits/human_leader_high_priest.png'),
  high_priestess: require('../../assets/portraits/human_leader_high_priestess.png'),
  general_male: require('../../assets/portraits/human_leader_general_male.png'),
  general_female: require('../../assets/portraits/human_leader_general_female.png'),
};

// Zythera Queen portraits - normal/benevolent governments
const ZYTHERA_QUEEN_PORTRAITS: any[] = [
  require('../../assets/portraits/zythera_queens/queen_1.jpg'),
  require('../../assets/portraits/zythera_queens/queen_2.jpg'),
  require('../../assets/portraits/zythera_queens/queen_3.jpg'),
  require('../../assets/portraits/zythera_queens/queen_4.jpg'),
  require('../../assets/portraits/zythera_queens/queen_5.jpg'),
  require('../../assets/portraits/zythera_queens/queen_6.jpg'),
  require('../../assets/portraits/zythera_queens/queen_7.jpg'),
  require('../../assets/portraits/zythera_queens/queen_8.jpg'),
  require('../../assets/portraits/zythera_queens/queen_9.jpg'),
  require('../../assets/portraits/zythera_queens/queen_10.jpg'),
  require('../../assets/portraits/zythera_queens/queen_11.jpg'),
  require('../../assets/portraits/zythera_queens/queen_12.jpg'),
];

// Zythera Queen portraits - evil/oppressive governments
const ZYTHERA_QUEEN_EVIL_PORTRAITS: any[] = [
  require('../../assets/portraits/zythera_queens_evil/queen_evil_1.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_2.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_3.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_4.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_5.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_6.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_7.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_8.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_9.jpg'),
  require('../../assets/portraits/zythera_queens_evil/queen_evil_10.jpg'),
];

// Evil/oppressive Zythera government types
const EVIL_ZYTHERA_GOVERNMENTS = [
  'Hivemind Collective',
  'Parasitic Hive',
  'Royal Hive',
  'Imperial Swarm',
  'Divine Hive',
  'Militant Hive',
  'Ordered Colony',
  'Splinter Colony',
];

// Get a consistent portrait index based on nation name (for persistence)
const getPortraitIndex = (nationName: string, arrayLength: number): number => {
  let hash = 0;
  for (let i = 0; i < nationName.length; i++) {
    const char = nationName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % arrayLength;
};

// Government type to leader type mapping
const getLeaderTypeFromGovernment = (governmentType: string): string => {
  const govLower = governmentType?.toLowerCase() || '';
  
  // Monarchies
  if (govLower.includes('monarchy') || govLower.includes('benevolent dictatorship') || govLower.includes('father knows')) {
    return 'monarch';
  }
  // Empires
  if (govLower.includes('empire') || govLower.includes('iron fist')) {
    return 'emperor';
  }
  // Theocracies
  if (govLower.includes('theocr') || govLower.includes('moralistic')) {
    return 'theocrat';
  }
  // Military
  if (govLower.includes('martial') || govLower.includes('military') || govLower.includes('police state')) {
    return 'military';
  }
  // Corporate/Tech
  if (govLower.includes('corporate') || govLower.includes('tech') || govLower.includes('capitalist') || govLower.includes('market')) {
    return 'corporate';
  }
  // Authoritarian/Dictatorship
  if (govLower.includes('dictator') || govLower.includes('authoritarian') || govLower.includes('psychotic') || govLower.includes('surveillance') || govLower.includes('corrupt')) {
    return 'dictator';
  }
  // Socialist/Communist
  if (govLower.includes('socialist') || govLower.includes('communist') || govLower.includes('left-wing')) {
    return 'chairman';
  }
  // Default - Democracy
  return 'president';
};

// Detect gender from leader name
const detectLeaderGender = (name: string): 'male' | 'female' => {
  if (!name) return 'male';
  const firstName = name.split(' ')[0].toLowerCase();
  
  const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle', 'carol', 'amanda', 'melissa', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'anna', 'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'rachel', 'catherine', 'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'sara', 'frances', 'kathryn', 'janice', 'abigail', 'alice', 'sophia', 'grace', 'natalie', 'charlotte', 'marie', 'alexis', 'elena', 'clara', 'rose', 'jane', 'anne', 'eleanor', 'lucy', 'julia', 'eva', 'lily', 'stella', 'ruby', 'violet', 'zoe', 'chloe', 'mia', 'aurora', 'hazel', 'ivy', 'queen', 'empress', 'lady', 'dame', 'duchess'];
  
  if (femaleNames.includes(firstName)) return 'female';
  if (firstName.endsWith('a') || firstName.endsWith('ie') || firstName.endsWith('ine') || firstName.endsWith('ella') || firstName.endsWith('ette')) return 'female';
  
  return 'male';
};

// Get leader portrait based on race, government type, and leader name
const getLeaderPortrait = (race: string | undefined, governmentType: string, leaderName: string, nationName?: string) => {
  // Zythera always have a Queen - select from appropriate portrait set
  if (race?.toLowerCase() === 'zythera') {
    const isEvil = EVIL_ZYTHERA_GOVERNMENTS.includes(governmentType);
    const portraits = isEvil ? ZYTHERA_QUEEN_EVIL_PORTRAITS : ZYTHERA_QUEEN_PORTRAITS;
    // Use nation name to get a consistent portrait for this nation
    const portraitIndex = getPortraitIndex(nationName || leaderName, portraits.length);
    return portraits[portraitIndex];
  }
  
  // For humans, determine leader type and gender
  const leaderType = getLeaderTypeFromGovernment(governmentType);
  const gender = detectLeaderGender(leaderName);
  
  // Map leader type to portrait key
  switch (leaderType) {
    case 'monarch':
      return gender === 'female' ? LEADER_PORTRAITS.queen : LEADER_PORTRAITS.king;
    case 'emperor':
      return gender === 'female' ? LEADER_PORTRAITS.empress : LEADER_PORTRAITS.emperor;
    case 'theocrat':
      return gender === 'female' ? LEADER_PORTRAITS.high_priestess : LEADER_PORTRAITS.high_priest;
    case 'military':
      return gender === 'female' ? LEADER_PORTRAITS.general_female : LEADER_PORTRAITS.general_male;
    case 'corporate':
      return gender === 'female' ? LEADER_PORTRAITS.ceo_female : LEADER_PORTRAITS.ceo_male;
    case 'dictator':
      return gender === 'female' ? LEADER_PORTRAITS.dictator_female : LEADER_PORTRAITS.dictator_male;
    case 'chairman':
      return gender === 'female' ? LEADER_PORTRAITS.chairwoman_female : LEADER_PORTRAITS.chairman_male;
    case 'president':
    default:
      return gender === 'female' ? LEADER_PORTRAITS.president_female : LEADER_PORTRAITS.president_male;
  }
};

// Get leader title based on race and government type
const getLeaderTitle = (race: string | undefined, governmentType: string, leaderName: string) => {
  // Zythera always have a Queen
  if (race?.toLowerCase() === 'zythera') {
    return 'Queen';
  }
  
  const leaderType = getLeaderTypeFromGovernment(governmentType);
  const gender = detectLeaderGender(leaderName);
  
  switch (leaderType) {
    case 'monarch':
      return gender === 'female' ? 'Queen' : 'King';
    case 'emperor':
      return gender === 'female' ? 'Empress' : 'Emperor';
    case 'theocrat':
      return gender === 'female' ? 'High Priestess' : 'High Priest';
    case 'military':
      return 'Supreme General';
    case 'corporate':
      return 'Chief Executive';
    case 'dictator':
      return 'Supreme Leader';
    case 'chairman':
      return gender === 'female' ? 'Chairwoman' : 'Chairman';
    case 'president':
    default:
      return 'President';
  }
};

export default function Nation() {
  const router = useRouter();
  const { nation, setNation } = useNationStore();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [regeneratingDescription, setRegeneratingDescription] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [descriptionTimer, setDescriptionTimer] = useState<string>('');
  
  // Modal state for info popups
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; content: string }>({
    visible: false,
    title: '',
    content: ''
  });
  
  // Get dynamic theme color based on RACE
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);
  const raceName = getRaceName(nation?.race);
  const raceIcon = getRaceIcon(nation?.race);

  // Show government type description
  const showGovernmentInfo = () => {
    if (!nation?.government_type) return;
    const description = govBlurb(nation.government_type) || "A unique form of governance.";
    setInfoModal({
      visible: true,
      title: govTitle(nation.government_type),
      content: description
    });
  };

  // Show race/species description
  const showRaceInfo = () => {
    const raceId = nation?.race?.toLowerCase() || 'human';
    const raceData = RACE_DESCRIPTIONS[raceId] || RACE_DESCRIPTIONS.human;
    setInfoModal({
      visible: true,
      title: raceName,
      content: `${raceData.description}\n\n${raceData.lore}`
    });
  };

  // Refresh nation data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (nation?.id || nation?._id) {
        refreshNation();
        loadNotificationCount();
      }
    }, []) // Empty dependency array - only run on focus, not on nation changes
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

  const refreshNation = async () => {
    if (!nation?.id && !nation?._id) return;
    
    setRefreshing(true);
    try {
      const nationId = nation.id || nation._id;
      const response = await api.getNation(nationId);
      if (response.success) {
        setNation(response.nation);
      }
    } catch (error) {
      console.error('Error refreshing nation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkDescriptionTimer = async () => {
    if (!nation?.id && !nation?._id) return;
    
    try {
      const nationId = nation.id || nation._id;
      const response = await api.regenerateDescription(nationId);
      
      if (response.success) {
        setDescriptionTimer(response.timer_display || '');
        
        // If description was just refreshed, update the nation
        if (response.just_refreshed && response.description) {
          const updatedNation = { ...nation, description: response.description };
          setNation(updatedNation);
        }
      }
    } catch (error) {
      console.error('Error checking description timer:', error);
    }
  };

  // Check description timer on focus
  useFocusEffect(
    useCallback(() => {
      if (nation?.id || nation?._id) {
        checkDescriptionTimer();
      }
    }, []) // Empty dependency - only run on focus
  );

  if (!nation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No nation found</Text>
      </View>
    );
  }

  const stats = nation.stats;
  const createdDate = new Date(nation.created_at);
  const daysOld = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  const centerCol = nation.territory_center_col || 100;
  const centerRow = nation.territory_center_row || 100;

  const renderFlag = () => {
    if (!nation.flag_base64) return null;
    
    const isSvg = nation.flag_base64.includes('svg');
    const isZythera = nation.race?.toLowerCase() === 'zythera';
    
    if (isSvg) {
      // Decode base64 SVG
      const base64Data = nation.flag_base64.split('base64,')[1];
      const svgString = atob(base64Data);
      
      // Check if it's a hexagonal flag (contains hexClip)
      const isHexFlag = svgString.includes('hexClip');
      
      return (
        <View style={isHexFlag ? styles.hexFlagContainer : styles.flagContainer}>
          <SvgXml xml={svgString} width={isHexFlag ? 120 : 150} height={isHexFlag ? 104 : 100} />
        </View>
      );
    } else {
      // Regular image
      return (
        <View style={isZythera ? styles.hexFlagContainer : styles.flagContainer}>
          <Image source={{ uri: nation.flag_base64 }} style={styles.flagImage} resizeMode="contain" />
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: leaningWash(nation, 0.06) }]}>
      <TabChrome title={nation.name} subtitle={govTitle(nation.government_type)} badge={notificationCount} />

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshNation} tintColor={themeColor} />
        }
      >
      <View
        style={[
          styles.headerCard,
          { backgroundColor: leaningWash(nation, 0.10), borderColor: themeColor, borderWidth: 1 },
        ]}
      >
        {renderFlag()}
        <Text style={styles.nationName}>{nation.name}</Text>
        <TouchableOpacity onPress={showRaceInfo} style={styles.raceRow} activeOpacity={0.7}>
          <Ionicons name={raceIcon as any} size={16} color={themeColor} />
          <Text style={[styles.raceText, { color: themeColor }]}>{raceName}</Text>
          <Ionicons name="information-circle-outline" size={14} color={themeColor} style={{ marginLeft: 4, opacity: 0.7 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={showGovernmentInfo} activeOpacity={0.7}>
          <Text style={[styles.governmentType, { textDecorationLine: 'underline', color: themeColor }]}>{govTitle(nation.government_type)}</Text>
        </TouchableOpacity>
        <Text style={[styles.sizeClass, { color: themeColor }]}>{getNationSizeClass(stats.population)}</Text>
        {nation.motto && (
          <Text style={styles.motto}>{'\u201c'}{nation.motto}{'\u201d'}</Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: themeColor, backgroundColor: leaningWash(nation, 0.12) }]}
          onPress={() => router.push('/world-map')}
        >
          <Ionicons name="globe" size={16} color={colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>World Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: themeColor, backgroundColor: leaningWash(nation, 0.12) }]}
          onPress={() => router.push('/policies')}
        >
          <Ionicons name="document-text" size={16} color={colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Policies</Text>
        </TouchableOpacity>
      </View>

      <CollapsibleSection title="Leader" initiallyOpen>
        <View style={styles.leaderSection}>
          <View style={[styles.leaderPortraitContainer, { borderColor: colors.accent.gold }]}>
            <Image
              source={getLeaderPortrait(nation.race, nation.government_type, nation.leader_name || nation.name, nation.name)}
              style={styles.leaderPortrait}
              resizeMode="cover"
            />
          </View>
          <View style={styles.leaderInfo}>
            <Text style={[styles.leaderTitle, { color: colors.accent.gold }]}>
              {getLeaderTitle(nation.race, nation.government_type, nation.leader_name || nation.name)}
            </Text>
            <Text style={styles.leaderName}>{nation.leader_name || 'Unknown Leader'}</Text>
            <TouchableOpacity onPress={showGovernmentInfo} activeOpacity={0.7}>
              <Text style={styles.leaderGovType}>{govTitle(nation.government_type)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="National Description" initiallyOpen>
        <View style={styles.sectionHeaderInline}>
          <View style={styles.descriptionTimerContainer}>
            <Ionicons name="time-outline" size={14} color={colors.text.muted} />
            <Text style={styles.descriptionTimerText}>{descriptionTimer || 'Loading...'}</Text>
          </View>
        </View>
        <Text style={styles.descriptionText}>{nation.description}</Text>
        <Text style={styles.descriptionHint}>Descriptions update weekly based on your nation's progress</Text>
      </CollapsibleSection>

      <CollapsibleSection title="Realm Details">
        <View style={styles.detailGrid}>
          <Text style={styles.detailText}>Currency: {nation.currency || 'Credits'}</Text>
          <Text style={styles.detailText}>National Animal: {nation.national_animal || 'Eagle'}</Text>
          <Text style={styles.detailText}>Founded: {format(createdDate, 'MMM d, yyyy')}</Text>
          <Text style={styles.detailText}>Age: {daysOld} days</Text>
          <Text style={styles.detailText}>Decisions: {nation.total_decisions}</Text>
          <Text style={styles.detailText}>Capital: ({centerCol}, {centerRow})</Text>
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Global News Feed">
        <NewsFeed themeColor={themeColor} />
      </CollapsibleSection>

      <Text style={styles.footerText}>SovereignHex v1.0.0</Text>
    </ScrollView>
    
    {/* Info Modal */}
    <Modal
      visible={infoModal.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setInfoModal({ ...infoModal, visible: false })}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setInfoModal({ ...infoModal, visible: false })}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{infoModal.title}</Text>
          <Text style={styles.modalText}>{infoModal.content}</Text>
          <TouchableOpacity 
            style={styles.modalButton} 
            onPress={() => setInfoModal({ ...infoModal, visible: false })}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: 44,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topHeaderTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notificationButton: {
    padding: spacing.xs,
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
    ...typography.small,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profileButton: {
    padding: spacing.xs,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  flagContainer: {
    marginBottom: spacing.md,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  hexFlagContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagImage: {
    width: 150,
    height: 100,
  },
  nationName: {
    ...typography.display,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  raceText: {
    ...typography.body,
    fontWeight: '600',
  },
  governmentType: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  sizeClass: {
    ...typography.body,
    fontWeight: '600',
  },
  motto: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  descriptionTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    gap: 4,
  },
  descriptionTimerText: {
    ...typography.small,
    color: colors.text.muted,
  },
  descriptionHint: {
    ...typography.small,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    padding: spacing.md,
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
  },
  leaderSection: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  leaderPortraitContainer: {
    width: 100,
    height: 130,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    marginRight: spacing.md,
  },
  leaderPortrait: {
    width: 100,
    height: 130,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  leaderName: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  leaderGovType: {
    ...typography.small,
    color: colors.text.secondary,
  },
  detailGrid: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footerText: {
    ...typography.small,
    textAlign: 'center',
    color: colors.text.muted,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  modalButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.headline,
    color: colors.background,
  },
});
;
