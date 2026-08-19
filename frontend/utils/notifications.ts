import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  // Request permissions
  requestPermissions: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    return true;
  },

  // Schedule daily notification for new issues
  scheduleDailyReminder: async (hour: number = 9) => {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule daily notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your Nation Awaits, Leader 👑',
          body: 'New policy issues require your attention. Shape the future of your nation!',
          data: { type: 'daily_reminder' },
        },
        trigger: {
          hour,
          minute: 0,
          repeats: true,
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  },

  // Send immediate notification (for testing)
  sendImmediateNotification: async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Issues Available! 📋',
        body: 'Your nation faces new challenges. Make your decisions now!',
      },
      trigger: null, // Send immediately
    });
  },

  // Get notification permissions status
  getPermissionsStatus: async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },
};
