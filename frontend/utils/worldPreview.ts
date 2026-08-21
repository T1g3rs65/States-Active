import { SimplexNoise } from './noise';
import { MAP_COLS, MAP_ROWS } from './mapConstants';
import { DEFAULT_TERRAIN, TerrainSettings, elevationRaw } from './worldNoise';

const PREVIEW_W = 320;
const PREVIEW_H = 180;

function hex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}
function rgb(r: number, g: number, b: number) {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function colorFor(n: number, lat: number, t: TerrainSettings): string {
  const water = t.landThreshold;
  if (n < water - 0.2) return rgb(0, 12, 40);
  if (n < water - 0.12) return rgb(8, 32, 90);
  if (n < water - 0.05) return rgb(20, 70, 160);
  if (n < water) return rgb(40, 120, 190);
  if (lat > 0.82) return rgb(230, 240, 255);
  if (n > 0.88) return rgb(90, 90, 95);
  if (n > 0.78) return rgb(70, 100, 70);
  if (n > 0.62) return rgb(90, 150, 70);
  return rgb(180, 200, 90);
}

/** Fast heightmap preview — not Voronoi. Same elevation field as the real map. */
export function rasterizeWorldPreview(
  seed: number,
  settings: TerrainSettings = DEFAULT_TERRAIN,
  width = PREVIEW_W,
  height = PREVIEW_H
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const noise = new SimplexNoise(seed);
  const img = ctx.createImageData(width, height);
  const d = img.data;

  let minE = Infinity;
  let maxE = -Infinity;
  const raw = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = (y / (height - 1)) * MAP_ROWS;
    for (let x = 0; x < width; x++) {
      const col = (x / (width - 1)) * MAP_COLS;
      const e = elevationRaw(noise, col, row, MAP_COLS, settings);
      raw[y * width + x] = e;
      if (e < minE) minE = e;
      if (e > maxE) maxE = e;
    }
  }
  const span = maxE - minE || 1;
  for (let i = 0; i < raw.length; i++) {
    const n = (raw[i] - minE) / span;
    const y = Math.floor(i / width);
    const lat = Math.abs(y / (height - 1) - 0.5) * 2;
    const c = colorFor(n, lat, settings);
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const o = i * 4;
    d[o] = r;
    d[o + 1] = g;
    d[o + 2] = b;
    d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
