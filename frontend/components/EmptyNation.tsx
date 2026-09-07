import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenCanvas from './ScreenCanvas';
import LiquidGlass from './LiquidGlass';
import StatusDots from './StatusDots';
import { useNationStore } from '../store/nationStore';
import { leaningColor } from '../utils/politicalCompass';
import { TabChrome } from './ScreenHeader';

type Props = {
  title?: string;
  subtitle?: string;
};

/**
 * Full-screen glass empty state when nation is missing after reload.
 * Primary: try recoverNation. Secondary: back to start / login.
 */
export default function EmptyNation({
  title = 'No nation loaded',
  subtitle = 'Your session dropped on refresh. Restore it, or return to the start screen.',
}: Props) {
  const router = useRouter();
  const { recoverNation, nation } = useNationStore();
  const tint = leaningColor(nation);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const onReload = async () => {
    setBusy(true);
    setNote(null);
    try {
      const ok = await recoverNation();
      if (ok) {
        setNote('Restored.');
        return;
      }
      setNote('Could not restore. Sign in again from the start screen.');
    } catch {
      setNote('Restore failed. Try the start screen.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    onReload();
    // Auto-hydrate on every mount (hard refresh on a tab). Reload button still works.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenCanvas>
      <View style={styles.root}>
        <TabChrome title="Nation" subtitle="Session" />
        <View style={styles.center}>
          <LiquidGlass radius={28} style={styles.card}>
            <View style={[styles.iconRing, { borderColor: tint + '66' }]}>
              <Ionicons name="flag-outline" size={28} color={tint} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{subtitle}</Text>
            {note ? <Text style={[styles.note, { color: tint }]}>{note}</Text> : null}

            <TouchableOpacity
              style={[styles.primary, { backgroundColor: tint }]}
              onPress={onReload}
              disabled={busy}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', opacity: busy ? 0 : 1 }}>
                <Ionicons name="refresh" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>Reload nation</Text>
              </View>
              {busy ? <StatusDots status="Loading" color="#081014" fill /> : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondary}
              onPress={() => router.replace('/')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryText}>Back to start</Text>
            </TouchableOpacity>
          </LiquidGlass>
        </View>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  card: {
    padding: 28,
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F3F6FA',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(243,246,250,0.68)',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  note: {
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    marginBottom: 12,
    overflow: 'hidden',
  },
  primaryText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: 'rgba(243,246,250,0.72)',
    fontSize: 14,
    fontWeight: '500',
  },
});
