import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlagCreator from '../components/FlagCreator';
import { api } from '../utils/api';
import { notificationService } from '../utils/notifications';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { getRaceTheme } from '../utils/raceColors';
import { ReputationCard } from '../components/ReputationCard';

export default function Profile() {
  const router = useRouter();
  const { nation, clearNation, setNation } = useNationStore();
  const [userId, setUserId] = useState('');
  const [showFlagCreator, setShowFlagCreator] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

  useEffect(() => {
    loadUserId();
    checkNotifications();
  }, []);

  const loadUserId = async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) setUserId(id);
  };
  
  const checkNotifications = async () => {
    const status = await notificationService.getPermissionsStatus();
    setNotificationsEnabled(status === 'granted');
  };
  
  const [editCurrency, setEditCurrency] = useState(nation?.currency || 'Credits');
  const [editAnimal, setEditAnimal] = useState(nation?.national_animal || 'Eagle');
  
  const handleFlagCreated = async (flagBase64: string) => {
    if (!nation?.id && !nation?._id) return;
    
    try {
      const nationId = nation.id || nation._id;
      await api.updateFlag(nationId, flagBase64);
      
      // Fetch updated nation from server
      const response = await api.getNation(nationId);
      if (response.success) {
        setNation(response.nation);
      }
      
      setShowFlagCreator(false);
      Alert.alert('Success', 'Your flag has been updated! Check the Nation tab to see it.');
    } catch (error) {
      console.error('Error updating flag:', error);
      Alert.alert('Error', 'Failed to update flag');
    }
  };
  
  const handleCustomizationUpdate = async () => {
    if (!nation?.id && !nation?._id) return;
    
    try {
      const nationId = nation.id || nation._id;
      await api.updateCustomization(nationId, {
        currency: editCurrency,
        national_animal: editAnimal
      });
      
      // Fetch updated nation from server
      const response = await api.getNation(nationId);
      if (response.success) {
        setNation(response.nation);
      }
      
      setShowCustomizationModal(false);
      Alert.alert('Success', 'Your nation customization has been updated!');
    } catch (error) {
      console.error('Error updating customization:', error);
      Alert.alert('Error', 'Failed to update customization');
    }
  };
  
  const toggleNotifications = async () => {
    console.log('Toggle notifications clicked, current state:', notificationsEnabled);
    
    if (notificationsEnabled) {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        setNotificationsEnabled(false);
        Alert.alert('Disabled', 'Daily notifications turned off');
      } catch (error) {
        console.error('Error disabling notifications:', error);
      }
    } else {
      try {
        console.log('Requesting permissions...');
        const hasPermission = await notificationService.requestPermissions();
        console.log('Permission result:', hasPermission);
        
        if (hasPermission) {
          await notificationService.scheduleDailyReminder(9);
          setNotificationsEnabled(true);
          Alert.alert('Enabled', 'You will receive daily reminders at 9:00 AM');
        } else {
          Alert.alert('Permission Denied', 'Please enable notifications in system settings');
        }
      } catch (error) {
        console.error('Error enabling notifications:', error);
        Alert.alert('Error', 'Failed to enable notifications. They may not be supported on this platform.');
      }
    }
  };

  const handleDeleteNation = async () => {
    console.log('Delete button pressed');
    console.log('Nation:', nation);
    console.log('Nation ID:', nation?.id || nation?._id);
    
    // Use window.confirm for web since Alert.alert doesn't work on web
    const confirmed = confirm('Are you sure you want to permanently delete your nation? This action cannot be undone.');
    
    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }
    
    try {
      const nationId = nation?.id || nation?._id;
      console.log('Attempting to delete nation:', nationId);
      
      if (nationId) {
        const response = await api.deleteNation(nationId);
        console.log('Delete API response:', response);
        
        if (!response.success) {
          alert('Failed to delete nation: ' + (response.detail || 'Unknown error'));
          return;
        }
      }
      
      console.log('Clearing local nation data...');
      await clearNation();
      console.log('Redirecting to home...');
      router.replace('/');
    } catch (error) {
      console.error('Delete nation error:', error);
      alert('Failed to delete nation. Please try again.');
    }
  };

  const copyUserId = () => {
    Alert.alert('Your User ID', userId, [{ text: 'OK' }]);
  };

  if (!nation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No nation found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle" size={80} color={themeColor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User ID</Text>
          <View style={styles.userIdCard}>
            <Text style={styles.userIdLabel}>Your User ID:</Text>
            <Text style={styles.userId}>{userId || 'Not available'}</Text>
            <Text style={styles.userIdNote}>Save this to login from other devices</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyUserId}>
              <Text style={styles.copyButtonText}>View ID</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reputation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reputation</Text>
          <ReputationCard 
            nationId={nation?.id || nation?._id || ''} 
            themeColor={themeColor}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customization</Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => setShowFlagCreator(true)}>
            <Ionicons name="flag" size={24} color={themeColor} />
            <Text style={styles.settingButtonText}>Design Flag</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => {
            setEditCurrency(nation.currency || 'Credits');
            setEditAnimal(nation.national_animal || 'Eagle');
            setShowCustomizationModal(true);
          }}>
            <Ionicons name="create-outline" size={24} color={themeColor} />
            <Text style={styles.settingButtonText}>Edit Currency & Animal</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multiplayer</Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/faction-browser')}>
            <Ionicons name="people" size={24} color="#00E0C7" />
            <Text style={styles.settingButtonText}>Factions</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/world-news')}>
            <Ionicons name="newspaper" size={24} color="#F2C94C" />
            <Text style={styles.settingButtonText}>World News & Voting</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/servers')}>
            <Ionicons name="globe" size={24} color="#27D17A" />
            <Text style={styles.settingButtonText}>Server Browser</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <TouchableOpacity 
            style={[styles.settingButton, notificationsEnabled && styles.settingButtonActive]} 
            onPress={toggleNotifications}
          >
            <Ionicons name={notificationsEnabled ? "notifications" : "notifications-off"} size={24} color={notificationsEnabled ? "#27D17A" : "rgba(243,246,250,0.48)"} />
            <Text style={styles.settingButtonText}>
              {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
            </Text>
            <View style={{ width: 20 }} />
          </TouchableOpacity>
          {notificationsEnabled && (
            <Text style={styles.notificationNote}>Daily reminder at 9:00 AM</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => {
              console.log('Opening delete confirmation modal');
              setShowDeleteConfirm(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={24} color="#F3F6FA" />
            <Text style={styles.deleteButtonText}>Delete Nation</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>SovereignHex v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={showFlagCreator}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFlagCreator(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFlagCreator(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Flag Designer</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlagCreator onFlagCreated={handleFlagCreated} race={nation?.race} />
        </View>
      </Modal>

      <Modal
        visible={showCustomizationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomizationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomizationModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Customize Nation</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Currency Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editCurrency}
              onChangeText={setEditCurrency}
              placeholder="Credits"
              placeholderTextColor="rgba(243,246,250,0.48)"
            />
            
            <Text style={styles.modalLabel}>National Animal</Text>
            <TextInput
              style={styles.modalInput}
              value={editAnimal}
              onChangeText={setEditAnimal}
              placeholder="Eagle"
              placeholderTextColor="rgba(243,246,250,0.48)"
            />
            
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: themeColor }]} onPress={handleCustomizationUpdate}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="warning" size={48} color="#FF5A65" style={{ marginBottom: 16 }} />
            <Text style={styles.deleteModalTitle}>Delete Nation?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to permanently delete your nation? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.deleteModalCancelButton} 
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteModalConfirmButton} 
                onPress={async () => {
                  console.log('User confirmed deletion');
                  setDeleting(true);
                  try {
                    const nationId = nation?.id || nation?._id;
                    if (nationId) {
                      const res = await api.deleteNation(nationId);
                      console.log('Delete result:', res);
                    }
                    await clearNation();
                    setShowDeleteConfirm(false);
                    router.replace('/');
                  } catch (err: any) {
                    console.error('Delete error:', err);
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={deleting}
              >
                <Text style={styles.deleteModalConfirmText}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingVertical: 16,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  content: {
    padding: 16,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 12,
  },
  userIdCard: {
    backgroundColor: '#11171F',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  userIdLabel: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 8,
  },
  userId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00E0C7',
    marginBottom: 8,
  },
  userIdNote: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  copyButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '500',
  },
  settingButton: {
    backgroundColor: '#11171F',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingButtonActive: {
    borderColor: '#27D17A',
  },
  warButtonActive: {
    borderColor: '#FF5A65',
    borderWidth: 2,
    backgroundColor: '#1E1B4B',
  },
  settingButtonText: {
    flex: 1,
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '500',
  },
  notificationNote: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginTop: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#FF5A65',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deleteButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(243,246,250,0.48)',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF5A65',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0F14',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  modalClose: {
    color: '#00E0C7',
    fontSize: 16,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  modalContent: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#11171F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#F3F6FA',
    fontSize: 16,
  },
  saveButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: '#11171F',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FF5A65',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '600',
  },
});
