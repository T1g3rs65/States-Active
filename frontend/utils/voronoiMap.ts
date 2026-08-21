import { Delaunay } from 'd3-delaunay';
import { SimplexNoise } from './noise';
import { assignResourceToTile } from './resources';

export interface VoronoiCell {
  id: string;
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  polygon: number[][]; // pixel-space vertices [[x,y], ...]
  neighbors: number[];
  normalized: number;
  moisture: number;
  biome: Biome;
  color: string;
  resourceId: string | null;
  ownerId: string | null;
  ownerName?: string;
  isRiver: boolean;
  nearWater: boolean;
}

// Reusing the same biome palette and logic as the hex-grid map
// so the world keeps its character during the Voronoi migration.
export type Biome =
  | 'deep_ocean' | 'shallow_sea' | 'abyss' | 'midnight_zone' | 'river'
  | 'glacier' | 'ice_shelf' | 'snow_ice' | 'arctic_tundra' | 'tundra'
  | 'rocky_mountain' | 'alpine_meadow' | 'sparse_vegetation'
  | 'boreal_forest' | 'temperate_rainforest' | 'tropical_rainforest'
  | 'evergreen_forest' | 'deciduous_forest' | 'mixed_forest'
  | 'swamp' | 'marsh' | 'peat_bog' | 'mangrove' | 'wetland'
  | 'temperate_grassland' | 'flooded_grassland' | 'grassland'
  | 'savanna' | 'woody_savanna' | 'shrubland'
  | 'hot_desert' | 'semi_arid_desert' | 'cold_desert' | 'barren'
  | 'beach' | 'rocky_coast' | 'salt_marsh' | 'badlands' | 'karst';

const WATER_BIOMES = new Set<string>([
  'abyss', 'midnight_zone', 'deep_ocean', 'shallow_sea', 'river',
]);

const DEEP_WATER_BIOMES = new Set<string>(['abyss', 'midnight_zone', 'deep_ocean']);

/**
 * Seed points with spatially varying density so Voronoi cells are NOT a
 * uniform honeycomb. Land gets smaller cells, ocean larger ones, plus
 * noisy clumps. Full-cell jitter so it doesn't read as a warped grid.
 */
function generateVariedPoints(
  mapCols: number,
  mapRows: number,
  count: number,
  rng: () => number,
  noise: SimplexNoise
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const area = mapCols * mapRows;
  const cellSize = Math.sqrt(area / count) * 0.82;
  const cols = Math.ceil(mapCols / cellSize);
  const rows = Math.ceil(mapRows / cellSize);
  const cellW = mapCols / cols;
  const cellH = mapRows / rows;

  const clamp = (x: number, y: number): [number, number] => [
    Math.max(0.01, Math.min(mapCols - 0.01, x)),
    Math.max(0.01, Math.min(mapRows - 0.01, y)),
  ];

  const pushJittered = (cx: number, cy: number) => {
    const jx = (rng() - 0.5) * cellW * 0.98;
    const jy = (rng() - 0.5) * cellH * 0.98;
    points.push(clamp(cx + jx, cy + jy));
  };

  // Prospect ~ chance this site is a resource deposit (forests, grass, ore, fishing banks).
  // Low prospect = empty land/water → fewer seeds → larger Voronoi cells.
  const prospectAt = (cx: number, cy: number, continent: number, clump: number) => {
    const moisture = (noise.fbm((cx + 500) / 18, (cy + 500) / 18, 3, 0.5) + 1) * 0.5;
    const ridges = noise.ridged(cx * 0.02, cy * 0.02, 4);
    const land = continent > 0.46
      ? Math.min(1, moisture * 0.5 + Math.max(0, ridges - 0.38) * 0.55 + (1 - Math.abs(moisture - 0.42)) * 0.25)
      : 0;
    const banks = continent < 0.4 ? clump * 0.75 : 0;
    return Math.max(land, banks);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;
      const continent = (noise.fbm(cx * 0.002, cy * 0.002, 3, 0.5) + 1) * 0.5;
      const clump = (noise.fbm(cx * 0.045 + 40, cy * 0.045 - 17, 2, 0.55) + 1) * 0.5;
      const prospect = prospectAt(cx, cy, continent, clump);
      // Empty tiles: low keep (large cells). Resource belts: extra sites (small cells).
      const keep = 0.10 + continent * 0.32 + prospect * 0.88 + clump * 0.12;
      if (rng() < Math.min(0.97, keep)) {
        pushJittered(cx, cy);
      }
      if (rng() < prospect * 0.62) {
        pushJittered(cx, cy);
      }
    }
  }

  let guard = 0;
  while (points.length < count && guard++ < count * 8) {
    const x = rng() * mapCols;
    const y = rng() * mapRows;
    const continent = (noise.fbm(x * 0.002, y * 0.002, 3, 0.5) + 1) * 0.5;
    const clump = (noise.fbm(x * 0.045 + 40, y * 0.045 - 17, 2, 0.55) + 1) * 0.5;
    if (rng() < 0.18 + prospectAt(x, y, continent, clump) * 0.9) {
      points.push(clamp(x, y));
    }
  }
  while (points.length < count) {
    points.push(clamp(rng() * mapCols, rng() * mapRows));
  }
  if (points.length > count) {
    // Drop empty sites first so resource clusters stay dense.
    const scored = points.map((p, i) => {
      const continent = (noise.fbm(p[0] * 0.002, p[1] * 0.002, 3, 0.5) + 1) * 0.5;
      const clump = (noise.fbm(p[0] * 0.045 + 40, p[1] * 0.045 - 17, 2, 0.55) + 1) * 0.5;
      return { p, i, s: prospectAt(p[0], p[1], continent, clump) + rng() * 0.05 };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, count).map(x => x.p);
  }
  return points;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polygonCentroid(poly: number[][]): [number, number] {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  if (a === 0) return [poly[0][0], poly[0][1]];
  const factor = 1 / (6 * a);
  return [cx * factor, cy * factor];
}

/**
 * Lloyd relaxation: compute Voronoi cells, move each seed to the cell centroid,
 * repeat. Produces organic but evenly-spaced irregular cells.
 */
function lloydRelaxVoronoi(
  initialPoints: Array<[number, number]>,
  bounds: { xmin: number; ymin: number; xmax: number; ymax: number },
  iterations: number,
  blend: number = 1
): Array<[number, number]> {
  let points = initialPoints.map(p => [...p] as [number, number]);

  for (let iter = 0; iter < iterations; iter++) {
    const delaunay = Delaunay.from(points);
    // d3-delaunay's voronoi() expects an iterable bounds array [xmin, ymin, xmax, ymax]
    // (an object throws "object is not iterable").
    const voronoi = delaunay.voronoi([bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax]);
    const nextPoints: Array<[number, number]> = [];

    let i = 0;
    // d3-delaunay v6 yields the polygon itself (with .index set), not a
    // [index, polygon] tuple — so use poly.index for the cell index.
    for (const poly of voronoi.cellPolygons()) {
      const index = poly.index;
      const [cx, cy] = polygonCentroid(poly);
      const ox = points[index]?.[0] ?? cx;
      const oy = points[index]?.[1] ?? cy;
      const nx = ox + (cx - ox) * blend;
      const ny = oy + (cy - oy) * blend;
      nextPoints[index] = [
        Math.max(bounds.xmin + 0.01, Math.min(bounds.xmax - 0.01, nx)),
        Math.max(bounds.ymin + 0.01, Math.min(bounds.ymax - 0.01, ny)),
      ];
      i++;
    }

    // Safety: if cellPolygons skipped any indices, keep old point.
    for (let j = 0; j < points.length; j++) {
      if (!nextPoints[j]) nextPoints[j] = points[j];
    }
    points = nextPoints;
  }

  return points;
}

/**
 * Generate a deterministic river path from a mountain source downhill.
 * Returns a Set of cell indices that are river cells.
 */
function generateRiverCells(
  points: Array<[number, number]>,
  noise: SimplexNoise,
  mapCols: number,
  mapRows: number,
  delaunay: Delaunay,
  riverCount: number = 20
): Set<number> {
  const riverIndices = new Set<number>();
  const elevations = points.map(([col, row]) => {
    const base = noise.fbm(col / 100, row / 100, 6, 0.5) * 0.6;
    const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.75;
    const directional = noise.noise2D(col * 0.005, row * 0.12) * 0.3;
    return base + ridges + directional - 0.1;
  });

  // Find mountain sources
  const sources = points
    .map((_, i) => i)
    .filter(i => elevations[i] > 0.8 && elevations[i] < 1.5)
    .sort(() => Math.random() - 0.5)
    .slice(0, riverCount);

  for (const start of sources) {
    let current = start;
    const visited = new Set<number>();
    let steps = 0;
    const maxSteps = 200;

    while (steps < maxSteps) {
      if (visited.has(current)) break;
      visited.add(current);
      riverIndices.add(current);

      if (elevations[current] < 0.05) break;

      let lowestNeighbor: number | null = null;
      let lowestElev = elevations[current];

      for (const n of delaunay.neighbors(current)) {
        if (visited.has(n)) continue;
        if (elevations[n] < lowestElev) {
          lowestElev = elevations[n];
          lowestNeighbor = n;
        }
      }

      if (lowestNeighbor === null) break;
      current = lowestNeighbor;
      steps++;
    }
  }

  return riverIndices;
}

function assignBiome(
  col: number,
  row: number,
  normalized: number,
  moisture: number,
  noise: SimplexNoise,
  isRiver: boolean,
  mapRows: number = 284
): { biome: Biome; color: string } {
  const mid = mapRows / 2;
  const latitude = Math.abs((row - mid) / mid);
  const desertLat = Math.exp(-Math.pow(latitude - 0.33, 2) / 0.015);
  const finalMoisture = moisture - desertLat * 0.4;

  const base = noise.fbm(col / 100, row / 100, 6, 0.5) * 0.6;
  const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.75;
  const directional = noise.noise2D(col * 0.005, row * 0.12) * 0.3;
  const elevation = base + ridges + directional;

  let biome: Biome = 'temperate_grassland';
  let color = '#C8C87A';

  // Oceans
  if (normalized < 0.25) { biome = 'abyss'; color = '#001133'; }
  else if (normalized < 0.30) { biome = 'midnight_zone'; color = '#002244'; }
  else if (normalized < 0.35) { biome = 'deep_ocean'; color = '#1C0DFF'; }
  else if (normalized < 0.45) { biome = 'shallow_sea'; color = '#0064C8'; }
  // Polar ice
  else if (latitude > 0.9) {
    if (elevation > 0.6) { biome = 'glacier'; color = '#B0E0FF'; }
    else if (elevation > 0.4) { biome = 'snow_ice'; color = '#F0F0F0'; }
    else if (elevation > 0.2) { biome = 'ice_shelf'; color = '#E8F4FF'; }
    else { biome = 'arctic_tundra'; color = '#D0D8C0'; }
  } else if (latitude > 0.90) { biome = 'tundra'; color = '#F6E2A0'; }
  // Mountains
  else if (normalized > 0.92) { biome = 'rocky_mountain'; color = '#000000'; }
  else if (normalized > 0.88) { biome = 'alpine_meadow'; color = '#2B2B2B'; }
  else if (elevation > 0.8) {
    if (latitude > 0.7) { biome = 'boreal_forest'; color = '#2F4F2F'; }
    else if (finalMoisture < 0.1) { biome = 'badlands'; color = '#B86F50'; }
    else if (finalMoisture > 0.5) { biome = 'karst'; color = '#C0C0C0'; }
    else { biome = 'sparse_vegetation'; color = '#8B8B7A'; }
  }
  // Coastal
  else if (elevation < 0.25 && elevation > 0.15) {
    const nearOcean = noise.noise2D(col / 3, row / 3) > 0.3;
    if (nearOcean) {
      if (finalMoisture > 0.5) { biome = 'salt_marsh'; color = '#8FBC8F'; }
      else if (finalMoisture > 0.2) { biome = 'beach'; color = '#F0E68C'; }
      else { biome = 'rocky_coast'; color = '#707070'; }
    } else { biome = 'flooded_grassland'; color = '#A0D6A0'; }
  }
  // Wetlands
  else if (elevation < 0.35 && finalMoisture > 0.6) {
    if (latitude < 0.2) { biome = 'swamp'; color = '#2F3F2F'; }
    else if (latitude < 0.35) { biome = 'mangrove'; color = '#00CF75'; }
    else if (latitude < 0.5) { biome = 'marsh'; color = '#5F7F5F'; }
    else { biome = 'peat_bog'; color = '#4F3F2F'; }
  } else if (elevation < 0.25 && finalMoisture > 0.5) { biome = 'wetland'; color = '#27FF87'; }
  // Forests
  else if (finalMoisture > 0.40) {
    if (latitude < 0.15) { biome = 'tropical_rainforest'; color = '#003300'; }
    else if (latitude > 0.70) { biome = 'boreal_forest'; color = '#2F4F2F'; }
    else if (finalMoisture > 0.60) { biome = 'temperate_rainforest'; color = '#1F3F1F'; }
    else if (finalMoisture > 0.45) { biome = 'evergreen_forest'; color = '#05450A'; }
    else { biome = 'deciduous_forest'; color = '#78D203'; }
  } else if (finalMoisture > 0.35) { biome = 'mixed_forest'; color = '#009900'; }
  // Deserts
  else if (finalMoisture < 0.15) {
    if (latitude > 0.7) { biome = 'cold_desert'; color = '#C9B89B'; }
    else if (latitude > 0.35 && latitude < 0.5) {
      if (elevation > 0.5) { biome = 'hot_desert'; color = '#E3B98F'; }
      else if (finalMoisture < 0.03) { biome = 'savanna'; color = '#FBFF13'; }
      else { biome = 'semi_arid_desert'; color = '#D8B56B'; }
    } else if (elevation > 0.6) { biome = 'barren'; color = '#F9FFA4'; }
    else {
      const useSavanna = noise.noise2D(col / 3, row / 3) > 0.2;
      biome = useSavanna ? 'savanna' : 'semi_arid_desert';
      color = useSavanna ? '#FBFF13' : '#D8B56B';
    }
  }
  // Grasslands & savannas
  else if (finalMoisture > 0.05) {
    if (latitude < 0.35 && finalMoisture < 0.22) { biome = 'woody_savanna'; color = '#DADE48'; }
    else if (finalMoisture < 0.25) { biome = 'shrubland'; color = '#BFBB22'; }
    else if (finalMoisture < 0.28 && latitude < 0.45) { biome = 'savanna'; color = '#FBFF13'; }
    else if (finalMoisture > 0.22) { biome = 'grassland'; color = '#B6FF05'; }
    else { biome = 'temperate_grassland'; color = '#C8C87A'; }
  } else {
    biome = 'grassland';
    color = '#B6FF05';
  }

  if (isRiver) {
    biome = 'river';
    color = '#2060A0';
  }

  return { biome, color };
}

/**
 * Generate the Voronoi-based world map cells.
 */
export function generateVoronoiCells(
  seed: number = 123456,
  mapCols: number = 160,
  mapRows: number = 284,
  cellCount: number = 45440,
  pixelScale: number = 6
): VoronoiCell[] {
  const rng = mulberry32(seed);
  const noise = new SimplexNoise(seed);

  // PASS 1: build elevation field on a coarse grid for normalization
  const rawElevations: number[] = [];
  let minElev = Infinity;
  let maxElev = -Infinity;
  const elevCols = 40;
  const elevRows = 40;
  for (let r = 0; r < elevRows; r++) {
    for (let c = 0; c < elevCols; c++) {
      const col = (c / (elevCols - 1)) * mapCols;
      const row = (r / (elevRows - 1)) * mapRows;
      const continentMask = noise.fbm(col * 0.002, row * 0.002, 3, 0.5);
      const base = noise.fbm(col / 100, row / 100, 4, 0.35) * 0.6;
      const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.35;
      const directional = Math.abs(noise.noise2D(col * 0.005, row * 0.12)) * -0.2;
      const elevation = continentMask * 0.7 + (base + ridges + directional) * 0.3;
      rawElevations.push(elevation);
      minElev = Math.min(minElev, elevation);
      maxElev = Math.max(maxElev, elevation);
    }
  }

  // PASS 2: seed points and Lloyd relax
  const bounds = { xmin: 0, ymin: 0, xmax: mapCols, ymax: mapRows };
  const initialPoints = generateVariedPoints(mapCols, mapRows, cellCount, rng, noise);
  // One light Lloyd pass (30% toward centroid) kills needle cells without
  // evening sizes back into a honeycomb.
  const relaxedPoints = lloydRelaxVoronoi(initialPoints, bounds, 1, 0.3);

  // PASS 3: build Delaunay/Voronoi from relaxed points
  const delaunay = Delaunay.from(relaxedPoints);
  // d3-delaunay's voronoi() expects an iterable bounds array [xmin, ymin, xmax, ymax].
  const voronoi = delaunay.voronoi([bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax]);

  // Collect neighbor lists
  const neighbors: number[][] = [];
  for (let i = 0; i < relaxedPoints.length; i++) {
    neighbors[i] = Array.from(delaunay.neighbors(i));
  }

  // PASS 4: rivers
  const riverIndices = generateRiverCells(relaxedPoints, noise, mapCols, mapRows, delaunay, 20);

  // PASS 5: build cells
  const cells: VoronoiCell[] = [];
  let waterCellCount = 0;

  // d3-delaunay v6 yields the polygon itself (with .index set), not a
  // [index, polygon] tuple — use polyGrid.index for the cell index.
  for (const polyGrid of voronoi.cellPolygons()) {
    const index = polyGrid.index;
    const [col, row] = relaxedPoints[index];
    const [cx, cy] = polygonCentroid(polyGrid);
    const centroidCol = cx;
    const centroidRow = cy;

    // Sample normalized elevation at centroid (bilinear-ish from coarse grid)
    const gx = (centroidCol / mapCols) * (elevCols - 1);
    const gy = (centroidRow / mapRows) * (elevRows - 1);
    const gx0 = Math.floor(gx);
    const gy0 = Math.floor(gy);
    const gx1 = Math.min(gx0 + 1, elevCols - 1);
    const gy1 = Math.min(gy0 + 1, elevRows - 1);
    const fx = gx - gx0;
    const fy = gy - gy0;
    const e00 = rawElevations[gy0 * elevCols + gx0];
    const e10 = rawElevations[gy0 * elevCols + gx1];
    const e01 = rawElevations[gy1 * elevCols + gx0];
    const e11 = rawElevations[gy1 * elevCols + gx1];
    const elevationSample =
      e00 * (1 - fx) * (1 - fy) +
      e10 * fx * (1 - fy) +
      e01 * (1 - fx) * fy +
      e11 * fx * fy;
    const normalized = (elevationSample - minElev) / (maxElev - minElev);

    // Moisture with latitude curve
    const rawMoisture = noise.fbm((centroidCol + 2000) / 20, (centroidRow + 2000) / 25, 5, 0.85);
    const latitude = Math.abs((centroidRow - mapRows / 2) / (mapRows / 2));
    const desertLat = Math.exp(-Math.pow(latitude - 0.33, 2) / 0.015);
    const moisture = (rawMoisture + 1) * 0.5 - desertLat * 0.4;

    const isRiver = riverIndices.has(index);

    const { biome, color } = assignBiome(centroidCol, centroidRow, normalized, moisture, noise, isRiver, mapRows);

    if (WATER_BIOMES.has(biome)) waterCellCount++;

    const polygon = polyGrid.map(([x, y]) => [x * pixelScale, y * pixelScale]);
    const x = centroidCol * pixelScale;
    const y = centroidRow * pixelScale;

    cells.push({
      id: `cell-${index}`,
      index,
      col: centroidCol,
      row: centroidRow,
      x,
      y,
      polygon,
      neighbors: neighbors[index],
      normalized,
      moisture,
      biome,
      color,
      resourceId: assignResourceToTile(biome, Math.round(centroidCol), Math.round(centroidRow), seed),
      ownerId: null,
      ownerName: undefined,
      isRiver,
      nearWater: false,
    });
  }

  // PASS 6: near-water flag (used by border ownership)
  for (const cell of cells) {
    if (WATER_BIOMES.has(cell.biome)) continue;
    for (const n of cell.neighbors) {
      if (WATER_BIOMES.has(cells[n].biome)) {
        cell.nearWater = true;
        break;
      }
    }
  }

  console.log(
    `Voronoi map generated: ${cells.length} cells, ${waterCellCount} water cells, ${riverIndices.size} river cells`
  );

  return cells;
}

export { WATER_BIOMES, DEEP_WATER_BIOMES };
