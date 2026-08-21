// Lloyd relaxation for better nation distribution
export function lloydRelaxation(
  seeds: Array<{ col: number; row: number }>,
  iterations: number = 7
): Array<{ col: number; row: number }> {
  let currentSeeds = [...seeds];

  for (let iter = 0; iter < iterations; iter++) {
    const newSeeds = currentSeeds.map((seed, idx) => {
      // Find centroid of Voronoi region
      let sumCol = 0;
      let sumRow = 0;
      let count = 0;

      // Sample points in region (simplified - just check nearby)
      for (let dr = -20; dr <= 20; dr++) {
        for (let dc = -20; dc <= 20; dc++) {
          const testCol = seed.col + dc;
          const testRow = seed.row + dr;

          // Find closest seed to this point
          let minDist = Infinity;
          let closestIdx = 0;
          
          for (let i = 0; i < currentSeeds.length; i++) {
            const dist = Math.sqrt(
              Math.pow(testCol - currentSeeds[i].col, 2) +
              Math.pow(testRow - currentSeeds[i].row, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              closestIdx = i;
            }
          }

          // If this point belongs to current seed
          if (closestIdx === idx) {
            sumCol += testCol;
            sumRow += testRow;
            count++;
          }
        }
      }

      // Move seed toward centroid
      if (count > 0) {
        return {
          col: Math.round(sumCol / count),
          row: Math.round(sumRow / count),
        };
      }
      return seed;
    });

    currentSeeds = newSeeds;
  }

  return currentSeeds;
}

// Calculate realistic border ownership with noise warping
export function calculateBorderOwnership(
  hexCol: number,
  hexRow: number,
  nationSeeds: Array<{ nationId: string; col: number; row: number }>,
  borderNoise: (x: number, y: number) => number,
  elevation: number,
  isRiver: boolean,
  nearWater: boolean
): string | null {
  if (nationSeeds.length === 0) return null;

  let bestOwner: string | null = null;
  let bestScore = Infinity;

  for (const seed of nationSeeds) {
    // Hex distance (Manhattan on hex grid)
    const rawDist = Math.abs(hexCol - seed.col) + Math.abs(hexRow - seed.row);

    // Noise warp for irregular borders
    const noiseOffset = borderNoise(hexCol * 0.032, hexRow * 0.032) * 6;

    // Terrain modifiers
    const mountainDefense = elevation > 0.75 ? 4 : 0;
    const riverDefense = isRiver ? 2.5 : 0;
    const coastPull = nearWater ? -1.8 : 0;

    const score = rawDist - noiseOffset + mountainDefense + riverDefense + coastPull;

    if (score < bestScore) {
      bestScore = score;
      bestOwner = seed.nationId;
    }
  }

  return bestOwner;
}

/** Cost to enter a biome. Plains/coasts/valleys are cheap; mountains/desert/jungle are not. */
export function colonizationCost(biome: string, elevation: number, nearWater: boolean, isRiver: boolean): number {
  let c = 1.35;
  switch (biome) {
    case 'grassland':
    case 'temperate_grassland':
    case 'flooded_grassland':
    case 'beach':
      c = 0.72;
      break;
    case 'savanna':
    case 'woody_savanna':
    case 'shrubland':
    case 'alpine_meadow':
      c = 0.95;
      break;
    case 'mixed_forest':
    case 'deciduous_forest':
    case 'salt_marsh':
    case 'rocky_coast':
      c = 1.15;
      break;
    case 'evergreen_forest':
    case 'temperate_rainforest':
      c = 1.55;
      break;
    case 'tropical_rainforest':
    case 'boreal_forest':
    case 'swamp':
    case 'marsh':
    case 'wetland':
    case 'peat_bog':
    case 'mangrove':
      c = 2.25;
      break;
    case 'hot_desert':
    case 'semi_arid_desert':
    case 'cold_desert':
    case 'barren':
    case 'badlands':
    case 'karst':
      c = 2.5;
      break;
    case 'rocky_mountain':
    case 'sparse_vegetation':
      c = 3.1;
      break;
    case 'tundra':
    case 'arctic_tundra':
    case 'snow_ice':
      c = 3.4;
      break;
    case 'glacier':
    case 'ice_shelf':
      c = 6;
      break;
    case 'river':
      c = 0.8;
      break;
    case 'shallow_sea':
      c = 9;
      break;
    default:
      c = 1.4;
  }
  if (elevation > 0.78) c += 1.6;
  else if (elevation > 0.68) c += 0.7;
  if (nearWater && c < 2) c *= 0.82;
  if (isRiver && biome !== 'river') c *= 0.88;
  return c;
}

type ColonizeCell = {
  index: number;
  col: number;
  row: number;
  biome: string;
  normalized: number;
  nearWater: boolean;
  isRiver: boolean;
  neighbors: number[];
};

type ColonizeSeed = {
  nationId: string;
  startIndex: number;
  capacity: number;
};

/**
 * Grow nations along easy land (valleys, coasts, grassland) instead of
 * Manhattan diamonds. Cheapest unclaimed cells go first; mountains/jungle last.
 */
export function colonizeFromCapitals(
  cells: ColonizeCell[],
  seeds: ColonizeSeed[],
  isWater: (biome: string) => boolean,
  noise?: (i: number) => number
): Map<number, string> {
  const owner = new Map<number, string>();
  if (!cells.length || !seeds.length) return owner;

  const byIndex = new Map<number, ColonizeCell>();
  for (const c of cells) byIndex.set(c.index, c);

  const cap = new Map(seeds.map(s => [s.nationId, Math.max(1, Math.floor(s.capacity))]));
  const used = new Map<string, number>();
  const heap: Array<[number, string, number]> = []; // cost, nation, cell

  const heapPush = (c: number, nationId: string, i: number) => {
    heap.push([c, nationId, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      const t = heap[p]; heap[p] = heap[k]; heap[k] = t;
      k = p;
    }
  };
  const heapPop = (): [number, string, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        let m = k;
        const l = k * 2 + 1;
        const r = l + 1;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        const t = heap[k]; heap[k] = heap[m]; heap[m] = t;
        k = m;
      }
    }
    return top;
  };

  const mapCols = 505;
  const enqueue = (from: ColonizeCell, nationId: string, base: number) => {
    for (const ni of from.neighbors || []) {
      if (owner.has(ni)) continue;
      const nxt = byIndex.get(ni);
      if (!nxt) continue;
      if (isWater(nxt.biome) && nxt.biome !== 'river') continue;
      const jitter = noise ? 0.85 + 0.3 * ((noise(ni) + 1) / 2) : 1;
      let step = colonizationCost(nxt.biome, nxt.normalized, nxt.nearWater, nxt.isRiver) * jitter;
      const dc = Math.abs(from.col - nxt.col);
      if (dc > mapCols * 0.5) {
        const lat = Math.abs(from.row / 284 - 0.5) * 2;
        step += 10 + lat * 18;
      }
      heapPush(base + step, nationId, ni);
    }
  };

  for (const seed of seeds) {
    const start = byIndex.get(seed.startIndex);
    if (!start || owner.has(seed.startIndex)) continue;
    if (isWater(start.biome) && start.biome !== 'river') continue;
    owner.set(seed.startIndex, seed.nationId);
    used.set(seed.nationId, 1);
    enqueue(start, seed.nationId, 0);
  }

  while (heap.length) {
    const [cost, nationId, idx] = heapPop();
    if (owner.has(idx)) continue;
    const have = used.get(nationId) || 0;
    if (have >= (cap.get(nationId) || 0)) continue;
    const cell = byIndex.get(idx);
    if (!cell) continue;
    owner.set(idx, nationId);
    used.set(nationId, have + 1);
    enqueue(cell, nationId, cost);
  }

  return owner;
}
