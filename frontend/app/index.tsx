import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNationStore } from '../store/nationStore';
import { useAccountStore } from '../store/accountStore';
import { api } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';
import StatusDots from '../components/StatusDots';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert } from '../components/GlassModal';

export default function Index() {
  const router = useRouter();
  const { nation, setNation, loadNation, saveNation } = useNationStore();
  const { loadSession, token, user } = useAccountStore();
  const [checking, setChecking] = useState(true);
  const booted = useRef(false);

  useEffect(() => {
    const hang = setTimeout(() => {
      if (!booted.current) {
        console.warn('Boot hang timeout — showing landing');
        finishLoading();
      }
    }, 12000);
    return () => clearTimeout(hang);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Sovereign Hex';
    }
  }, []);

  useEffect(() => {
    checkForNation();
  }, []);

  const finishLoading = () => {
    booted.current = true;
    setChecking(false);
  };

  const enterNation = async (n: any) => {
    booted.current = true;
    try {
      await saveNation(n);
    } catch {
      setNation(n);
    }
    // Migrated / founding without capital → place first
    if (n?.needs_capital) {
      router.replace('/world-map?place=migrate');
      return;
    }
    router.replace('/(tabs)/nation');
  };

  const checkForNation = async () => {
    if (booted.current) return;
    setChecking(true);
    try {
      await loadSession();
      const session = useAccountStore.getState();

      // Account required. Stale local nation cache from the wipe must not skip signup.
      if (!session.token || !session.user?.id) {
        await useNationStore.getState().clearNation();
        try {
          await AsyncStorage.multiRemove(['nation', 'pending_nation']);
        } catch (_) {}
        finishLoading();
        return;
      }

      // First try a fast live lookup by user id so refresh / deep links always hydrate.
      const savedUserId = session.user.id;
      try {
        const live = await api.getNationByUser(savedUserId);
        if (live?.success && live.nation) {
          await enterNation(live.nation);
          return;
        }
      } catch (_) {}

      // No live nation found; clear stale cache and land on the start screen.
      await useNationStore.getState().clearNation();
      try {
        await AsyncStorage.multiRemove(['nation', 'pending_nation']);
      } catch (_) {}
      finishLoading();
    } catch (error) {
      console.error('Error checking for nation:', error);
      finishLoading();
    }
  };

  const signedIn = !!(token && user?.id);

  const startQuiz = () => {
    if (!signedIn) {
      router.push('/signin');
      return;
    }
    router.push('/server-select');
  };

  if (checking) {
    return (
      <ScreenCanvas>
        <View style={styles.container}>
          <StatusDots status="Boot" color={colors.accent.primary} pattern="carve" cover="viewport" />
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <LiquidGlass radius={32} style={styles.panel}>
          <WorldPreview />

          <Text
            // @ts-expect-error web
            className="asme-title"
            style={styles.title}
          >
            A World Awaits
          </Text>
          <Text style={styles.subtitle}>
            {signedIn
              ? 'Account ready. Found your nation when you are.'
              : 'Sign in or create an account to begin your legacy.'}
          </Text>

          <View style={styles.featuresContainer}>
            <FeatureItem icon="earth" text="Create a unique nation" />
            <FeatureItem icon="flame" text="Face daily dilemmas" />
            <FeatureItem icon="stats-chart" text="Track national power" />
            <FeatureItem icon="trophy" text="Rise in global rankings" />
          </View>

          {signedIn ? (
            <TouchableOpacity style={styles.button} onPress={startQuiz} activeOpacity={0.88}>
              <Text style={styles.buttonText}>Begin Your Legacy</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={() => router.push('/signin')} activeOpacity={0.88}>
              <Text style={styles.buttonText}>Sign in / Create account</Text>
            </TouchableOpacity>
          )}
        </LiquidGlass>
      </View>
    </ScreenCanvas>
  );
}

function WorldPreview() {
  return (
    <View style={styles.previewWrap}>
      <View style={[styles.previewOrb, styles.previewOrbLeft, { backgroundColor: colors.zythera.primary }]} />
      <View style={[styles.previewOrb, styles.previewOrbCenter, { backgroundColor: colors.accent.primary }]}>
        <Ionicons name="flag" size={28} color={colors.background} />
      </View>
      <View style={[styles.previewOrb, styles.previewOrbRight, { backgroundColor: colors.human.primary }]} />
      <View style={styles.previewGlow} />
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={18} color="rgba(243,246,250,0.85)" style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  previewWrap: {
    width: 160,
    height: 100,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOrb: {
    position: 'absolute',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewOrbLeft: {
    width: 56,
    height: 56,
    left: 0,
    top: 22,
    opacity: 0.5,
  },
  previewOrbCenter: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    opacity: 0.95,
  },
  previewOrbRight: {
    width: 56,
    height: 56,
    right: 0,
    top: 22,
    opacity: 0.5,
  },
  previewGlow: {
    position: 'absolute',
    width: 140,
    height: 30,
    bottom: -8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    opacity: 0.35,
    zIndex: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: '#F3F6FA',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(243,246,250,0.65)',
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    gap: 10,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    color: 'rgba(243,246,250,0.88)',
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    alignSelf: 'flex-start',
    color: 'rgba(243,246,250,0.7)',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#F3F6FA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  button: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#F3F6FA',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: 'rgba(243,246,250,0.72)',
    fontSize: 14,
    fontWeight: '500',
  },
});
