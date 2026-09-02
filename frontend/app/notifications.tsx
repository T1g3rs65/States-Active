import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { leaningColor } from '../utils/politicalCompass';
import ScreenHeader, { HeaderIcon } from '../components/ScreenHeader';
import { glassAlert, glassConfirm } from '../components/GlassModal';
import StatusDots, { ButtonBusy } from '../components/StatusDots';
import ScreenCanvas from '../components/ScreenCanvas';

export default function Notifications() {
  const router = useRouter();
  const { nation } = useNationStore();
  const [warJoinRequests, setWarJoinRequests] = useState<any[]>([]);
  const [pactRequests, setPactRequests] = useState<any[]>([]);
  const [generalNotifications, setGeneralNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const nationId = nation?.id || nation?._id;
  const themeColor = leaningColor(nation);

  useEffect(() => {
    if (nationId) {
      loadNotifications();
    }
  }, [nationId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [warResponse, pactResponse, notifResponse] = await Promise.all([
        api.getWarJoinRequests(nationId!),
        api.getAllianceRequests(nationId!),
        api.getNotifications(nationId!, false, 50)
      ]);
      
      if (warResponse.success) {
        setWarJoinRequests(warResponse.requests || []);
      }
      if (pactResponse.success) {
        // Only show incoming pact requests
        setPactRequests(pactResponse.incoming || []);
      }
      if (notifResponse.success) {
        setGeneralNotifications(notifResponse.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await api.markNotificationRead(notificationId);
      // Update local state
      setGeneralNotifications(prev => 
        prev.map(n => n.id === notificationId ? {...n, is_read: true} : n)
      );
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleWarRespond = async (requestId: string, accept: boolean) => {
    setRespondingTo(requestId);
    try {
      const result = await api.respondToWarJoinRequest(requestId, nationId!, accept);
      if (result.success) {
        await glassAlert({ title: accept ? 'Joined War!' : 'Declined', message: result.message });
        loadNotifications();
      } else {
        await glassAlert({ title: 'Error', message: result.detail || 'Failed to respond' });
      }
    } catch (error: any) {
      await glassAlert({ title: 'Error', message: error.message || 'Failed to respond' });
    } finally {
      setRespondingTo(null);
    }
  };

  const handlePactRespond = async (requestId: string, accept: boolean, fromName: string) => {
    setRespondingTo(requestId);
    try {
      const result = await api.respondToAlliance(requestId, accept);
      if (result.success) {
        await glassAlert({ title: accept ? 'Pact Formed!' : 'Declined', message: accept ? `Non-Aggression Pact formed with ${fromName}!` : 'Request declined.' });
        loadNotifications();
      } else {
        await glassAlert({ title: 'Error', message: result.detail || 'Failed to respond' });
      }
    } catch (error: any) {
      await glassAlert({ title: 'Error', message: error.message || 'Failed to respond' });
    } finally {
      setRespondingTo(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Count unread general notifications
  const unreadNotifications = generalNotifications.filter(n => !n.is_read).length;
  const pendingRequests = warJoinRequests.length + pactRequests.length;
  const totalNotifications = pendingRequests + unreadNotifications;

  // Helper to get icon and color for notification type
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'pact_accepted':
        return { icon: 'shield-checkmark', color: '#27D17A', bg: '#27D17A20' };
      case 'pact_declined':
        return { icon: 'shield-outline', color: '#FF5A65', bg: '#FF5A6520' };
      case 'war_join_accepted':
        return { icon: 'flame', color: '#27D17A', bg: '#27D17A20' };
      case 'war_join_declined':
        return { icon: 'flame-outline', color: '#FF5A65', bg: '#FF5A6520' };
      default:
        return { icon: 'notifications', color: themeColor, bg: themeColor + '20' };
    }
  };

  return (
    <ScreenCanvas>
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <ScreenHeader
        title="Notifications"
        subtitle="Inbox"
        onBack={() => router.back()}
        right={totalNotifications > 0 ? (
          <View style={[styles.badge, { backgroundColor: themeColor }]}>
            <Text style={styles.badgeText}>{totalNotifications}</Text>
          </View>
        ) : undefined}
      />

      {loading ? (
        <View style={styles.loaderFill}>
          <StatusDots status="Loading" color={themeColor} pattern="carve" />
        </View>
      ) : (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >
        {totalNotifications === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="rgba(255,255,255,0.08)" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You{'\u2019'}re all caught up! Requests and notifications will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* War Join Requests */}
            {warJoinRequests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="flash" size={18} color="#F3F6FA" />
                  <Text style={styles.sectionTitle}>War Join Requests</Text>
                </View>
                {warJoinRequests.map((request) => (
                  <View key={request.id || request._id} style={styles.requestCard}>
                    <View style={styles.requestIcon}>
                      <Ionicons name="flame" size={24} color="#FF5A65" />
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestTitle}>Call to Arms!</Text>
                      <Text style={styles.requestMessage}>
                        <Text style={styles.highlightText}>{request.caller_nation_name}</Text> is calling you to join their war against{' '}
                        <Text style={styles.highlightText}>{request.enemy_nation_name}</Text>!
                      </Text>
                      <Text style={styles.requestTime}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </Text>
                      
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleWarRespond(request.id || request._id, false)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          <ButtonBusy busy={respondingTo === (request.id || request._id)} color="#FF5A65">
                            <Ionicons name="close" size={16} color="#FF5A65" />
                            <Text style={styles.rejectButtonText}>Decline</Text>
                          </ButtonBusy>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.acceptButton, { backgroundColor: themeColor }]}
                          onPress={() => handleWarRespond(request.id || request._id, true)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          <ButtonBusy busy={respondingTo === (request.id || request._id)} color="#081014">
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                            <Text style={styles.acceptButtonText}>Join War!</Text>
                          </ButtonBusy>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.warningText}>Declining will affect your reputation</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Non-Aggression Pact Requests */}
            {pactRequests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="people" size={18} color="#F3F6FA" />
                  <Text style={styles.sectionTitle}>Non-Aggression Pact Requests</Text>
                </View>
                {pactRequests.map((request) => (
                  <View key={request.id || request._id} style={styles.requestCard}>
                    <View style={[styles.requestIcon, { backgroundColor: '#27D17A20' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#27D17A" />
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestTitle}>Pact Request</Text>
                      <Text style={styles.requestMessage}>
                        <Text style={styles.highlightText}>{request.from_nation_name}</Text> wants to form a Non-Aggression Pact with you.
                      </Text>
                      {request.message && (
                        <Text style={styles.pactMessage}>{'\u201c'}{request.message}{'\u201d'}</Text>
                      )}
                      <Text style={styles.requestTime}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </Text>
                      
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handlePactRespond(request.id || request._id, false, request.from_nation_name)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          <ButtonBusy busy={respondingTo === (request.id || request._id)} color="#FF5A65">
                            <Ionicons name="close" size={16} color="#FF5A65" />
                            <Text style={styles.rejectButtonText}>Decline</Text>
                          </ButtonBusy>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.acceptButton, { backgroundColor: '#27D17A' }]}
                          onPress={() => handlePactRespond(request.id || request._id, true, request.from_nation_name)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          <ButtonBusy busy={respondingTo === (request.id || request._id)} color="#081014">
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                            <Text style={styles.acceptButtonText}>Accept Pact</Text>
                          </ButtonBusy>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.infoText}>You cannot declare war on pact partners</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* General Notifications (Responses) */}
            {generalNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="mail" size={18} color="#F3F6FA" />
                  <Text style={styles.sectionTitle}>Updates</Text>
                </View>
                {generalNotifications.map((notif) => {
                  const style = getNotificationStyle(notif.notification_type);
                  return (
                    <TouchableOpacity 
                      key={notif.id} 
                      style={[
                        styles.requestCard,
                        !notif.is_read && { borderLeftWidth: 3, borderLeftColor: style.color }
                      ]}
                      onPress={() => markNotificationRead(notif.id)}
                    >
                      <View style={[styles.requestIcon, { backgroundColor: style.bg }]}>
                        <Ionicons name={style.icon as any} size={24} color={style.color} />
                      </View>
                      <View style={styles.requestContent}>
                        <Text style={[
                          styles.requestTitle, 
                          !notif.is_read && { fontWeight: '800' }
                        ]}>
                          {notif.title}
                        </Text>
                        <Text style={styles.requestMessage}>
                          {notif.message}
                        </Text>
                        <Text style={styles.requestTime}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </Text>
                        {!notif.is_read && (
                          <View style={[styles.unreadDot, { backgroundColor: style.color }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
      )}
    </SafeAreaView>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderFill: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F6FA',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF5A6520',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestContent: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 20,
    marginBottom: 8,
  },
  highlightText: {
    color: '#F3F6FA',
    fontWeight: '600',
  },
  requestTime: {
    fontSize: 12,
    color: 'rgba(243,246,250,0.48)',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5A65',
    backgroundColor: '#0B0F14',
    overflow: 'hidden',
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
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  warningText: {
    fontSize: 11,
    color: '#F2C94C',
    fontStyle: 'italic',
  },
  pactMessage: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#27D17A',
  },
  infoText: {
    fontSize: 11,
    color: '#27D17A',
    fontStyle: 'italic',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
