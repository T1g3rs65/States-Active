import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../../store/nationStore';
import { StyleSheet } from 'react-native';
import { leaningColor, hexAlpha } from '../../utils/politicalCompass';
import { colors, spacing } from '../../utils/theme';

export default function TabLayout() {
  const { nation } = useNationStore();
  const themeColor = leaningColor(nation);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: [
          styles.tabBar,
          { borderTopColor: themeColor, borderTopWidth: 2, backgroundColor: hexAlpha(themeColor, 0.12) },
        ],
        headerShown: false,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="nation"
        options={{
          title: 'Nation',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="overview" options={{ href: null }} />
      <Tabs.Screen name="advisors" options={{ href: null }} />
      <Tabs.Screen name="industry" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 62,
    paddingBottom: spacing.sm,
    paddingTop: 6,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
