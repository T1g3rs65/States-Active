/** Exact operating blurbs for wheel combos. Never stitch pieces. */

import { HUMAN, ZYTHERA } from './govOperating.store';
import './govOperating.democracy';
import './govOperating.oligarchy';
import './govOperating.autocracy';
import './govOperating.anarchy';
import './govOperating.odd';
import './govOperating.stacks.democracy';
import './govOperating.stacks.democracy2';
import './govOperating.stacks.rest';
import './govOperating.stragglers';
import './govOperating.zythera.stacks';

export const NONE = 'None (clean result)';
export const UNITARY = 'unitary';

function normTerr(t?: string | null) {
  return (t && t.trim()) || UNITARY;
}
function normStyle(s?: string | null) {
  if (!s || !s.trim() || s === 'None') return NONE;
  return s;
}

export function govOperatingBlurb(nation?: {
  government_subtype?: string | null;
  territorial_structure?: string | null;
  style_modifier?: string | null;
  race?: string | null;
} | null): string | null {
  if (!nation?.government_subtype) return null;
  const race = (nation.race || 'human').toLowerCase();
  const table = race === 'zythera' && ZYTHERA[nation.government_subtype] ? ZYTHERA : HUMAN;
  const terr = table[nation.government_subtype]?.[normTerr(nation.territorial_structure)];
  if (!terr) return null;
  return terr[normStyle(nation.style_modifier)] || null;
}

export function govOperatingHas(nation?: {
  government_subtype?: string | null;
  territorial_structure?: string | null;
  style_modifier?: string | null;
  race?: string | null;
} | null): boolean {
  return !!govOperatingBlurb(nation);
}
