// States tokens — dark product chrome.
// Teal + gold stay the identity. Surfaces are luminance steps, not heavy glass.

import { Platform } from 'react-native';

export const colors = {
  background: '#08090A',
  canvas: 'transparent',
  surface: 'rgba(255,255,255,0.03)',
  surfaceSolid: '#111317',
  surfaceRaised: '#16181D',
  glass: {
    base: 'rgba(255,255,255,0.035)',
    hover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    shine: 'rgba(255,255,255,0.10)',
  },
  text: {
    primary: '#F4F5F6',
    secondary: '#B4B8C0',
    muted: '#7C818A',
  },
  accent: {
    primary: '#2EE6C5',
    gold: '#E8C36A',
    glow: 'rgba(46,230,197,0.22)',
  },
  human: {
    primary: '#C69C6D',
    accent: '#8B5E3C',
    glow: 'rgba(198,156,109,0.35)',
    light: '#C69C6D',
  },
  zythera: {
    primary: '#2EE6C5',
    accent: '#1AAFA0',
    glow: 'rgba(46,230,197,0.40)',
    light: '#7FFFD4',
  },
  satire: '#E8C36A',
  success: '#3DCC84',
  danger: '#F2616A',
  warning: '#E8C36A',
  border: 'rgba(255,255,255,0.08)',
};

export const typography = {
  display: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.3 },
  headline: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.15 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  value: { fontSize: 24, fontWeight: '600' as const, fontVariant: ['tabular-nums'] as any, letterSpacing: -0.4 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export type Species = 'human' | 'zythera';

export function getSpeciesColors(species: Species) {
  return species === 'zythera' ? colors.zythera : colors.human;
}

export function glassStyle(overrides?: Record<string, any>) {
  return {
    backgroundColor: colors.glass.base,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radii.md,
    ...overrides,
  };
}

export function dropShadow(level: 'sm' | 'md' | 'lg' | 'glow' = 'md', tint: string = '#000000') {
  const opacity = level === 'sm' ? 0.16 : level === 'md' ? 0.28 : level === 'glow' ? 0.35 : 0.45;
  const radius = level === 'sm' ? 6 : level === 'md' ? 16 : level === 'glow' ? 24 : 32;
  const offset = level === 'sm' ? 2 : level === 'md' ? 6 : level === 'glow' ? 8 : 12;
  let hex = (tint || '#000000').replace('#', '');
  if (hex.startsWith('rgb')) hex = '000000';
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) hex = '000000';
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${offset}px ${radius}px #${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
  return {
    elevation: level === 'sm' ? 4 : level === 'md' ? 8 : level === 'glow' ? 12 : 16,
  };
}
