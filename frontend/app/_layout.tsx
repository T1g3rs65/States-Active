import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AuroraBackground from '../components/AuroraBackground';
import Grain from '../components/Grain';

export const APP_BUILD = '21p';

export default function RootLayout() {
  useEffect(() => {
    if (typeof fetch === 'undefined') return;
    fetch(`/build.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j?.id && j.id !== APP_BUILD && typeof location !== 'undefined') {
          location.reload();
        }
      })
      .catch(() => {});
  }, []);
  return (
    <View style={styles.root}>
      <AuroraBackground />
      <View style={styles.fg}>
        <Slot />
      </View>
      <Grain />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090A' },
  fg: { flex: 1, zIndex: 1, backgroundColor: 'transparent' },
});
