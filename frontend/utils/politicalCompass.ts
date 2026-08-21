// Political compass theme based on civil rights and economic freedom
export function getPoliticalCompassTheme(civilRights: number, gdp: number, politicalFreedom: number) {
  // Map stats to political compass
  // X-axis: Economic freedom (GDP/capitalism) - 0=left, 100=right
  // Y-axis: Libertarian score (civil rights + political freedom avg) - 0=auth, 100=lib
  
  const economic = gdp; // 0-100, higher = more capitalist/right
  const libertarian = (civilRights + politicalFreedom) / 2; // 0-100, higher = more libertarian
  
  // Use 35/65 thresholds for more variety (instead of 40/60)
  const LEFT = 35;
  const RIGHT = 65;
  const AUTH = 35;
  const LIB = 65;
  
  // Authoritarian (bottom - libertarian < 35)
  if (libertarian < AUTH) {
    if (economic < LEFT) {
      return { name: 'Stalinist', color: '#991B1B', description: 'Totalitarian Communist' }; // Dark Red
    } else if (economic > RIGHT) {
      return { name: 'Monarchist', color: '#7C3AED', description: 'Absolute Royalist' }; // Purple
    } else {
      return { name: 'Autocrat', color: '#78350F', description: 'Authoritarian State' }; // Brown
    }
  }
  
  // Libertarian (top - libertarian > 65)
  if (libertarian > LIB) {
    if (economic < LEFT) {
      return { name: 'Anarchist', color: '#059669', description: 'Libertarian Socialist' }; // Emerald
    } else if (economic > RIGHT) {
      return { name: 'Minarchist', color: '#EAB308', description: 'Free Market Capitalist' }; // Yellow
    } else {
      return { name: 'Libertarian', color: '#F97316', description: 'Civil Libertarian' }; // Orange
    }
  }
  
  // Center-Auth (lower middle - libertarian 35-50)
  if (libertarian < 50) {
    if (economic < LEFT) {
      return { name: 'Socialist', color: '#DC2626', description: 'Democratic Socialist' }; // Red
    } else if (economic > RIGHT) {
      return { name: 'Corporatist', color: '#1D4ED8', description: 'State Capitalist' }; // Blue
    } else {
      return { name: 'Statist', color: '#71717A', description: 'Big Government' }; // Zinc
    }
  }
  
  // Center-Lib (upper middle - libertarian 50-65)
  if (economic < LEFT) {
    return { name: 'Progressive', color: '#EC4899', description: 'Social Democrat' }; // Pink
  } else if (economic > RIGHT) {
    return { name: 'Conservative', color: '#0EA5E9', description: 'Traditional Capitalist' }; // Sky Blue
  } else {
    return { name: 'Centrist', color: '#6B7280', description: 'Moderate Pragmatist' }; // Gray
  }
}

export function leaningColor(nation?: {
  stats?: { civil_rights?: number; gdp?: number; political_freedom?: number };
} | null): string {
  const s = nation?.stats;
  if (!s) return '#6B7280';
  return getPoliticalCompassTheme(s.civil_rights ?? 50, s.gdp ?? 50, s.political_freedom ?? 50).color;
}

export function hexAlpha(hex: string, a: number): string {
  const h = (hex || '#6B7280').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

function parseRgb(hex: string): [number, number, number] {
  const h = (hex || '#000000').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}

/** Opaque blend of accent into the dark canvas — never a transparent wash over white. */
export function mixIntoDark(hex: string, amount: number, base = '#08090A'): string {
  const t = Math.max(0, Math.min(1, amount));
  const [tr, tg, tb] = parseRgb(hex);
  const [br, bg, bb] = parseRgb(base);
  const r = Math.round(br + (tr - br) * t);
  const g = Math.round(bg + (tg - bg) * t);
  const b = Math.round(bb + (tb - bb) * t);
  return `rgb(${r},${g},${b})`;
}

export function leaningWash(nation: Parameters<typeof leaningColor>[0], a = 0.08): string {
  return mixIntoDark(leaningColor(nation), a);
}
