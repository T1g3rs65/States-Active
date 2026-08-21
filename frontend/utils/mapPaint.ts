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
  borderColor?: string;
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

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

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

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function hillshade(t: Paintable, byIndex: Map<number, Paintable>): number {
  if (WATER_BIOMES.has(t.biome)) {
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
  const inv = 1 / (Math.hypot(nx, ny, 1) || 1);
  const d = (nx * -0.5 + ny * -0.62 + 0.6) * inv;
  return 0.4 + 0.6 * Math.max(0, d);
}

function pathCell(ctx: CanvasRenderingContext2D, poly: number[][]) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function bbox(poly: number[][]): [number, number, number, number] {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of poly) {
    if (x < minx) minx = x;
    if (y < miny) miny = y;
    if (x > maxx) maxx = x;
    if (y > maxy) maxy = y;
  }
  return [minx, miny, maxx, maxy];
}

function family(biome: string): string {
  if (WATER_BIOMES.has(biome)) return 'water';
  if (/glacier|ice|snow/.test(biome)) return 'ice';
  if (/mountain|alpine|karst|badlands/.test(biome)) return 'rock';
  if (/forest|boreal|rainforest/.test(biome)) return 'forest';
  if (/swamp|marsh|wetland|mangrove|peat|flooded/.test(biome)) return 'wet';
  if (/desert|barren|sparse/.test(biome)) return 'sand';
  if (/beach|coast|salt/.test(biome)) return 'shore';
  if (/tundra/.test(biome)) return 'tundra';
  if (/savanna|shrub/.test(biome)) return 'savanna';
  return 'grass';
}

function blendedFill(
  t: Paintable,
  fillFor: (c: Paintable) => string,
  byIndex: Map<number, Paintable>
): [number, number, number] {
  let rgb = parseHex(fillFor(t));
  let w = 1;
  for (const ni of t.neighbors || []) {
    const o = byIndex.get(ni);
    if (!o || o.biome === t.biome) continue;
    rgb = mixRgb(rgb, parseHex(fillFor(o)), 0.28);
    w += 0.16;
  }
  return rgb;
}

/** World-space marks so the same biome continues across cell borders. */
function paintTexture(ctx: CanvasRenderingContext2D, t: Paintable, fam: string) {
  const poly = t.polygon;
  const [minx, miny, maxx, maxy] = bbox(poly);
  ctx.save();
  pathCell(ctx, poly);
  ctx.clip();
  ctx.lineCap = 'round';

  if (fam === 'water') {
    ctx.strokeStyle = 'rgba(180,220,255,0.18)';
    ctx.lineWidth = 0.45;
    const sp = 3.2;
    for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
      const phase = hash2(0, y) * 4;
      ctx.beginPath();
      ctx.moveTo(minx, y + Math.sin((minx + phase) * 0.35) * 0.6);
      ctx.lineTo(maxx, y + Math.sin((maxx + phase) * 0.35) * 0.6);
      ctx.stroke();
    }
  } else if (fam === 'forest') {
    const sp = 2.6;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        const n = hash2(x, y);
        if (n < 0.35) continue;
        ctx.beginPath();
        ctx.arc(x + (n - 0.5) * 1.2, y + hash2(y, x) * 1.1, 0.55 + n * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = n > 0.75 ? 'rgba(12,40,16,0.45)' : 'rgba(20,55,22,0.32)';
        ctx.fill();
      }
    }
  } else if (fam === 'grass') {
    ctx.strokeStyle = 'rgba(90,120,40,0.28)';
    ctx.lineWidth = 0.4;
    const sp = 2.4;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        const n = hash2(x + 3, y);
        if (n < 0.28) continue;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (n - 0.5) * 1.4, y - 1.3 - n);
        ctx.stroke();
      }
    }
  } else if (fam === 'savanna') {
    ctx.fillStyle = 'rgba(90,70,30,0.28)';
    const sp = 3.4;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        if (hash2(x, y) < 0.55) continue;
        ctx.fillRect(x, y, 0.9, 0.9);
      }
    }
  } else if (fam === 'sand') {
    ctx.fillStyle = 'rgba(255,230,180,0.22)';
    const sp = 1.8;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        if (hash2(x * 1.7, y * 1.3) < 0.62) continue;
        ctx.fillRect(x, y, 0.7, 0.7);
      }
    }
  } else if (fam === 'rock') {
    ctx.strokeStyle = 'rgba(40,35,30,0.35)';
    ctx.lineWidth = 0.55;
    const sp = 3.6;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        const n = hash2(x, y);
        if (n < 0.4) continue;
        ctx.beginPath();
        ctx.moveTo(x - 1.4, y + n);
        ctx.lineTo(x + 1.6, y - 1.2 + n);
        ctx.stroke();
      }
    }
  } else if (fam === 'ice') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const sp = 2.8;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        if (hash2(x, y) < 0.7) continue;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
    }
  } else if (fam === 'wet') {
    ctx.strokeStyle = 'rgba(30,80,70,0.28)';
    ctx.lineWidth = 0.5;
    const sp = 2.9;
    for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
      ctx.beginPath();
      ctx.moveTo(minx, y);
      ctx.lineTo(maxx, y + 0.4);
      ctx.stroke();
    }
  } else if (fam === 'shore') {
    ctx.fillStyle = 'rgba(255,250,230,0.35)';
    const sp = 1.6;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        if (hash2(x, y) < 0.5) continue;
        ctx.fillRect(x, y, 0.8, 0.8);
      }
    }
  } else if (fam === 'tundra') {
    ctx.fillStyle = 'rgba(200,210,200,0.25)';
    const sp = 3.1;
    for (let x = Math.floor(minx / sp) * sp; x <= maxx; x += sp) {
      for (let y = Math.floor(miny / sp) * sp; y <= maxy; y += sp) {
        if (hash2(x, y) < 0.5) continue;
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
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

  const political = mapMode === 'political' || mapMode === 'faction';

  for (const t of territories) {
    if (!Array.isArray(t.polygon) || t.polygon.length < 3) continue;
    const water = WATER_BIOMES.has(t.biome);
    const shade = hillshade(t, byIndex);
    const j = political ? cellJitter(t.index) * 0.25 : cellJitter(t.index) * 0.08;
    const mixed = blendedFill(t, fillFor, byIndex);
    pathCell(ctx, t.polygon);
    ctx.globalAlpha = 1;
    const keepHue = mapMode === 'political' && !!t.ownerId;
    ctx.fillStyle = keepHue
      ? litColor(fillFor(t), 0.82 + 0.28 * shade, j * 0.25, true)
      : litColor(toCss(...mixed), shade, j, water);
    ctx.fill();
  }

  const texAlpha = political ? 0.12 : 0.32;
  ctx.globalAlpha = texAlpha;
  for (const t of territories) {
    if (!t.polygon || t.polygon.length < 3) continue;
    paintTexture(ctx, t, family(t.biome));
  }
  ctx.globalAlpha = 1;

  for (const t of territories) {
    if (!t.isRiver || !t.polygon) continue;
    pathCell(ctx, t.polygon);
    ctx.fillStyle = '#2a6aa8';
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (political) {
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 0.95;
    for (const t of territories) {
      if (!isNationBorder(t) || !t.polygon) continue;
      pathCell(ctx, t.polygon);
      ctx.strokeStyle = mapMode === 'faction' ? '#F3F6FA' : (t.borderColor || '#f0d78c');
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
