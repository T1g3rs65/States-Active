import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { useAccountStore } from '../store/accountStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlagCreator from '../components/FlagCreator';
import { api } from '../utils/api';
import { notificationService } from '../utils/notifications';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { getRaceTheme } from '../utils/raceColors';
import { leaningColor } from '../utils/politicalCompass';
import { ReputationCard } from '../components/ReputationCard';
import ScreenHeader from '../components/ScreenHeader';
import EmptyNation from '../components/EmptyNation';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert, glassConfirm } from '../components/GlassModal';

export default function Profile() {
  const router = useRouter();
  const { nation, clearNation, setNation } = useNationStore();
  const { user, clearSession } = useAccountStore();
  const [userId, setUserId] = useState('');
  const [showFlagCreator, setShowFlagCreator] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Get race-based theme color
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = leaningColor(nation);

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
      await glassAlert({ title: 'Success', message: 'Your flag has been updated! Check the Nation tab to see it.' });
    } catch (error) {
      console.error('Error updating flag:', error);
      await glassAlert({ title: 'Error', message: 'Failed to update flag' });
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
      await glassAlert({ title: 'Success', message: 'Your nation customization has been updated!' });
    } catch (error) {
      console.error('Error updating customization:', error);
      await glassAlert({ title: 'Error', message: 'Failed to update customization' });
    }
  };
  
  const toggleNotifications = async () => {
    console.log('Toggle notifications clicked, current state:', notificationsEnabled);
    
    if (notificationsEnabled) {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        setNotificationsEnabled(false);
        await glassAlert({ title: 'Disabled', message: 'Daily notifications turned off' });
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
          await glassAlert({ title: 'Enabled', message: 'You will receive daily reminders at 9:00 AM' });
        } else {
          await glassAlert({ title: 'Permission Denied', message: 'Please enable notifications in system settings' });
        }
      } catch (error) {
        console.error('Error enabling notifications:', error);
        await glassAlert({ title: 'Error', message: 'Failed to enable notifications. They may not be supported on this platform.' });
      }
    }
  };

  const handleSignOut = async () => {
    const ok = await glassConfirm({
      title: 'Sign out?',
      message: 'This device will forget the session. Your nation and account stay. Sign in again to come back.',
      confirmText: 'Sign out',
      cancelText: 'Stay',
    });
    if (!ok) return;
    try {
      await clearSession();
      await clearNation();
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
      await glassAlert({ title: 'Sign out failed', message: 'Could not clear the session. Try again.' });
    }
  };

  const handleDeleteNation = async () => {
    const ok = await glassConfirm({
      title: 'Delete nation?',
      message: 'Permanently delete your nation? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    try {
      const nationId = nation?.id || nation?._id;
      if (nationId) {
        const response = await api.deleteNation(nationId);
        if (!response.success) {
          await glassAlert({ title: 'Delete failed', message: response.detail || 'Unknown error' });
          return;
        }
      }
      await clearNation();
      router.replace('/');
    } catch (error: any) {
      console.error('Delete nation error:', error);
      await glassAlert({ title: 'Delete failed', message: 'Failed to delete nation. Please try again.' });
    }
  };

  const copyUserId = async () => {
    await glassAlert({ title: 'Your User ID', message: userId || 'Not available' });
  };

  if (!nation) {
    return <EmptyNation />;
  }

  return (
    <ScreenCanvas>
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScreenHeader title="Profile" subtitle="Leader and identity" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle" size={80} color={themeColor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <LiquidGlass radius={22} style={styles.userIdCard}>
            <Text style={styles.userIdLabel}>Signed in as</Text>
            <Text style={styles.userId}>{user?.email || 'Account'}</Text>
            <Text style={styles.userIdNote}>Use Sign in / Create account on another device.</Text>
          </LiquidGlass>
          <TouchableOpacity style={styles.settingButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color={themeColor} />
            <Text style={styles.settingButtonText}>Sign out</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(243,246,250,0.48)" />
          </TouchableOpacity>
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
          
          <TouchableOpacity style={styles.settingButton} onPress={async () => {
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
            onPress={handleDeleteNation}
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
    </View>
    </ScreenCanvas>
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
