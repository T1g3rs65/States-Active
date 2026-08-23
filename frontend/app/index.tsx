import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';
import StatusDots from '../components/StatusDots';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert } from '../components/GlassModal';

const LOADING_NOTES = [
  'Checking saved nation...',
  'Connecting to the world...',
  'Waking the territories...',
  'Preparing your realm...',
];

export default function Index() {
  const router = useRouter();
  const { nation, setNation, loadNation, saveNation } = useNationStore();
  const [checking, setChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [userId, setUserId] = useState('');
  const [loadingNoteIndex, setLoadingNoteIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const booted = useRef(false);

  useEffect(() => {
    const noteTimer = setInterval(() => {
      setLoadingNoteIndex(i => (i + 1) % LOADING_NOTES.length);
    }, 2200);

    Animated.timing(progress, {
      toValue: 0.9,
      duration: 8000,
      useNativeDriver: false,
    }).start();

    // Hard stop: never leave the user spinning forever
    const hang = setTimeout(() => {
      if (!booted.current) {
        console.warn('Boot hang timeout — showing landing');
        finishLoading();
      }
    }, 12000);

    return () => {
      clearInterval(noteTimer);
      clearTimeout(hang);
    };
  }, []);

  useEffect(() => {
    checkForNation();
  }, []);

  const finishLoading = () => {
    booted.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setChecking(false));
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
      await loadNation();
      const savedUserId = await AsyncStorage.getItem('user_id');
      let cached = useNationStore.getState().nation;

      // GH-90: recover nation on hard refresh / deep link when store starts empty
      if ((!cached?.id && !cached?._id) && savedUserId) {
        try {
          const r = await api.getNationByUser(savedUserId);
          if (r.success && r.nation) {
            await enterNation(r.nation);
            return;
          }
        } catch (_) {}
      }
      if (!cached?.id && !cached?._id) {
        const recovered = await useNationStore.getState().recoverNation?.();
        if (recovered) cached = useNationStore.getState().nation;
      }

      if (savedUserId) {
        const response = await api.getNationByUser(savedUserId);
        if (response.success && response.nation) {
          await enterNation(response.nation);
          return;
        }
        // API miss but we have a local cache — still enter so we don't loop
        if (cached?.id || cached?._id) {
          await enterNation(cached);
          return;
        }
      } else if (cached?.id || cached?._id) {
        await enterNation(cached);
        return;
      }
      finishLoading();
    } catch (error) {
      console.error('Error checking for nation:', error);
      // Prefer cached nation over infinite loader
      const cached = useNationStore.getState().nation;
      if (cached?.id || cached?._id) {
        await enterNation(cached);
        return;
      }
      finishLoading();
    }
  };

  const startQuiz = () => {
    router.push('/server-select');
  };

  const handleLogin = async () => {
    if (!userId.trim()) {
      await glassAlert({ title: 'User ID needed', message: 'Enter your User ID to continue.' });
      return;
    }

    setChecking(true);
    try {
      const response = await api.getNationByUser(userId.trim());
      if (response.success && response.nation) {
        await AsyncStorage.setItem('user_id', userId.trim());
        await enterNation(response.nation);
      } else {
        await glassAlert({ title: 'Not found', message: 'No nation found with this User ID.' });
        setChecking(false);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      await glassAlert({ title: 'Login failed', message: 'Could not reach the server. Try again.' });
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <ScreenCanvas>
        <View style={styles.container}>
          <StatusDots status={LOADING_NOTES[loadingNoteIndex]} color={colors.accent.primary} />
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </ScreenCanvas>
    );
  }

  if (showLogin) {
    return (
      <ScreenCanvas>
        <View style={styles.container}>
          <LiquidGlass radius={28} style={styles.panel}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in with your User ID</Text>

            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Enter your User ID"
              placeholderTextColor="rgba(243,246,250,0.35)"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.88}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowLogin(false)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </LiquidGlass>
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
          <Text style={styles.subtitle}>Claim your nation. Shape its fate.</Text>

          <View style={styles.featuresContainer}>
            <FeatureItem icon="earth" text="Create a unique nation" />
            <FeatureItem icon="flame" text="Face daily dilemmas" />
            <FeatureItem icon="stats-chart" text="Track national power" />
            <FeatureItem icon="trophy" text="Rise in global rankings" />
          </View>

          <TouchableOpacity style={styles.button} onPress={startQuiz} activeOpacity={0.88}>
            <Text style={styles.buttonText}>Begin Your Legacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowLogin(true)}>
            <Text style={styles.secondaryButtonText}>Login to Existing Nation</Text>
          </TouchableOpacity>
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
  progressTrack: {
    width: '70%',
    maxWidth: 280,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 28,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(243,246,250,0.7)',
    borderRadius: 999,
  },
});
