import { SimplexNoise } from './noise';

const WORLD_SEED = 123456; // Match world map seed
const MAP_ROWS = 200; // Match world map

export interface BiomeCount {
  deep_ocean: number;
  shallow_sea: number;
  evergreen_forest: number;
  deciduous_forest: number;
  mixed_forest: number;
  shrubland: number;
  grassland: number;
  savanna: number;
  woody_savanna: number;
  wetland: number;
  mangrove: number;
  barren: number;
  sparse_vegetation: number;
  snow_ice: number;
  tundra: number;
}

export function calculateTerritoryBiomes(
  centerCol: number,
  centerRow: number,
  clusterSize: number = 5
): BiomeCount {
  const noise = new SimplexNoise(WORLD_SEED);
  const counts: BiomeCount = {
    deep_ocean: 0,
    shallow_sea: 0,
    evergreen_forest: 0,
    deciduous_forest: 0,
    mixed_forest: 0,
    shrubland: 0,
    grassland: 0,
    savanna: 0,
    woody_savanna: 0,
    wetland: 0,
    mangrove: 0,
    barren: 0,
    sparse_vegetation: 0,
    snow_ice: 0,
    tundra: 0,
  };

  // Check all territories in the cluster (same logic as world map)
  for (let dr = -clusterSize; dr <= clusterSize; dr++) {
    for (let dc = -clusterSize; dc <= clusterSize; dc++) {
      if (dr * dr + dc * dc > clusterSize * clusterSize) continue;
      
      const col = centerCol + dc;
      const row = centerRow + dr;
      
      // 2-layer Perlin noise (same as world map)
      const elevation = noise.noise2D(col / 15, row / 15);
      const moisture = noise.noise2D((col + 500) / 20, (row + 500) / 20);

      let biome: keyof BiomeCount = 'grassland';

      // Ocean (elevation based)
      if (elevation < -0.25) {
        biome = 'deep_ocean';
      } else if (elevation < -0.05) {
        biome = 'shallow_sea';
      }
      // Ice/Snow (polar regions)
      else if (row < 15 || row > MAP_ROWS - 15) {
        if (elevation > 0.3) {
          biome = 'snow_ice';
        } else {
          biome = 'tundra';
        }
      }
      // Forests (high moisture + land)
      else if (moisture > 0.35 && elevation > 0) {
        biome = 'evergreen_forest';
      } else if (moisture > 0.25 && elevation > -0.05) {
        biome = 'deciduous_forest';
      } else if (moisture > 0.15 && elevation > -0.05) {
        biome = 'mixed_forest';
      }
      // Wetlands (low elevation + moisture)
      else if (elevation < 0.05 && moisture > 0.3) {
        if (row > 60 && row < 100) {
          biome = 'mangrove';
        } else {
          biome = 'wetland';
        }
      }
      // Deserts/Barren (low moisture)
      else if (moisture < -0.25) {
        if (elevation > 0.4) {
          biome = 'sparse_vegetation';
        } else {
          biome = 'barren';
        }
      }
      // Grasslands
      else if (moisture < 0.05) {
        biome = 'savanna';
      } else if (moisture < 0.15) {
        biome = 'woody_savanna';
      } else if (moisture > 0.05) {
        biome = 'shrubland';
      } else {
        biome = 'grassland';
      }
      
      // Count only claimable biomes (exclude oceans and ice)
      if (biome !== 'deep_ocean' && biome !== 'shallow_sea' && biome !== 'snow_ice') {
        counts[biome]++;
      }
    }
  }

  return counts;
}

export function getBiomePieChartData(biomeCount: BiomeCount) {
  // Calculate total claimable territories
  const total = Object.entries(biomeCount)
    .filter(([key]) => key !== 'deep_ocean' && key !== 'shallow_sea' && key !== 'snow_ice')
    .reduce((sum, [_, count]) => sum + count, 0);
  
  if (total === 0) {
    return [];
  }
  
  const data = [];
  const biomeColors: Record<string, { name: string; color: string }> = {
    evergreen_forest: { name: 'Evergreen Forest', color: '#05450a' },
    deciduous_forest: { name: 'Deciduous Forest', color: '#78d203' },
    mixed_forest: { name: 'Mixed Forest', color: '#009900' },
    shrubland: { name: 'Shrubland', color: '#BFBB22' },
    grassland: { name: 'Grassland', color: '#b6ff05' },
    savanna: { name: 'Savanna', color: '#fbff13' },
    woody_savanna: { name: 'Woody Savanna', color: '#dade48' },
    wetland: { name: 'Wetland', color: '#27ff87' },
    mangrove: { name: 'Mangrove', color: '#00CF75' },
    barren: { name: 'Barren', color: '#f9ffa4' },
    sparse_vegetation: { name: 'Sparse Vegetation', color: '#B4B4B4' },
    tundra: { name: 'Tundra', color: '#F6E2A0' },
  };
  
  // Add only biomes that exist in the territory
  for (const [biomeKey, info] of Object.entries(biomeColors)) {
    const count = biomeCount[biomeKey as keyof BiomeCount];
    if (count > 0) {
      data.push({
        name: info.name,
        population: count, // Actual tile count, not percentage
        color: info.color,
        legendFontColor: '#CBD5E1',
        legendFontSize: 11,
      });
    }
  }
  
  return data;
}
