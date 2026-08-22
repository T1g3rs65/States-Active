import { Slot } from 'expo-router';
import { useEffect } from 'react';

export const APP_BUILD = '21e';

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
  return <Slot />;
}
