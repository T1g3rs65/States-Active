// States Design Tokens — Direction B (Sovereign dark glassmorphism)
// Near-black bg, glass cards, dynamic national-palette accent fallback teal+gold.

import { Platform } from 'react-native';

export const colors = {
  // Canvas
  background: '#0B0F14',
  surface: 'rgba(17,23,31,0.72)',
  surfaceSolid: '#11171F',
  glass: {
    base: 'rgba(255,255,255,0.06)',
    hover: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.08)',
    shine: 'rgba(255,255,255,0.12)',
  },

  // Text
  text: {
    primary: '#F3F6FA',
    secondary: 'rgba(243,246,250,0.70)',
    muted: 'rgba(243,246,250,0.48)',
  },

  // Accents (default Sovereign palette)
  accent: {
    primary: '#00E0C7',   // electric teal
    gold: '#F2C94C',      // gold
    glow: 'rgba(0,224,199,0.35)',
  },

  // Species primaries (adapted to dark mode)
  human: {
    primary: '#C69C6D',
    accent: '#8B5E3C',
    glow: 'rgba(198,156,109,0.45)',
    light: '#C69C6D',
  },
  zythera: {
    primary: '#00E0C7',
    accent: '#00B8B8',
    glow: 'rgba(0,224,199,0.50)',
    light: '#7FFFD4',
  },

  // Semantic
  satire: '#F2C94C',
  success: '#27D17A',
  danger: '#FF5A65',
  warning: '#F2C94C',
  border: 'rgba(255,255,255,0.08)',
};

export const typography = {
  display: { fontSize: 36, fontWeight: '700' as const, lineHeight: 42, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  headline: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  value: { fontSize: 28, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as any },
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
  sm: 8,
  md: 16,
  lg: 20,
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

/**
 * Cross-platform shadow for glass chrome (tab bar, cards, orbs).
 * On web uses boxShadow; on native uses elevation.
 */
export function dropShadow(level: 'sm' | 'md' | 'lg' | 'glow' = 'md', tint: string = '#000000') {
  const opacity = level === 'sm' ? 0.16 : level === 'md' ? 0.28 : level === 'glow' ? 0.35 : 0.45;
  const radius = level === 'sm' ? 6 : level === 'md' ? 16 : level === 'glow' ? 24 : 32;
  const offset = level === 'sm' ? 2 : level === 'md' ? 6 : level === 'glow' ? 8 : 12;
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${offset}px ${radius}px ${tint}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
  return {
    elevation: level === 'sm' ? 4 : level === 'md' ? 8 : level === 'glow' ? 12 : 16,
  };
}
