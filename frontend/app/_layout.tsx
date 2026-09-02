import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Grain from '../components/Grain';
import { GlassModalHost } from '../components/GlassModal';
import { useAccountStore } from '../store/accountStore';

export const APP_BUILD = '310';

export default function RootLayout() {
  useEffect(() => {
    useAccountStore.getState().loadSession();
    if (typeof fetch === 'undefined') return;
    // True one-shot: any prior attempt in this tab must never reload again.
    // Storing the SERVER id used to loop when it never equaled APP_BUILD.
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem('sh_build_reload')) return;
      }
    } catch (_) {}

    fetch(`/build.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j?.id && j.id !== APP_BUILD && typeof location !== 'undefined') {
          try {
            sessionStorage.setItem('sh_build_reload', '1');
          } catch (_) {}
          location.reload();
        }
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <Slot />
      <Grain />
      <GlassModalHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
});
