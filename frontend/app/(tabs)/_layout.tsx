import { Tabs } from 'expo-router';
import CompassTabBar from '../../components/CompassTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CompassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="nation" options={{ title: 'Nation' }} />
      <Tabs.Screen name="issues" options={{ title: 'Issues' }} />
      <Tabs.Screen name="overview" options={{ title: 'Statistics' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="rankings" options={{ href: null }} />
      <Tabs.Screen name="advisors" options={{ href: null }} />
      <Tabs.Screen name="industry" options={{ href: null }} />
    </Tabs>
  );
}
