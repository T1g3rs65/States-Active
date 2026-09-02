import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import VoronoiLoader from './VoronoiLoader';

const IMPORTING = [
  [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
  [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
  [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
  [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
  [16, 30, 24, 18, 32],
  [17, 23, 31, 25],
  [24],
  [17, 23, 31, 25],
  [16, 30, 24, 18, 32],
  [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
  [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
  [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
  [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
];

const SYNCING = [
  [45, 38, 31, 24, 17, 23, 25],
  [38, 31, 24, 17, 10, 16, 18],
  [31, 24, 17, 10, 3, 9, 11],
  [24, 17, 10, 3, 2, 4],
  [17, 10, 3],
  [10, 3],
  [45, 38, 31, 24, 17],
  [45, 38, 31, 24],
  [45, 38, 44, 46],
  [45, 38, 31, 37, 39],
  [45, 38, 31, 24, 30, 32],
  [38, 31, 24, 17, 23, 25],
];

const SEARCHING = [
  [9, 16, 17, 15, 23],
  [10, 17, 18, 16, 24],
  [11, 18, 19, 17, 25],
  [18, 25, 26, 24, 32],
  [25, 32, 33, 31, 39],
  [32, 39, 40, 38, 46],
  [31, 38, 39, 37, 45],
  [30, 37, 38, 36, 44],
  [23, 30, 31, 29, 37],
  [31, 29, 37, 22, 24, 23, 38, 36],
  [16, 23, 24, 22, 30],
];

const HEART = [
  [],
  [3],
  [10, 2, 4, 3],
  [17, 9, 1, 11, 5, 10, 4, 3, 2],
  [24, 16, 8, 1, 3, 5, 18, 12, 17, 11, 4, 10, 9, 2],
  [31, 23, 15, 8, 10, 2, 4, 12, 25, 19, 24, 18, 11, 17, 16, 9],
  [38, 30, 22, 15, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16],
  [38, 30, 22, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16, 45, 37, 29, 21, 14, 8, 15, 12, 20, 27, 33, 39],
  [17, 30, 16, 23, 24, 31, 32, 25, 18],
  [24],
];

export function shortLoadLabel(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (s.includes('fail') || s.includes('error')) return 'Failed';
  if (s.includes('no world') || s.includes('no seed')) return 'No world';
  if (s.includes('founding') || s.includes('create')) return 'Founding';
  if (s.includes('fix') || s.includes('repair')) return 'Repair';
  if (s.includes('reload')) return 'Reload';
  if (s.includes('border')) return 'Borders';
  if (s.includes('sync')) return 'Sync';
  if (s.includes('carv') || s.includes('generat') || s.includes('terrain') || s.includes('voronoi')) return 'Carve';
  if (s.includes('cache')) return 'Cache';
  if (s.includes('world') || s.includes('seed') || s.includes('nation')) return 'World';
  if (s.includes('sign') || s.includes('user') || s.includes('saved') || s.includes('init') || s.includes('boot') || s.includes('check') || s.includes('waking') || s.includes('prepar')) return 'Boot';
  const first = (raw || 'Loading').trim().split(/\s+/)[0] || 'Loading';
  return first.replace(/[^a-zA-Z]/g, '') || 'Loading';
}

function framesFor(label: string): number[][] {
  const s = label.toLowerCase();
  if (s === 'carve' || s === 'founding' || s === 'boot' || s === 'loading') return IMPORTING;
  if (s === 'sync' || s === 'cache' || s === 'borders') return SYNCING;
  if (s === 'failed' || s === 'repair') return HEART;
  return SEARCHING;
}

export default function StatusDots({
  status,
  color,
  compact = false,
  pattern,
  cover = 'parent',
  fill = false,
}: {
  status: string;
  color: string;
  compact?: boolean;
  pattern?: 'carve' | 'sync' | 'search' | 'heart';
  cover?: 'parent' | 'viewport';
  fill?: boolean;
}) {
  const title = shortLoadLabel(status);
  const frames =
    pattern === 'carve' ? IMPORTING :
    pattern === 'sync' ? SYNCING :
    pattern === 'heart' ? HEART :
    pattern === 'search' ? SEARCHING :
    framesFor(title);
  const duration = pattern === 'carve' || title === 'Carve' || title === 'Boot' ? 90 : 130;
  const pinViewport = cover === 'viewport';
  if (fill) {
    return (
      <View pointerEvents="none" style={styles.fill}>
        <VoronoiLoader frames={frames} color={color} duration={duration} cellPx={10} />
      </View>
    );
  }
  if (compact) {
    return (
      <View style={styles.compact}>
        <VoronoiLoader frames={frames} color={color} duration={duration} cellPx={10} compact />
      </View>
    );
  }
  return (
    <View style={(pinViewport ? viewportStage : parentStage) as any}>
      <VoronoiLoader
        frames={frames}
        color={color}
        duration={duration}
        cellPx={18}
        pinViewport={pinViewport}
      />
      <Text style={[styles.title, { color }]}>{title}</Text>
    </View>
  );
}

/** Overlay a carve loader that fills the parent button. Parent should set overflow: 'hidden'. */
export function ButtonBusy({
  busy,
  color = '#081014',
  children,
}: {
  busy: boolean;
  color?: string;
  children: ReactNode;
}) {
  return (
    <>
      <View style={{ opacity: busy ? 0 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {children}
      </View>
      {busy ? <StatusDots status="Loading" color={color} fill /> : null}
    </>
  );
}

const viewportStage = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  zIndex: 40,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const parentStage = {
  ...StyleSheet.absoluteFill,
  zIndex: 5,
  overflow: 'hidden' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  compact: {
    width: 44,
    height: 44,
    overflow: 'hidden',
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
