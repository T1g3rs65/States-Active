import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { getRaceTheme } from '../utils/raceColors';

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
  const themeColor = getRaceTheme(nation?.race || 'human').primary;

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
        Alert.alert(accept ? 'Joined War!' : 'Declined', result.message);
        loadNotifications();
      } else {
        Alert.alert('Error', result.detail || 'Failed to respond');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond');
    } finally {
      setRespondingTo(null);
    }
  };

  const handlePactRespond = async (requestId: string, accept: boolean, fromName: string) => {
    setRespondingTo(requestId);
    try {
      const result = await api.respondToAlliance(requestId, accept);
      if (result.success) {
        Alert.alert(
          accept ? 'Pact Formed!' : 'Declined',
          accept ? `Non-Aggression Pact formed with ${fromName}!` : 'Request declined.'
        );
        loadNotifications();
      } else {
        Alert.alert('Error', result.detail || 'Failed to respond');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond');
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
        return { icon: 'shield-checkmark', color: '#22C55E', bg: '#22C55E20' };
      case 'pact_declined':
        return { icon: 'shield-outline', color: '#EF4444', bg: '#EF444420' };
      case 'war_join_accepted':
        return { icon: 'flame', color: '#22C55E', bg: '#22C55E20' };
      case 'war_join_declined':
        return { icon: 'flame-outline', color: '#EF4444', bg: '#EF444420' };
      default:
        return { icon: 'notifications', color: themeColor, bg: themeColor + '20' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          {totalNotifications > 0 && (
            <View style={[styles.badge, { backgroundColor: themeColor }]}>
              <Text style={styles.badgeText}>{totalNotifications}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F8FAFC" />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : totalNotifications === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#475569" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Requests and notifications will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* War Join Requests */}
            {warJoinRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚔️ War Join Requests</Text>
                {warJoinRequests.map((request) => (
                  <View key={request.id || request._id} style={styles.requestCard}>
                    <View style={styles.requestIcon}>
                      <Ionicons name="flame" size={24} color="#EF4444" />
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
                          {respondingTo === (request.id || request._id) ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <>
                              <Ionicons name="close" size={16} color="#EF4444" />
                              <Text style={styles.rejectButtonText}>Decline</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.acceptButton, { backgroundColor: themeColor }]}
                          onPress={() => handleWarRespond(request.id || request._id, true)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          {respondingTo === (request.id || request._id) ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color="#fff" />
                              <Text style={styles.acceptButtonText}>Join War!</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.warningText}>
                        ⚠️ Declining will affect your reputation
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Non-Aggression Pact Requests */}
            {pactRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤝 Non-Aggression Pact Requests</Text>
                {pactRequests.map((request) => (
                  <View key={request.id || request._id} style={styles.requestCard}>
                    <View style={[styles.requestIcon, { backgroundColor: '#22C55E20' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestTitle}>Pact Request</Text>
                      <Text style={styles.requestMessage}>
                        <Text style={styles.highlightText}>{request.from_nation_name}</Text> wants to form a Non-Aggression Pact with you.
                      </Text>
                      {request.message && (
                        <Text style={styles.pactMessage}>"{request.message}"</Text>
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
                          {respondingTo === (request.id || request._id) ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <>
                              <Ionicons name="close" size={16} color="#EF4444" />
                              <Text style={styles.rejectButtonText}>Decline</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.acceptButton, { backgroundColor: '#22C55E' }]}
                          onPress={() => handlePactRespond(request.id || request._id, true, request.from_nation_name)}
                          disabled={respondingTo === (request.id || request._id)}
                        >
                          {respondingTo === (request.id || request._id) ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color="#fff" />
                              <Text style={styles.acceptButtonText}>Accept Pact</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.infoText}>
                        ℹ️ You cannot declare war on pact partners
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* General Notifications (Responses) */}
            {generalNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📬 Updates</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
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
    color: '#fff',
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
    color: '#F8FAFC',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  requestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF444420',
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
    color: '#F8FAFC',
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 8,
  },
  highlightText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  requestTime: {
    fontSize: 12,
    color: '#64748B',
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
    borderColor: '#EF4444',
    backgroundColor: '#0F172A',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  pactMessage: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#22C55E',
  },
  infoText: {
    fontSize: 11,
    color: '#22C55E',
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
