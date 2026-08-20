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
 * Generate jittered seed points so cells are roughly evenly spaced
 * without the regularity of a grid.
 */
function generateJitteredPoints(
  mapCols: number,
  mapRows: number,
  count: number,
  rng: () => number
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const area = mapCols * mapRows;
  const cellArea = area / count;
  const cellSize = Math.sqrt(cellArea);
  const cols = Math.ceil(mapCols / cellSize);
  const rows = Math.ceil(mapRows / cellSize);
  const actualCellW = mapCols / cols;
  const actualCellH = mapRows / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (rng() - 0.5) * actualCellW * 0.8;
      const jitterY = (rng() - 0.5) * actualCellH * 0.8;
      let x = c * actualCellW + actualCellW / 2 + jitterX;
      let y = r * actualCellH + actualCellH / 2 + jitterY;
      x = Math.max(0.01, Math.min(mapCols - 0.01, x));
      y = Math.max(0.01, Math.min(mapRows - 0.01, y));
      points.push([x, y]);
    }
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
  iterations: number
): Array<[number, number]> {
  let points = initialPoints.map(p => [...p] as [number, number]);

  for (let iter = 0; iter < iterations; iter++) {
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi(bounds);
    const nextPoints: Array<[number, number]> = [];

    let i = 0;
    for (const [index, poly] of voronoi.cellPolygons()) {
      const [cx, cy] = polygonCentroid(poly);
      nextPoints[index] = [
        Math.max(bounds.xmin + 0.01, Math.min(bounds.xmax - 0.01, cx)),
        Math.max(bounds.ymin + 0.01, Math.min(bounds.ymax - 0.01, cy)),
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
  isRiver: boolean
): { biome: Biome; color: string } {
  const latitude = Math.abs((row - 100) / 100); // assumes 200-row map
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
  mapCols: number = 200,
  mapRows: number = 200,
  cellCount: number = 1500,
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
  const initialPoints = generateJitteredPoints(mapCols, mapRows, cellCount, rng);
  const relaxedPoints = lloydRelaxVoronoi(initialPoints, bounds, 5);

  // PASS 3: build Delaunay/Voronoi from relaxed points
  const delaunay = Delaunay.from(relaxedPoints);
  const voronoi = delaunay.voronoi(bounds);

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

  for (const [index, polyGrid] of voronoi.cellPolygons()) {
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

    const { biome, color } = assignBiome(centroidCol, centroidRow, normalized, moisture, noise, isRiver);

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
