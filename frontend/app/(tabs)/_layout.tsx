import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../../store/nationStore';
import { View, StyleSheet } from 'react-native';
import { getRaceTheme } from '../../utils/raceColors';
import { colors, spacing, typography } from '../../utils/theme';

export default function TabLayout() {
  const { nation } = useNationStore();
  const raceTheme = getRaceTheme(nation?.race);
  const themeColor = raceTheme.color;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: styles.tabBar,
        headerShown: false,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="nation"
        options={{
          title: 'Nation',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="advisors"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="industry"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.glass.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
