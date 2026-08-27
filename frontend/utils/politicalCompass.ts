// Political compass — 3×3 grid sampled from Austin's reference chart
// (smooth 9-cell political-compass poster). Colors blend continuously
// from cell to cell via piecewise bilinear interpolation.
//
// X-axis: economic (left = low GDP / socialist, right = high GDP / capitalist)
// Y-axis: liberty  (y = -1 auth / low rights, y = +1 lib / high rights)

export const GRID_COLORS = {
  authLeft:   '#B3282E',
  authCenter: '#A737AD',
  authRight:  '#2B42B3',
  midLeft:    '#B17F37',
  midCenter:  '#6E6E6E',
  midRight:   '#3FB19C',
  libLeft:    '#30AF2C',
  libCenter:  '#95B338',
  libRight:   '#B3B32F',
} as const;

function hexToRgb(color: string): [number, number, number] {
  const h = color.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}

/** 3 rows (auth → mid → lib) × 3 cols (left → center → right). */
export const GRID_RGB: [number, number, number][][] = [
  [hexToRgb(GRID_COLORS.authLeft), hexToRgb(GRID_COLORS.authCenter), hexToRgb(GRID_COLORS.authRight)],
  [hexToRgb(GRID_COLORS.midLeft),  hexToRgb(GRID_COLORS.midCenter),  hexToRgb(GRID_COLORS.midRight)],
  [hexToRgb(GRID_COLORS.libLeft),  hexToRgb(GRID_COLORS.libCenter),  hexToRgb(GRID_COLORS.libRight)],
];

const CENTER_COLOR = GRID_COLORS.midCenter;

export type CompassXY = { x: number; y: number };

export function compassPosition(stats?: {
  gdp?: number; civil_rights?: number; political_freedom?: number;
}): CompassXY {
  const gdp = stats?.gdp ?? 50;
  const civil = stats?.civil_rights ?? 50;
  const pol = stats?.political_freedom ?? 50;
  const economic = (gdp - 50) / 50;
  const liberty = ((civil + pol) / 2 - 50) / 50;
  return {
    x: Math.max(-1, Math.min(1, economic)),
    y: Math.max(-1, Math.min(1, liberty)),
  };
}

export function compassCell(stats?: {
  gdp?: number; civil_rights?: number; political_freedom?: number;
}): { row: 'auth' | 'mid' | 'lib'; col: 'left' | 'center' | 'right'; color: string; name: string; description: string } {
  const { x, y } = compassPosition(stats);
  const col = x < -0.22 ? 'left' : x > 0.22 ? 'right' : 'center';
  const row = y < -0.22 ? 'auth' : y > 0.22 ? 'lib' : 'mid';

  const CELLS = {
    authLeft:   { color: GRID_COLORS.authLeft,   name: 'Communist',     description: 'Totalitarian socialist state' },
    authCenter: { color: GRID_COLORS.authCenter, name: 'Authoritarian', description: 'Strongman or nationalist rule' },
    authRight:  { color: GRID_COLORS.authRight,  name: 'Conservative',  description: 'Traditionalist order, strong state' },
    midLeft:    { color: GRID_COLORS.midLeft,    name: 'Socialist',     description: 'Socialist economy, moderate freedoms' },
    midCenter:  { color: GRID_COLORS.midCenter,  name: 'Centrist',      description: 'Pragmatic middle ground' },
    midRight:   { color: GRID_COLORS.midRight,   name: 'Corporatist',   description: 'State-aligned capitalism' },
    libLeft:    { color: GRID_COLORS.libLeft,    name: 'Eco-Left',      description: 'Libertarian socialist or green' },
    libCenter:  { color: GRID_COLORS.libCenter,  name: 'Liberal',       description: 'Socially free, regulated market' },
    libRight:   { color: GRID_COLORS.libRight,   name: 'Libertarian',   description: 'Free market, minimal state' },
  };

  return { row, col, ...CELLS[`${row}${col.charAt(0).toUpperCase() + col.slice(1)}` as keyof typeof CELLS] };
}

function parseRgb(color: string): [number, number, number] {
  if (!color) return [0, 0, 0];
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  return hexToRgb(color);
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Map v in [-1, 1] onto the 3 control points at -1, 0, +1. */
function axisSegment(v: number): { i: number; t: number } {
  if (v <= 0) return { i: 0, t: smooth01(v + 1) };
  return { i: 1, t: smooth01(v) };
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Continuous color at compass (x, y) in [-1, 1]. Mid-right is teal. */
export function blendCompassXY(x: number, y: number): string {
  const cx = axisSegment(Math.max(-1, Math.min(1, x)));
  const cy = axisSegment(Math.max(-1, Math.min(1, y)));
  const top = lerpRgb(GRID_RGB[cy.i][cx.i], GRID_RGB[cy.i][cx.i + 1], cx.t);
  const bot = lerpRgb(GRID_RGB[cy.i + 1][cx.i], GRID_RGB[cy.i + 1][cx.i + 1], cx.t);
  const [r, g, b] = lerpRgb(top, bot, cy.t);
  return rgbToHex(r, g, b);
}

function mix(hex: string, base: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const [tr, tg, tb] = parseRgb(hex);
  const [br, bg, bb] = parseRgb(base);
  return rgbToHex(br + (tr - br) * t, bg + (tg - bg) * t, bb + (tb - bb) * t);
}

/** Continuous accent color — 3×3 bilinear blend matching the reference chart. */
export function compassColor(stats?: {
  economic?: number; civil_rights?: number; political_freedom?: number;
  gdp?: number;
} | null): string {
  if (!stats) return CENTER_COLOR;
  const { x, y } = compassPosition(stats);
  return blendCompassXY(x, y);
}

export function getPoliticalCompassTheme(civilRights: number, gdp: number, politicalFreedom: number) {
  const cell = compassCell({ gdp, civil_rights: civilRights, political_freedom: politicalFreedom });
  return { name: cell.name, color: cell.color, description: cell.description };
}

/** Flavor → compass cell color. Same region can have many governments. */
const GOV_CELL_COLOR: Record<string, string> = {
  // Auth-Left
  'left-wing utopia': GRID_COLORS.authLeft,
  "people's republic": GRID_COLORS.authLeft,
  'collective hive': GRID_COLORS.authLeft,
  "worker's swarm": GRID_COLORS.authLeft,
  'iron fist consumerists': GRID_COLORS.authLeft,
  // Auth-Center
  'authoritarian democracy': GRID_COLORS.authCenter,
  'father knows best state': GRID_COLORS.authCenter,
  'corrupt dictatorship': GRID_COLORS.authCenter,
  'psychotic dictatorship': GRID_COLORS.authCenter,
  'militant hive': GRID_COLORS.authCenter,
  'ordered colony': GRID_COLORS.authCenter,
  'hivemind collective': GRID_COLORS.authCenter,
  // Auth-Right (conservative — republic, junta, theocrat, monarch)
  'conservative republic': GRID_COLORS.authRight,
  'constitutional monarchy': GRID_COLORS.authRight,
  'moralistic democracy': GRID_COLORS.authRight,
  'benevolent dictatorship': GRID_COLORS.authRight,
  'theocratic enforcers': GRID_COLORS.authRight,
  'martial command': GRID_COLORS.authRight,
  'surveillance panopticon': GRID_COLORS.authRight,
  'royal hive': GRID_COLORS.authRight,
  'imperial swarm': GRID_COLORS.authRight,
  'divine hive': GRID_COLORS.authRight,
  // Mid-Left
  'democratic socialists': GRID_COLORS.midLeft,
  'socialist republic': GRID_COLORS.midLeft,
  'welfare paradise': GRID_COLORS.midLeft,
  // Mid-Center
  'inoffensive centrist democracy': GRID_COLORS.midCenter,
  'pragmatic meritocracy': GRID_COLORS.midCenter,
  'balanced hive': GRID_COLORS.midCenter,
  'diplomatic swarm': GRID_COLORS.midCenter,
  // Mid-Right
  'corporate police state': GRID_COLORS.midRight,
  'corporate bordello': GRID_COLORS.midRight,
  'cyberpunk megacity': GRID_COLORS.midRight,
  'trade empire': GRID_COLORS.midRight,
  'technocratic syndicate': GRID_COLORS.midRight,
  'tech oligarchy': GRID_COLORS.midRight,
  // Lib-Left
  'anarchy': GRID_COLORS.libLeft,
  'civil rights lovefest': GRID_COLORS.libLeft,
  'eco-socialist haven': GRID_COLORS.libLeft,
  'symbiotic swarm': GRID_COLORS.libLeft,
  'nurturing hive': GRID_COLORS.libLeft,
  'splinter colony': GRID_COLORS.libLeft,
  // Lib-Center
  'liberal democratic paradise': GRID_COLORS.libCenter,
  'scandinavian liberal paradise': GRID_COLORS.libCenter,
  'psychedelic free state': GRID_COLORS.libCenter,
  'harmonious hive': GRID_COLORS.libCenter,
  'free colony': GRID_COLORS.libCenter,
  // Lib-Right
  'capitalist paradise': GRID_COLORS.libRight,
  'free-market paradise': GRID_COLORS.libRight,
  'laissez-faire dynamo': GRID_COLORS.libRight,
  'right-wing utopia': GRID_COLORS.libRight,
  'seastead republic': GRID_COLORS.libRight,
  'pirate haven': GRID_COLORS.libRight,
  'merchant hive': GRID_COLORS.libRight,
  'techno-swarm': GRID_COLORS.libRight,
};

export function govTypeColor(govType?: string | null): string {
  if (!govType) return CENTER_COLOR;
  return GOV_CELL_COLOR[govType.toLowerCase()] || CENTER_COLOR;
}

function toHex(color: string): string {
  if (!color) return '#6E6E6E';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return rgbToHex(+m[1], +m[2], +m[3]);
  return color;
}

export function leaningColor(nation?: {
  stats?: { civil_rights?: number; gdp?: number; political_freedom?: number };
  government_type?: string | null;
} | null): string {
  const s = nation?.stats;
  if (!s) {
    // government_type now stores the compass-color enum value, so it is safe
    // to use only as a color fallback, never as displayed government identity.
    return nation?.government_type ? govTypeColor(nation.government_type) : CENTER_COLOR;
  }
  return toHex(compassColor(s));
}

export function hexAlpha(hex: string, a: number): string {
  if (!hex) return `rgba(110,110,110,${a})`;
  const rgbMatch = hex.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${a})`;
  }
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mixIntoDark(hex: string, amount: number, base = '#08090A'): string {
  return mix(hex, base, amount);
}

export function leaningWash(nation: Parameters<typeof leaningColor>[0], a = 0.08): string {
  return mixIntoDark(leaningColor(nation), a);
}
