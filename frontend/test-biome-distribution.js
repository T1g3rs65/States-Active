// Test script to analyze biome distribution
// This simulates the world map generation and counts biomes

class SimplexNoise {
  constructor(seed) {
    this.seed = seed;
    this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                   [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                   [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    this.p = [];
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(this.seededRandom(seed + i) * 256);
    }
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  dot(g, x, y) {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    
    let n0, n1, n2;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70.0 * (n0 + n1 + n2);
  }

  fbm(x, y, octaves, persistence) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return total / maxValue;
  }

  ridged(x, y, octaves) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise2D(x * frequency, y * frequency));
      const ridged = 1.0 - n;
      total += ridged * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return total / maxValue;
  }
}

const MAP_COLS = 200;
const MAP_ROWS = 200;
const WORLD_SEED = 123456;

console.log('Generating world map with biome distribution analysis...\n');

const noise = new SimplexNoise(WORLD_SEED);
const territories = [];

// PASS 1: Generate raw elevation
const rawElevations = [];
let minElev = Infinity;
let maxElev = -Infinity;

for (let row = 0; row < MAP_ROWS; row++) {
  for (let col = 0; col < MAP_COLS; col++) {
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

console.log(`Elevation range: ${minElev.toFixed(2)} to ${maxElev.toFixed(2)}`);

// PASS 2: Create territories with normalized elevation
let idx = 0;
for (let row = 0; row < MAP_ROWS; row++) {
  for (let col = 0; col < MAP_COLS; col++) {
    const normalized = (rawElevations[idx] - minElev) / (maxElev - minElev);
    const moisture = noise.fbm((col + 2000) / 20, (row + 2000) / 25, 5, 0.85);
    const latitude = Math.abs((row - MAP_ROWS / 2) / (MAP_ROWS / 2));
    const desertLat = Math.exp(-Math.pow((latitude - 0.33), 2) / 0.015);
    const finalMoisture = (moisture + 1) * 0.5 - (desertLat * 0.4);
    
    territories.push({
      col,
      row,
      normalized,
      moisture: finalMoisture,
      biome: 'temperate_grassland'
    });
    
    idx++;
  }
}

// Generate rivers (simplified - just mark some territories)
const finalRivers = new Set();
const mountainSources = territories
  .filter(t => {
    const base = noise.fbm(t.col / 100, t.row / 100, 6, 0.5) * 0.6;
    const ridges = Math.pow(noise.ridged(t.col * 0.02, t.row * 0.02, 5), 1.8) * 0.75;
    const directional = noise.noise2D(t.col * 0.005, t.row * 0.12) * 0.3;
    const elev = base + ridges + directional - 0.1;
    return elev > 0.8 && elev < 1.5;
  })
  .sort(() => Math.random() - 0.5)
  .slice(0, 30);

for (const source of mountainSources) {
  let current = source;
  const visited = new Set();
  let steps = 0;
  const maxSteps = 200;
  
  while (steps < maxSteps) {
    if (visited.has(`${current.col}-${current.row}`)) break;
    visited.add(`${current.col}-${current.row}`);
    finalRivers.add(`${current.col}-${current.row}`);
    
    const currElev = noise.fbm(current.col / 100, current.row / 100, 6, 0.5) * 0.6 +
                    Math.pow(noise.ridged(current.col * 0.02, current.row * 0.02, 5), 1.8) * 0.75 +
                    noise.noise2D(current.col * 0.005, current.row * 0.12) * 0.3 - 0.1;
    
    if (currElev < 0.05) break;
    
    const neighbors = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
      [1, -1], [-1, -1], [1, 1], [-1, 1]
    ];
    
    let lowestNeighbor = null;
    let lowestElev = currElev;
    
    for (const [dc, dr] of neighbors) {
      const neighbor = territories.find(
        t => t.col === current.col + dc && t.row === current.row + dr
      );
      
      if (!neighbor || visited.has(`${neighbor.col}-${neighbor.row}`)) continue;
      
      const nElev = noise.fbm(neighbor.col / 100, neighbor.row / 100, 6, 0.5) * 0.6 +
                   Math.pow(noise.ridged(neighbor.col * 0.02, neighbor.row * 0.02, 5), 1.8) * 0.75 +
                   noise.noise2D(neighbor.col * 0.005, neighbor.row * 0.12) * 0.3 - 0.1;
      
      if (nElev < lowestElev) {
        lowestElev = nElev;
        lowestNeighbor = neighbor;
      }
    }
    
    if (!lowestNeighbor) break;
    current = lowestNeighbor;
    steps++;
  }
}

// STEP 3: Assign biomes (exact same logic as world-map.tsx)
for (const territory of territories) {
  const { col, row } = territory;
  
  const base = noise.fbm(col / 100, row / 100, 6, 0.5) * 0.6;
  const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.75;
  const directional = noise.noise2D(col * 0.005, row * 0.12) * 0.3;
  const elevation = base + ridges + directional;
  
  const moisture = territory.moisture || 0.5;
  const latitude = Math.abs((row - MAP_ROWS / 2) / (MAP_ROWS / 2));
  
  let biome = 'temperate_grassland';
  
  // OCEANS
  if (territory.normalized < 0.25) {
    biome = 'abyss';
  } else if (territory.normalized < 0.30) {
    biome = 'midnight_zone';
  } else if (territory.normalized < 0.35) {
    biome = 'deep_ocean';
  } else if (territory.normalized < 0.45) {
    biome = 'shallow_sea';
  }
  // POLAR ICE
  else if (latitude > 0.9) {
    if (elevation > 0.6) {
      biome = 'glacier';
    } else if (elevation > 0.4) {
      biome = 'snow_ice';
    } else if (elevation > 0.2) {
      biome = 'ice_shelf';
    } else {
      biome = 'arctic_tundra';
    }
  } else if (latitude > 0.90) {
    biome = 'tundra';
  }
  // MOUNTAINS
  else if (territory.normalized > 0.92) {
    biome = 'rocky_mountain';
  } else if (territory.normalized > 0.88) {
    biome = 'alpine_meadow';
  }
  // HIGH MOUNTAINS
  else if (elevation > 0.8) {
    if (latitude > 0.7) {
      biome = 'boreal_forest';
    } else if (moisture < 0.1) {
      biome = 'badlands';
    } else if (moisture > 0.5) {
      biome = 'karst';
    } else {
      biome = 'sparse_vegetation';
    }
  }
  // COASTAL
  else if (elevation < 0.25 && elevation > 0.15) {
    const nearOcean = noise.noise2D(col / 3, row / 3) > 0.3;
    if (nearOcean) {
      if (moisture > 0.5) {
        biome = 'salt_marsh';
      } else if (moisture > 0.2) {
        biome = 'beach';
      } else {
        biome = 'rocky_coast';
      }
    } else {
      biome = 'flooded_grassland';
    }
  }
  // WETLANDS
  else if (elevation < 0.35 && moisture > 0.6) {
    if (latitude < 0.2) {
      biome = 'swamp';
    } else if (latitude < 0.35) {
      biome = 'mangrove';
    } else if (latitude < 0.5) {
      biome = 'marsh';
    } else {
      biome = 'peat_bog';
    }
  } else if (elevation < 0.25 && moisture > 0.5) {
    biome = 'wetland';
  }
  // FORESTS
  else if (moisture > 0.40) {
    if (latitude < 0.15) {
      biome = 'tropical_rainforest';
    } else if (latitude > 0.70) {
      biome = 'boreal_forest';
    } else if (moisture > 0.60) {
      biome = 'temperate_rainforest';
    } else if (moisture > 0.45) {
      biome = 'evergreen_forest';
    } else {
      biome = 'deciduous_forest';
    }
  } else if (moisture > 0.35) {
    biome = 'mixed_forest';
  }
  // DESERTS
  else if (moisture < 0.15) {
    if (latitude > 0.7) {
      biome = 'cold_desert';
    } else if (latitude > 0.35 && latitude < 0.5) {
      if (elevation > 0.5) {
        biome = 'hot_desert';
      } else if (moisture < 0.03) {
        biome = 'savanna';
      } else {
        biome = 'semi_arid_desert';
      }
    } else if (elevation > 0.6) {
      biome = 'barren';
    } else {
      const useSavanna = noise.noise2D(col / 3, row / 3) > 0.2;
      biome = useSavanna ? 'savanna' : 'semi_arid_desert';
    }
  }
  // GRASSLANDS & SAVANNAS
  else if (moisture > 0.05) {
    if (latitude < 0.35 && moisture < 0.22) {
      biome = 'woody_savanna';
    } else if (moisture < 0.25) {
      biome = 'shrubland';
    } else if (moisture < 0.28 && latitude < 0.45) {
      biome = 'savanna';
    } else if (moisture > 0.22) {
      biome = 'grassland';
    } else {
      biome = 'temperate_grassland';
    }
  }
  // DEFAULT
  else {
    biome = 'grassland';
  }
  
  // RIVERS OVERLAY
  const isRiver = finalRivers.has(`${territory.col}-${territory.row}`);
  if (isRiver) {
    biome = 'river';
  }
  
  territory.biome = biome;
}

// Count biomes
const biomeCounts = {};
for (const territory of territories) {
  biomeCounts[territory.biome] = (biomeCounts[territory.biome] || 0) + 1;
}

// Calculate percentages
const totalHexagons = territories.length;
const landHexagons = territories.filter(t => 
  !['deep_ocean', 'shallow_sea', 'abyss', 'midnight_zone'].includes(t.biome)
).length;

console.log('\n=== BIOME DISTRIBUTION ===\n');
console.log(`Total hexagons: ${totalHexagons}`);
console.log(`Land hexagons: ${landHexagons} (${(landHexagons/totalHexagons*100).toFixed(1)}%)`);
console.log(`Ocean hexagons: ${totalHexagons - landHexagons} (${((totalHexagons-landHexagons)/totalHexagons*100).toFixed(1)}%)\n`);

// Group by category
const forests = {
  boreal_forest: biomeCounts['boreal_forest'] || 0,
  evergreen_forest: biomeCounts['evergreen_forest'] || 0,
  deciduous_forest: biomeCounts['deciduous_forest'] || 0,
  mixed_forest: biomeCounts['mixed_forest'] || 0,
  tropical_rainforest: biomeCounts['tropical_rainforest'] || 0,
  temperate_rainforest: biomeCounts['temperate_rainforest'] || 0,
};

const grasslands = {
  grassland: biomeCounts['grassland'] || 0,
  temperate_grassland: biomeCounts['temperate_grassland'] || 0,
  savanna: biomeCounts['savanna'] || 0,
  woody_savanna: biomeCounts['woody_savanna'] || 0,
  shrubland: biomeCounts['shrubland'] || 0,
};

const deserts = {
  hot_desert: biomeCounts['hot_desert'] || 0,
  semi_arid_desert: biomeCounts['semi_arid_desert'] || 0,
  cold_desert: biomeCounts['cold_desert'] || 0,
  barren: biomeCounts['barren'] || 0,
};

console.log('=== FORESTS (Target: 32% of land) ===');
let forestTotal = 0;
for (const [biome, count] of Object.entries(forests)) {
  const pct = (count / landHexagons * 100).toFixed(2);
  console.log(`  ${biome}: ${count} (${pct}%)`);
  forestTotal += count;
}
console.log(`  TOTAL FORESTS: ${forestTotal} (${(forestTotal/landHexagons*100).toFixed(2)}%)`);
console.log(`  TARGET: ${(landHexagons * 0.32).toFixed(0)} hexagons (32%)`);
console.log(`  DIFFERENCE: ${(forestTotal - landHexagons * 0.32).toFixed(0)} hexagons\n`);

console.log('=== GRASSLANDS/SAVANNAS (Target: 41% of land) ===');
let grasslandTotal = 0;
for (const [biome, count] of Object.entries(grasslands)) {
  const pct = (count / landHexagons * 100).toFixed(2);
  console.log(`  ${biome}: ${count} (${pct}%)`);
  grasslandTotal += count;
}
console.log(`  TOTAL GRASSLANDS: ${grasslandTotal} (${(grasslandTotal/landHexagons*100).toFixed(2)}%)`);
console.log(`  TARGET: ${(landHexagons * 0.41).toFixed(0)} hexagons (41%)`);
console.log(`  DIFFERENCE: ${(grasslandTotal - landHexagons * 0.41).toFixed(0)} hexagons\n`);

console.log('=== DESERTS (Part of "Other" 27%) ===');
let desertTotal = 0;
for (const [biome, count] of Object.entries(deserts)) {
  const pct = (count / landHexagons * 100).toFixed(2);
  console.log(`  ${biome}: ${count} (${pct}%)`);
  desertTotal += count;
}
console.log(`  TOTAL DESERTS: ${desertTotal} (${(desertTotal/landHexagons*100).toFixed(2)}%)\n`);

console.log('=== TARGET BREAKDOWN ===');
console.log('Forests (32%):');
console.log(`  - Evergreen Needleleaf (boreal_forest): 12% = ${(landHexagons * 0.12).toFixed(0)} hexagons`);
console.log(`  - Evergreen Broadleaf (evergreen_forest): 9% = ${(landHexagons * 0.09).toFixed(0)} hexagons`);
console.log(`  - Deciduous Broadleaf (deciduous_forest): 7% = ${(landHexagons * 0.07).toFixed(0)} hexagons`);
console.log(`  - Mixed/Deciduous Needle (mixed_forest): 4% = ${(landHexagons * 0.04).toFixed(0)} hexagons`);
console.log('\nGrasslands/Savannas (41%):');
console.log(`  - Grassland (grassland + temperate_grassland): 17% = ${(landHexagons * 0.17).toFixed(0)} hexagons`);
console.log(`  - Savanna: 10% = ${(landHexagons * 0.10).toFixed(0)} hexagons`);
console.log(`  - Woody Savanna: 5% = ${(landHexagons * 0.05).toFixed(0)} hexagons`);
console.log(`  - Shrubland: 9% = ${(landHexagons * 0.09).toFixed(0)} hexagons`);
console.log('\nOther (27%): Deserts, tundra, wetland, mountains, etc.\n');

console.log('=== CURRENT VS TARGET ===');
console.log(`Boreal Forest: ${forests.boreal_forest} (${(forests.boreal_forest/landHexagons*100).toFixed(2)}%) vs Target 12% (${(landHexagons * 0.12).toFixed(0)})`);
console.log(`Evergreen Forest: ${forests.evergreen_forest} (${(forests.evergreen_forest/landHexagons*100).toFixed(2)}%) vs Target 9% (${(landHexagons * 0.09).toFixed(0)})`);
console.log(`Deciduous Forest: ${forests.deciduous_forest} (${(forests.deciduous_forest/landHexagons*100).toFixed(2)}%) vs Target 7% (${(landHexagons * 0.07).toFixed(0)})`);
console.log(`Mixed Forest: ${forests.mixed_forest} (${(forests.mixed_forest/landHexagons*100).toFixed(2)}%) vs Target 4% (${(landHexagons * 0.04).toFixed(0)})`);
console.log(`Grassland (combined): ${grasslands.grassland + grasslands.temperate_grassland} (${((grasslands.grassland + grasslands.temperate_grassland)/landHexagons*100).toFixed(2)}%) vs Target 17% (${(landHexagons * 0.17).toFixed(0)})`);
console.log(`Savanna: ${grasslands.savanna} (${(grasslands.savanna/landHexagons*100).toFixed(2)}%) vs Target 10% (${(landHexagons * 0.10).toFixed(0)})`);
console.log(`Woody Savanna: ${grasslands.woody_savanna} (${(grasslands.woody_savanna/landHexagons*100).toFixed(2)}%) vs Target 5% (${(landHexagons * 0.05).toFixed(0)})`);
console.log(`Shrubland: ${grasslands.shrubland} (${(grasslands.shrubland/landHexagons*100).toFixed(2)}%) vs Target 9% (${(landHexagons * 0.09).toFixed(0)})`);

console.log('\n=== ALL BIOMES ===');
const sortedBiomes = Object.entries(biomeCounts).sort((a, b) => b[1] - a[1]);
for (const [biome, count] of sortedBiomes) {
  const pct = (count / totalHexagons * 100).toFixed(2);
  const landPct = (count / landHexagons * 100).toFixed(2);
  console.log(`${biome}: ${count} (${pct}% of total, ${landPct}% of land)`);
}
