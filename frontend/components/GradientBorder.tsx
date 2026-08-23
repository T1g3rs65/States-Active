import { useEffect } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useNationStore } from '../store/nationStore';
import { leaningColor, mixIntoDark } from '../utils/politicalCompass';
import { ASME_CSS } from '../utils/asmeStyle';

let injected = false;
function ensureCss() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  let el = document.getElementById('asme-liquid') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'asme-liquid';
    document.head.appendChild(el);
  }
  if (!injected || el.textContent !== ASME_CSS) {
    el.textContent = ASME_CSS;
    injected = true;
  }
}

function shade(hex: string, t: number) {
  return mixIntoDark(hex, t, '#000000');
}
function lift(hex: string, t: number) {
  return mixIntoDark(hex, t, '#ffffff');
}

export default function GradientBorder({
  children,
  style,
  radius = 24,
  speed = 5,
  tone = 'compass',
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  speed?: number;
  tone?: 'compass' | 'war';
}) {
  const focused = true;
  const tint = leaningColor(useNationStore((s) => s.nation));
  const primary = tone === 'war' ? '#7f1d1d' : shade(tint, 0.55);
  const secondary = tone === 'war' ? '#dc2626' : tint;
  const accent = tone === 'war' ? '#f87171' : lift(tint, 0.45);
  const fast = tone === 'war' || speed <= 1;

  useEffect(() => {
    ensureCss();
  }, []);

  const cssVars =
    Platform.OS === 'web'
      ? ({
          ['--gradient-primary' as any]: primary,
          ['--gradient-secondary' as any]: secondary,
          ['--gradient-accent' as any]: accent,
          ['--bg-color' as any]: 'rgba(0,0,0,0.52)',
          ['--border-width' as any]: '2px',
          ['--border-radius' as any]: `${radius}px`,
          ['--animation-duration' as any]: `${speed}s`,
          animationPlayState: focused ? 'running' : 'paused',
        } as ViewStyle)
      : {};

  return (
    <View
      // @ts-expect-error web className
      className={`gradient-border${fast ? ' gradient-border-fast' : ''}`}
      style={[
        styles.base,
        { borderRadius: radius },
        Platform.OS !== 'web'
          ? { borderWidth: 2, borderColor: tone === 'war' ? '#dc2626' : tint, backgroundColor: 'rgba(0,0,0,0.45)' }
          : cssVars,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
