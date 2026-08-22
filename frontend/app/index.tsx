import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';

const LOADING_NOTES = [
  'Checking saved nation...',
  'Connecting to the world...',
  'Waking the territories...',
  'Preparing your realm...',
];

export default function Index() {
  const router = useRouter();
  const { nation, setNation, loadNation } = useNationStore();
  const [checking, setChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [userId, setUserId] = useState('');
  const [loadingNoteIndex, setLoadingNoteIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const noteTimer = setInterval(() => {
      setLoadingNoteIndex(i => (i + 1) % LOADING_NOTES.length);
    }, 2200);

    Animated.timing(progress, {
      toValue: 0.9,
      duration: 8000,
      useNativeDriver: false,
    }).start();

    return () => clearInterval(noteTimer);
  }, []);

  useEffect(() => {
    checkForNation();
  }, []);

  const finishLoading = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setChecking(false));
  };

  const checkForNation = async () => {
    setChecking(true);
    try {
      await loadNation();
      const savedUserId = await AsyncStorage.getItem('user_id');

      if (savedUserId) {
        const response = await api.getNationByUser(savedUserId);
        if (response.success && response.nation) {
          setNation(response.nation);
          router.replace('/(tabs)/nation');
          return;
        }
      }
      finishLoading();
    } catch (error) {
      console.error('Error checking for nation:', error);
      finishLoading();
    }
  };

  const startQuiz = () => {
    router.push('/server-select');
  };

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }

    setChecking(true);
    try {
      const response = await api.getNationByUser(userId.trim());
      if (response.success && response.nation) {
        await AsyncStorage.setItem('user_id', userId.trim());
        setNation(response.nation);
        router.replace('/(tabs)/nation');
      } else {
        Alert.alert('Not Found', 'No nation found with this User ID');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.primary} style={styles.loaderBig} />
        <Text style={styles.loadingNote}>{LOADING_NOTES[loadingNoteIndex]}</Text>
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
    );
  }

  if (showLogin) {
    return (
      <LinearGradient colors={landingGradient} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to Your Nation</Text>

          <View style={styles.loginForm}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Enter your User ID"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setShowLogin(false)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={landingGradient} style={styles.container}>
      <View style={styles.content}>
        <WorldPreview />

        <Text style={styles.title}>A World Awaits</Text>
        <Text style={styles.subtitle}>Claim your nation. Shape its fate.</Text>

        <View style={styles.featuresContainer}>
          <FeatureItem icon="earth" text="Create a unique nation" />
          <FeatureItem icon="flame" text="Face daily dilemmas" />
          <FeatureItem icon="stats-chart" text="Track national power" />
          <FeatureItem icon="trophy" text="Rise in global rankings" />
        </View>

        <TouchableOpacity style={styles.button} onPress={startQuiz}>
          <Text style={styles.buttonText}>Begin Your Legacy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowLogin(true)}>
          <Text style={styles.secondaryButtonText}>Login to Existing Nation</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
      <Ionicons name={icon} size={22} color={colors.accent.primary} style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const landingGradient: readonly [string, string] = [colors.background, colors.background];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    width: '88%',
    maxWidth: 360,
    alignItems: 'center',
  },
  previewWrap: {
    width: 160,
    height: 100,
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOrb: {
    position: 'absolute',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glass.border,
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
    opacity: 0.9,
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
    backgroundColor: colors.accent.glow,
    opacity: 0.25,
    zIndex: 0,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.base,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radii.md,
  },
  featureIcon: {
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.headline,
    color: colors.background,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.accent.primary,
    fontWeight: '500',
  },
  loaderBig: {
    transform: [{ scale: 1.8 }],
  },
  loadingNote: {
    marginTop: spacing.xl,
    ...typography.headline,
    color: colors.text.secondary,
  },
  progressTrack: {
    width: 200,
    height: 4,
    marginTop: spacing.md,
    backgroundColor: colors.glass.base,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
  },
  loginForm: {
    width: '100%',
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
  },
  backButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  backButtonText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
