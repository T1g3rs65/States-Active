import { SimplexNoise } from './noise';

/** Knobs for the cylinder world. Defaults match the current live map. */
export type TerrainSettings = {
  continentFreq: number;
  continentWeight: number;
  detailFreq: number;
  ridgeAmount: number;
  landThreshold: number;
};

export const DEFAULT_TERRAIN: TerrainSettings = {
  continentFreq: 0.002,
  continentWeight: 0.7,
  detailFreq: 0.01,
  ridgeAmount: 0.35,
  landThreshold: 0.45,
};

export function terrainKey(seed: number, t: TerrainSettings): string {
  const n = (x: number) => x.toFixed(4);
  return `${seed}_${n(t.continentFreq)}_${n(t.continentWeight)}_${n(t.detailFreq)}_${n(t.ridgeAmount)}_${n(t.landThreshold)}`;
}

function cylinderFbm(
  noise: SimplexNoise,
  col: number,
  row: number,
  mapCols: number,
  freq: number,
  octaves: number,
  pers: number
): number {
  const t = (2 * Math.PI * col) / mapCols;
  const r = mapCols / (2 * Math.PI);
  const a = noise.fbm(Math.cos(t) * r * freq, row * freq, octaves, pers);
  const b = noise.fbm(Math.sin(t) * r * freq, row * freq + 50, octaves, pers);
  return (a + b) * 0.5;
}

function cylinderNoise2D(
  noise: SimplexNoise,
  col: number,
  row: number,
  mapCols: number,
  fx: number,
  fy: number
): number {
  const t = (2 * Math.PI * col) / mapCols;
  const r = mapCols / (2 * Math.PI);
  return (
    noise.noise2D(Math.cos(t) * r * fx, row * fy) * 0.5 +
    noise.noise2D(Math.sin(t) * r * fx, row * fy + 80) * 0.5
  );
}

function cylinderRidged(
  noise: SimplexNoise,
  col: number,
  row: number,
  mapCols: number,
  fx: number,
  fy: number,
  octaves: number
): number {
  const t = (2 * Math.PI * col) / mapCols;
  const r = mapCols / (2 * Math.PI);
  return (
    noise.ridged(Math.cos(t) * r * fx, row * fy, octaves) * 0.5 +
    noise.ridged(Math.sin(t) * r * fx, row * fy + 90, octaves) * 0.5
  );
}

export function elevationRaw(
  noise: SimplexNoise,
  col: number,
  row: number,
  mapCols: number,
  t: TerrainSettings = DEFAULT_TERRAIN
): number {
  const continentMask = cylinderFbm(noise, col, row, mapCols, t.continentFreq, 3, 0.5);
  const base = cylinderFbm(noise, col, row, mapCols, t.detailFreq, 4, 0.35) * 0.6;
  const ridges = Math.pow(cylinderRidged(noise, col, row, mapCols, 0.02, 0.02, 5), 1.8) * t.ridgeAmount;
  const directional = Math.abs(cylinderNoise2D(noise, col, row, mapCols, 0.005, 0.12)) * -0.2;
  return continentMask * t.continentWeight + (base + ridges + directional) * (1 - t.continentWeight);
}
