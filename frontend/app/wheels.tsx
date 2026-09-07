import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccountStore } from '../store/accountStore';
import { api } from '../utils/api';
import { WheelConfig, WheelOption, WheelResult, WheelId } from '../types';
import { glassAlert } from '../components/GlassModal';
import ScreenCanvas from '../components/ScreenCanvas';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import GovernmentWheel from '../components/GovernmentWheel';
import StatusDots from '../components/StatusDots';

const HUMAN_WHEEL_2: WheelOption[] = [
  { label: 'Representative Democracy', weight: 35 },
  { label: 'Parliamentary Democracy', weight: 25 },
  { label: 'Presidential Democracy', weight: 20 },
  { label: 'Democratic Republic', weight: 15 },
  { label: 'Direct Democracy', weight: 5 },
];

function resolveWheel2Options(config: WheelConfig | undefined, form: string | undefined): WheelOption[] {
  if (!config) return HUMAN_WHEEL_2;
  const opts = config.options;
  if (Array.isArray(opts)) return opts;
  if (form && opts[form]) return opts[form];
  return HUMAN_WHEEL_2;
}

const WHEEL_ORDER: WheelId[] = ['form', 'subtype', 'territorial', 'style'];
const WHEEL_NAMES: Record<WheelId, string> = {
  form: 'Government Form',
  subtype: 'Government Subtype',
  territorial: 'Territorial Structure',
  style: 'Style Modifier',
};

export default function WheelsScreen() {
  const router = useRouter();
  const { loadSession } = useAccountStore();

  const [config, setConfig] = useState<Record<WheelId, WheelConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Partial<WheelResult> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); // which wheel is active (0..3)
  const [currentDone, setCurrentDone] = useState(false); // active wheel finished settling
  const [armed, setArmed] = useState(false); // hub tap started this wheel's spin
  const [revealing, setRevealing] = useState(false); // API spin in flight
  const [saving, setSaving] = useState(false);
  const activeId = WHEEL_ORDER[currentIndex];

  useEffect(() => {
    (async () => {
      await loadSession();
      const session = useAccountStore.getState();
      if (!session.token || !session.user?.id) {
        router.replace('/signin');
        return;
      }
      try {
        const res = await api.getWheelsConfig();
        if (res?.wheels && Array.isArray(res.wheels)) {
          const map = {} as Record<WheelId, WheelConfig>;
          for (const w of res.wheels) map[w.id] = w;
          setConfig(map);
        } else {
          await glassAlert({ title: 'Error', message: 'Failed to load the wheels of governance.' });
          router.replace('/');
          return;
        }
        try {
          const prog = await api.getWheelsProgress();
          const saved = (prog?.result || {}) as Partial<WheelResult>;
          const nxt = prog?.next as WheelId | 'done' | undefined;
          if (saved.government_form || saved.government_subtype || saved.territorial_structure || saved.style_modifier) {
            setResult(saved);
          }
          if (nxt === 'done') {
            try {
              await AsyncStorage.setItem('pending_wheel_result', JSON.stringify(saved));
            } catch (_) {}
            setCurrentIndex(WHEEL_ORDER.length - 1);
            setArmed(true);
            setCurrentDone(true);
          } else if (nxt && WHEEL_ORDER.includes(nxt)) {
            setCurrentIndex(WHEEL_ORDER.indexOf(nxt));
            setArmed(false);
            setCurrentDone(false);
          }
        } catch (pe) {
          console.warn('Wheel progress unavailable', pe);
        }
      } catch (e) {
        console.error('Error loading wheels config:', e);
        await glassAlert({ title: 'Error', message: 'Could not reach the world. Please try again.' });
        router.replace('/');
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const govResultValue = (id: WheelId): string | undefined => {
    if (!result) return undefined;
    switch (id) {
      case 'form': return result.government_form || undefined;
      case 'subtype': return result.government_subtype || undefined;
      case 'territorial': return result.territorial_structure || undefined;
      case 'style': return result.style_modifier || undefined;
    }
  };

  const spinCurrent = async () => {
    if (revealing) return;
    if (govResultValue(activeId)) return;
    setRevealing(true);
    try {
      const res = await api.spinWheels({ wheelId: activeId });
      const r = res?.result || res;
      if (!r) throw new Error('Spin returned no result');
      setResult(r);
      setArmed(true);
      setCurrentDone(false);
    } catch (e: any) {
      console.error('Error spinning wheels:', e);
      await glassAlert({ title: 'Spin failed', message: e?.message || 'Could not spin. Try again.' });
    } finally {
      setRevealing(false);
    }
  };

  const goNext = () => {
    if (currentIndex >= WHEEL_ORDER.length - 1) return;
    setCurrentIndex((i) => i + 1);
    setCurrentDone(false);
    setArmed(false);
  };

  const onWheelComplete = () => {
    setCurrentDone(true);
    if (currentIndex >= WHEEL_ORDER.length - 1) {
      try {
        AccessibilityInfo.announceForAccessibility(
          result
            ? `Your government: ${result.government_subtype}, ${result.territorial_structure}, ${result.style_modifier}`
            : 'Wheels settled.'
        );
      } catch (_) {}
    }
  };

  const confirmResult = async () => {
    if (!result?.government_form || !result.government_subtype || !result.territorial_structure || !result.style_modifier) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem('pending_wheel_result', JSON.stringify(result));
      router.push('/quiz');
    } catch (e) {
      console.error('Error saving wheel result:', e);
      await glassAlert({ title: 'Error', message: 'Could not save your government. Try again.' });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenCanvas>
        <View style={styles.center}>
          <StatusDots status="Loading" color="#2EE6C5" />
          <Text style={styles.centerText}>Shuffling the wheels of governance...</Text>
        </View>
      </ScreenCanvas>
    );
  }

  const subtypeOptions = result?.government_form
    ? resolveWheel2Options(config?.subtype, result.government_form)
    : undefined;

  const allDone = !!(
    result?.government_form &&
    result.government_subtype &&
    result.territorial_structure &&
    result.style_modifier &&
    currentIndex >= WHEEL_ORDER.length - 1 &&
    currentDone
  );

  const govResultDisplay = result
    ? [
        result.government_subtype,
        result.territorial_structure,
        result.style_modifier !== 'None (clean result)' ? result.style_modifier : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <ScreenHeader
          title="Wheels of Governance"
          subtitle="Roll your nation's form"
          onBack={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.body}>
          <LiquidGlass radius={20} style={styles.intro}>
            <Text style={styles.introText}>
              Four wheels decide the shape of your nation — one at a time. Tap the center of each
              wheel to spin it. No take-backs: the result becomes your government's identity
              before you answer how it's run.
            </Text>
          </LiquidGlass>

          <View style={styles.stage}>
            {WHEEL_ORDER.map((id, i) => {
              const cfg = config?.[id];
              const isSubtype = id === 'subtype';
              const resolvedOpts =
                isSubtype && subtypeOptions
                  ? subtypeOptions
                  : Array.isArray(cfg?.options)
                    ? (cfg!.options as WheelOption[])
                    : [];
              const isActive = i === currentIndex;
              const isFuture = i > currentIndex;
              if (!isActive && !result) {
                return (
                  <View key={id} style={[styles.stepChip, isFuture && styles.stepChipFuture]}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepLabel}>{cfg?.label || WHEEL_NAMES[id]}</Text>
                  </View>
                );
              }
              if (!isActive) {
                return (
                  <View key={id} style={styles.stepChip}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepLabel} numberOfLines={1}>
                      {isFuture ? cfg?.label || WHEEL_NAMES[id] : govResultValue(id)}
                    </Text>
                  </View>
                );
              }
              return (
                <View key={id} style={styles.activeStage}>
                  <Text style={styles.activeKicker}>WHEEL {i + 1} OF 4</Text>
                  <GovernmentWheel
                    wheelId={id}
                    label={cfg?.label || ''}
                    options={isSubtype && !result?.government_form ? [] : resolvedOpts}
                    result={govResultValue(id) && armed ? govResultValue(id) : undefined}
                    onComplete={onWheelComplete}
                    disabled={isFuture}
                    size={280}
                    showLegend
                    hubBusy={revealing}
                    onHubPress={
                      !govResultValue(id)
                        ? spinCurrent
                        : currentDone && currentIndex < WHEEL_ORDER.length - 1
                          ? goNext
                          : undefined
                    }
                  />
                </View>
              );
            })}
          </View>

          {allDone && (
            <LiquidGlass radius={20} style={styles.resultCard}>
              <Text style={styles.resultLabel}>YOUR GOVERNMENT</Text>
              <Text style={styles.resultText}>{govResultDisplay}</Text>
            </LiquidGlass>
          )}

          <View style={styles.footer}>
            {allDone ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm your government and continue to the quiz"
                style={[styles.primary, saving && styles.primaryDisabled]}
                onPress={confirmResult}
                disabled={saving}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryText}>{saving ? 'Confirming...' : 'Lock It In — Take the Quiz'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.hint}>
                {!result
                  ? 'Tap the center of the wheel to spin.'
                  : currentDone
                    ? 'Tap the center to spin the next wheel.'
                    : 'Watch it settle…'}
              </Text>
            )}
            <Text style={styles.footnote}>
              One spin per nation. Your government is decided here — the quiz shapes how it governs.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: 16, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centerText: { color: 'rgba(243,246,250,0.75)', fontSize: 15 },
  intro: { padding: 16, marginBottom: 20 },
  introText: { color: 'rgba(243,246,250,0.78)', fontSize: 14, lineHeight: 21 },
  stage: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  activeStage: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  activeKicker: {
    color: 'rgba(232,195,106,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 320,
  },
  stepChipFuture: {
    opacity: 0.45,
  },
  stepNum: {
    color: '#E8C36A',
    fontSize: 12,
    fontWeight: '700',
    width: 16,
  },
  stepLabel: {
    color: '#F4F5F6',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  resultCard: { padding: 18, alignItems: 'center', marginBottom: 16 },
  resultLabel: {
    color: 'rgba(243,246,250,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  resultText: { color: '#F4F5F6', fontSize: 18, fontWeight: '600', textAlign: 'center', lineHeight: 26 },
  footer: { marginTop: 8, gap: 12 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2EE6C5',
    paddingVertical: 16,
    borderRadius: 999,
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#000', fontSize: 16, fontWeight: '700' },
  hint: {
    color: 'rgba(243,246,250,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  footnote: {
    color: 'rgba(243,246,250,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
