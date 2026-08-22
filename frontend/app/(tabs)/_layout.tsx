import { Tabs } from 'expo-router';
import CompassTabBar from '../../components/CompassTabBar';

export default function TabLayout() {
  return (
    <Tabs
      detachInactiveScreens
      tabBar={(props) => <CompassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: '#08090A', flex: 1 },
      }}
    >
      <Tabs.Screen name="nation" options={{ title: 'Nation' }} />
      <Tabs.Screen name="issues" options={{ title: 'Issues' }} />
      <Tabs.Screen name="overview" options={{ title: 'Stats' }} />
      <Tabs.Screen name="rankings" options={{ title: 'Ranks' }} />
      <Tabs.Screen name="advisors" options={{ title: 'Advisors' }} />
      <Tabs.Screen name="industry" options={{ title: 'Industry' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
