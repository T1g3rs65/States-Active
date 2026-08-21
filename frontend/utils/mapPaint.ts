import { WATER_BIOMES } from './voronoiMap';

type Paintable = {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  polygon: number[][];
  neighbors: number[];
  normalized: number;
  biome: string;
  color: string;
  ownerId: string | null;
  resourceId: string | null;
  isRiver?: boolean;
};

function parseHex(hex: string): [number, number, number] {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toCss(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** Pull neon biome palettes toward earthy, then apply hillshade + tiny jitter. */
function litColor(hex: string, shade: number, jitter: number, isWater: boolean): string {
  let [r, g, b] = parseHex(hex);
  if (!isWater) {
    const avg = (r + g + b) / 3;
    const mute = 0.28;
    r = r * (1 - mute) + (avg * 0.72 + 28) * mute;
    g = g * (1 - mute) + (avg * 0.8 + 22) * mute;
    b = b * (1 - mute) + (avg * 0.45 + 12) * mute;
  }
  r = r * shade + jitter * 12;
  g = g * shade + jitter * 10;
  b = b * shade + jitter * 8;
  return toCss(r, g, b);
}

function cellJitter(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function hillshade(t: Paintable, byIndex: Map<number, Paintable>): number {
  if (WATER_BIOMES.has(t.biome)) {
    // Depth: abyss dark, shallows bright
    return 0.55 + 0.5 * Math.min(1, Math.max(0, t.normalized));
  }
  let west = 0, east = 0, north = 0, south = 0;
  let wc = 0, ec = 0, nc = 0, sc = 0;
  for (const ni of t.neighbors || []) {
    const o = byIndex.get(ni);
    if (!o) continue;
    if (o.col < t.col) { west += o.normalized; wc++; }
    else if (o.col > t.col) { east += o.normalized; ec++; }
    if (o.row < t.row) { north += o.normalized; nc++; }
    else if (o.row > t.row) { south += o.normalized; sc++; }
  }
  const dzdx = (east / (ec || 1) - west / (wc || 1));
  const dzdy = (south / (sc || 1) - north / (nc || 1));
  const nx = -dzdx * 5.5;
  const ny = -dzdy * 5.5;
  const nz = 1;
  const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
  // Light from northwest, slightly high
  const d = (nx * -0.5 + ny * -0.62 + nz * 0.6) * inv;
  return 0.4 + 0.6 * Math.max(0, d);
}

function pathCell(ctx: CanvasRenderingContext2D, poly: number[][]) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

export function rasterizeWorldMap(opts: {
  territories: Paintable[];
  mapWidth: number;
  mapHeight: number;
  fillFor: (t: Paintable) => string;
  isNationBorder: (t: Paintable) => boolean;
  mapMode: string;
  resourceColor?: (id: string) => string | undefined;
}): string | null {
  if (typeof document === 'undefined') return null;
  const { territories, mapWidth, mapHeight, fillFor, isNationBorder, mapMode, resourceColor } = opts;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = mapWidth * scale;
  canvas.height = mapHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, mapWidth, mapHeight);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const byIndex = new Map<number, Paintable>();
  for (const t of territories) byIndex.set(t.index, t);

  for (const t of territories) {
    if (!Array.isArray(t.polygon) || t.polygon.length < 3) continue;
    const water = WATER_BIOMES.has(t.biome);
    const shade = hillshade(t, byIndex);
    const j = cellJitter(t.index) * 0.55;
    pathCell(ctx, t.polygon);
    ctx.globalAlpha = 1;
    ctx.fillStyle = litColor(fillFor(t), shade, j, water);
    ctx.fill();
  }

  // Rivers
  ctx.strokeStyle = '#3a7ab8';
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.85;
  for (const t of territories) {
    if (!t.isRiver || !t.polygon) continue;
    pathCell(ctx, t.polygon);
    ctx.fillStyle = '#2a6aa8';
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }

  // Nation borders on political/faction
  if (mapMode === 'political' || mapMode === 'faction') {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = mapMode === 'faction' ? '#F3F6FA' : '#f0d78c';
    ctx.lineWidth = 0.9;
    for (const t of territories) {
      if (!isNationBorder(t) || !t.polygon) continue;
      pathCell(ctx, t.polygon);
      ctx.stroke();
    }
  }

  if (mapMode === 'resources') {
    ctx.globalAlpha = 0.95;
    for (const t of territories) {
      if (!t.resourceId) continue;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = resourceColor?.(t.resourceId) || '#F3F6FA';
      ctx.fill();
    }
  }

  // Film grain so large same-biome regions aren't plastic
  const grain = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = grain.data;
  for (let i = 0; i < d.length; i += 16) {
    const n = ((i * 1103515245 + 12345) >>> 8) & 31;
    d[i] = Math.min(255, d[i] + n - 12);
    d[i + 1] = Math.min(255, d[i + 1] + n - 12);
    d[i + 2] = Math.min(255, d[i + 2] + n - 12);
  }
  ctx.putImageData(grain, 0, 0);

  return canvas.toDataURL('image/png');
}
