import { colors } from './theme';

/**
 * Race color utilities for SovereignHex
 * Direction B dark glassmorphism palette.
 */

const RACE_COLORS: Record<string, { color: string; colorLight: string; colorDark: string; name: string }> = {
  human: {
    color: colors.human.primary,
    colorLight: colors.human.light,
    colorDark: colors.human.accent,
    name: 'Human',
  },
  zythera: {
    color: colors.zythera.primary,
    colorLight: colors.zythera.light,
    colorDark: colors.zythera.accent,
    name: 'Zythera',
  },
  // Default fallback
  unknown: {
    color: colors.text.muted,
    colorLight: colors.text.secondary,
    colorDark: colors.surfaceSolid,
    name: 'Unknown',
  },
};

/**
 * Get the theme colors for a given race
 * @param raceId - The race ID (e.g., 'human', 'zythera')
 * @returns Object with color, colorLight, colorDark, and name
 */
export function getRaceTheme(raceId: string | undefined | null): { 
  color: string; 
  colorLight: string; 
  colorDark: string; 
  name: string;
} {
  if (!raceId) {
    return RACE_COLORS.human; // Default to human
  }
  
  const normalizedId = raceId.toLowerCase();
  return RACE_COLORS[normalizedId] || RACE_COLORS.unknown;
}

/**
 * Get just the primary color for a race
 * @param raceId - The race ID
 * @returns Hex color string
 */
export function getRaceColor(raceId: string | undefined | null): string {
  return getRaceTheme(raceId).color;
}

/**
 * Get the race display name
 * @param raceId - The race ID
 * @returns Display name string
 */
export function getRaceName(raceId: string | undefined | null): string {
  if (!raceId) return 'Human';
  
  const normalizedId = raceId.toLowerCase();
  const race = RACE_COLORS[normalizedId];
  if (race) return race.name;
  
  // Capitalize first letter as fallback
  return raceId.charAt(0).toUpperCase() + raceId.slice(1);
}

/**
 * Check if a race is the native species (Zythera)
 */
export function isNativeRace(raceId: string | undefined | null): boolean {
  return raceId?.toLowerCase() === 'zythera';
}

/**
 * Get a race icon name for Ionicons
 */
export function getRaceIcon(raceId: string | undefined | null): string {
  const normalizedId = raceId?.toLowerCase();
  switch (normalizedId) {
    case 'zythera':
      return 'bug';
    case 'human':
    default:
      return 'person';
  }
}
