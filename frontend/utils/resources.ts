/**
 * Industry & Resource System for Emergent Realms
 * Resources are assigned per-tile based on biome, tied to world seed
 */

export type ResourceTier = 'common' | 'uncommon' | 'rare';

export interface ResourceDefinition {
  id: string;
  name: string;
  tier: ResourceTier;
  value: number; // Relative value multiplier
  validBiomes: string[];
  spawnChance: number; // Base chance within valid biome (0-1)
  icon: string; // Ionicons name
  color: string; // Display color
  description: string;
}

// Resource definitions with biome mappings (volcanic-free, lake-free)
export const RESOURCES: ResourceDefinition[] = [
  // ============ COMMON TIER (1x value) ============
  {
    id: 'fish',
    name: 'Fish',
    tier: 'common',
    value: 1,
    validBiomes: ['shallow_sea', 'deep_ocean', 'river'],
    spawnChance: 0.35,
    icon: 'fish',
    color: '#3B82F6',
    description: 'Abundant seafood from coastal and river waters'
  },
  {
    id: 'timber',
    name: 'Timber',
    tier: 'common',
    value: 1,
    validBiomes: ['evergreen_forest', 'mixed_forest', 'deciduous_forest', 'boreal_forest', 'tropical_rainforest'],
    spawnChance: 0.40,
    icon: 'leaf',
    color: '#22C55E',
    description: 'Quality wood for construction and manufacturing'
  },
  {
    id: 'wheat',
    name: 'Wheat / Grain',
    tier: 'common',
    value: 1,
    validBiomes: ['grassland', 'temperate_grassland'],
    spawnChance: 0.45,
    icon: 'nutrition',
    color: '#EAB308',
    description: 'Staple crop for feeding the population'
  },
  {
    id: 'cattle',
    name: 'Cattle / Meat',
    tier: 'common',
    value: 1,
    validBiomes: ['grassland', 'savanna', 'woody_savanna'],
    spawnChance: 0.35,
    icon: 'paw',
    color: '#92400E',
    description: 'Livestock for meat and dairy production'
  },
  {
    id: 'rice',
    name: 'Rice',
    tier: 'common',
    value: 1,
    validBiomes: ['wetland', 'flooded_grassland', 'mangrove'],
    spawnChance: 0.40,
    icon: 'restaurant',
    color: '#84CC16',
    description: 'Essential grain crop from wetland paddies'
  },
  {
    id: 'salt',
    name: 'Salt',
    tier: 'common',
    value: 1,
    validBiomes: ['salt_marsh', 'barren'],
    spawnChance: 0.50,
    icon: 'water',
    color: '#F8FAFC',
    description: 'Mineral essential for food preservation'
  },
  {
    id: 'stone',
    name: 'Stone / Granite',
    tier: 'common',
    value: 1,
    validBiomes: ['rocky_mountain', 'rocky_coast', 'karst', 'badlands'],
    spawnChance: 0.45,
    icon: 'cube',
    color: '#78716C',
    description: 'Building material from quarries'
  },
  {
    id: 'coal',
    name: 'Coal / Peat',
    tier: 'common',
    value: 1,
    validBiomes: ['swamp', 'peat_bog', 'boreal_forest'],
    spawnChance: 0.30,
    icon: 'flame',
    color: '#1C1917',
    description: 'Fossil fuel for energy production'
  },
  {
    id: 'iron',
    name: 'Iron Ore',
    tier: 'common',
    value: 1,
    validBiomes: ['rocky_mountain', 'sparse_vegetation', 'badlands'],
    spawnChance: 0.25,
    icon: 'hammer',
    color: '#71717A',
    description: 'Essential metal for industry and military'
  },
  {
    id: 'copper',
    name: 'Copper Ore',
    tier: 'common',
    value: 1,
    validBiomes: ['badlands', 'rocky_mountain'],
    spawnChance: 0.25,
    icon: 'flash',
    color: '#F97316',
    description: 'Conductive metal for electronics'
  },
  
  // ============ UNCOMMON TIER (2-3x value) ============
  {
    id: 'olive_oil',
    name: 'Olive Oil',
    tier: 'uncommon',
    value: 2,
    validBiomes: ['shrubland'],
    spawnChance: 0.20,
    icon: 'cafe',
    color: '#65A30D',
    description: 'Premium cooking oil and export good'
  },
  {
    id: 'wine',
    name: 'Wine',
    tier: 'uncommon',
    value: 2.5,
    validBiomes: ['shrubland'],
    spawnChance: 0.15,
    icon: 'wine',
    color: '#7C3AED',
    description: 'Luxury beverage from vineyards'
  },
  {
    id: 'cotton',
    name: 'Cotton',
    tier: 'uncommon',
    value: 2,
    validBiomes: ['semi_arid_desert'],
    spawnChance: 0.25,
    icon: 'cloudy',
    color: '#E5E7EB',
    description: 'Natural fiber for textile industry'
  },
  {
    id: 'wool',
    name: 'Wool',
    tier: 'uncommon',
    value: 2,
    validBiomes: ['temperate_grassland', 'cold_desert'],
    spawnChance: 0.20,
    icon: 'shirt',
    color: '#FEF3C7',
    description: 'Warm fiber from sheep farming'
  },
  {
    id: 'seafood',
    name: 'Shrimp / Seafood',
    tier: 'uncommon',
    value: 2,
    validBiomes: ['mangrove', 'shallow_sea'],
    spawnChance: 0.18,
    icon: 'fish',
    color: '#FB7185',
    description: 'Premium shellfish and crustaceans'
  },
  {
    id: 'hardwood',
    name: 'Hardwood',
    tier: 'uncommon',
    value: 2.5,
    validBiomes: ['tropical_rainforest', 'temperate_rainforest'],
    spawnChance: 0.15,
    icon: 'leaf',
    color: '#713F12',
    description: 'Rare tropical lumber for fine crafts'
  },
  {
    id: 'rubber',
    name: 'Rubber',
    tier: 'uncommon',
    value: 3,
    validBiomes: ['tropical_rainforest'],
    spawnChance: 0.12,
    icon: 'ellipse',
    color: '#1E1B4B',
    description: 'Natural latex for manufacturing'
  },
  {
    id: 'geothermal',
    name: 'Geothermal Energy',
    tier: 'uncommon',
    value: 3,
    validBiomes: ['rocky_mountain', 'alpine_meadow'],
    spawnChance: 0.10,
    icon: 'thermometer',
    color: '#DC2626',
    description: 'Clean energy from underground heat'
  },
  {
    id: 'solar',
    name: 'Solar Potential',
    tier: 'uncommon',
    value: 2.5,
    validBiomes: ['hot_desert', 'semi_arid_desert'],
    spawnChance: 0.20,
    icon: 'sunny',
    color: '#FBBF24',
    description: 'Renewable energy from intense sunlight'
  },
  {
    id: 'tourism',
    name: 'Tourism',
    tier: 'uncommon',
    value: 3,
    validBiomes: ['beach', 'alpine_meadow', 'rocky_coast'],
    spawnChance: 0.25,
    icon: 'camera',
    color: '#06B6D4',
    description: 'Natural beauty attracting visitors'
  },
  
  // ============ RARE TIER (4-10x value) ============
  {
    id: 'oil',
    name: 'Oil',
    tier: 'rare',
    value: 5,
    validBiomes: ['arctic_tundra', 'deep_ocean'],
    spawnChance: 0.03,
    icon: 'water',
    color: '#0F172A',
    description: 'Black gold - petroleum reserves'
  },
  {
    id: 'natural_gas',
    name: 'Natural Gas',
    tier: 'rare',
    value: 4.5,
    validBiomes: ['tundra', 'arctic_tundra'],
    spawnChance: 0.04,
    icon: 'flame',
    color: '#60A5FA',
    description: 'Clean-burning fossil fuel'
  },
  {
    id: 'gold',
    name: 'Gold',
    tier: 'rare',
    value: 6,
    validBiomes: ['rocky_mountain'],
    spawnChance: 0.02,
    icon: 'diamond',
    color: '#FCD34D',
    description: 'Precious metal for currency and luxury'
  },
  {
    id: 'diamonds',
    name: 'Diamonds',
    tier: 'rare',
    value: 7,
    validBiomes: ['tundra', 'badlands'],
    spawnChance: 0.015,
    icon: 'diamond',
    color: '#E0F2FE',
    description: 'Sparkling gems of immense value'
  },
  {
    id: 'silver',
    name: 'Silver',
    tier: 'rare',
    value: 5,
    validBiomes: ['rocky_mountain', 'badlands'],
    spawnChance: 0.025,
    icon: 'disc',
    color: '#CBD5E1',
    description: 'Precious metal for industry and jewelry'
  },
  {
    id: 'uranium',
    name: 'Uranium',
    tier: 'rare',
    value: 8,
    validBiomes: ['sparse_vegetation', 'cold_desert'],
    spawnChance: 0.01,
    icon: 'nuclear',
    color: '#4ADE80',
    description: 'Nuclear fuel for power generation'
  },
  {
    id: 'rare_earth',
    name: 'Rare Earth Elements',
    tier: 'rare',
    value: 9,
    validBiomes: ['rocky_mountain'],
    spawnChance: 0.008,
    icon: 'planet',
    color: '#A78BFA',
    description: 'Critical minerals for high-tech industry'
  },
  {
    id: 'lithium',
    name: 'Lithium',
    tier: 'rare',
    value: 8,
    validBiomes: ['cold_desert', 'barren'],
    spawnChance: 0.012,
    icon: 'battery-charging',
    color: '#818CF8',
    description: 'Essential for battery technology'
  },
  {
    id: 'sulfur',
    name: 'Sulfur',
    tier: 'rare',
    value: 4,
    validBiomes: ['swamp', 'peat_bog'],
    spawnChance: 0.03,
    icon: 'alert-circle',
    color: '#FACC15',
    description: 'Chemical compound for industry'
  },
  {
    id: 'amber',
    name: 'Amber',
    tier: 'rare',
    value: 5,
    validBiomes: ['boreal_forest'],
    spawnChance: 0.02,
    icon: 'sparkles',
    color: '#F59E0B',
    description: 'Fossilized tree resin - ancient treasure'
  },
  {
    id: 'truffles',
    name: 'Truffles',
    tier: 'rare',
    value: 6,
    validBiomes: ['temperate_rainforest', 'deciduous_forest'],
    spawnChance: 0.015,
    icon: 'nutrition',
    color: '#44403C',
    description: 'Culinary delicacy worth its weight in gold'
  },
  {
    id: 'saffron',
    name: 'Saffron',
    tier: 'rare',
    value: 10,
    validBiomes: ['semi_arid_desert'],
    spawnChance: 0.005,
    icon: 'flower',
    color: '#EF4444',
    description: 'Most expensive spice in the world'
  },
  {
    id: 'pearls',
    name: 'Pearls',
    tier: 'rare',
    value: 7,
    validBiomes: ['deep_ocean', 'shallow_sea'],
    spawnChance: 0.01,
    icon: 'ellipse',
    color: '#FDF4FF',
    description: 'Lustrous gems from the ocean depths'
  },
  {
    id: 'ivory',
    name: 'Ivory',
    tier: 'rare',
    value: 6,
    validBiomes: ['savanna', 'arctic_tundra'],
    spawnChance: 0.015,
    icon: 'skull',
    color: '#FFFBEB',
    description: 'Rare material from large mammals'
  },
  {
    id: 'spices',
    name: 'Spices / Medicines',
    tier: 'rare',
    value: 7,
    validBiomes: ['tropical_rainforest'],
    spawnChance: 0.02,
    icon: 'medkit',
    color: '#16A34A',
    description: 'Exotic herbs and medicinal plants'
  },
  {
    id: 'turquoise',
    name: 'Turquoise',
    tier: 'rare',
    value: 5,
    validBiomes: ['badlands'],
    spawnChance: 0.02,
    icon: 'diamond',
    color: '#2DD4BF',
    description: 'Beautiful blue-green gemstone'
  }
];

// Create lookup maps for quick access
export const RESOURCE_BY_ID = new Map<string, ResourceDefinition>(
  RESOURCES.map(r => [r.id, r])
);

export const RESOURCES_BY_BIOME = new Map<string, ResourceDefinition[]>();
RESOURCES.forEach(resource => {
  resource.validBiomes.forEach(biome => {
    if (!RESOURCES_BY_BIOME.has(biome)) {
      RESOURCES_BY_BIOME.set(biome, []);
    }
    RESOURCES_BY_BIOME.get(biome)!.push(resource);
  });
});

// Get all rare resources that need guaranteed spawning
export const RARE_RESOURCES = RESOURCES.filter(r => r.tier === 'rare');

/**
 * Seeded random number generator for deterministic resource placement
 */
export class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  // Simple LCG random generator
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  
  // Get random with specific seed offset for a tile
  nextForTile(col: number, row: number): number {
    const tileSeed = this.seed + col * 10000 + row;
    const tempSeed = (tileSeed * 1664525 + 1013904223) % 4294967296;
    return tempSeed / 4294967296;
  }
}

/**
 * Assign a resource to a tile based on its biome and seed
 * Returns null if no resource spawns on this tile
 */
export function assignResourceToTile(
  biome: string,
  col: number,
  row: number,
  worldSeed: number
): string | null {
  const validResources = RESOURCES_BY_BIOME.get(biome);
  if (!validResources || validResources.length === 0) {
    return null; // No resources can spawn in this biome
  }
  
  const rng = new SeededRandom(worldSeed);
  const tileRandom = rng.nextForTile(col, row);
  
  // Determine if ANY resource spawns (base 45% chance for land tiles)
  const baseSpawnChance = 0.22;
  if (tileRandom > baseSpawnChance) {
    return null;
  }

  const resourceRandom = rng.nextForTile(col + 1000, row + 1000);

  const sortedResources = [...validResources].sort((a, b) => {
    const tierOrder = { rare: 0, uncommon: 1, common: 2 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  let cumulative = 0;
  for (const resource of sortedResources) {
    cumulative += resource.spawnChance * 0.7;
    if (resourceRandom < cumulative) {
      return resource.id;
    }
  }

  return null;
}

/**
 * Calculate industry stats from territory resource data
 */
export interface NationIndustryStats {
  totalTiles: number;
  resourceTiles: number;
  resourceCounts: Record<string, number>;
  totalValue: number;
  gdpContribution: number;
  industryPercentOfGDP: number;
  topResources: Array<{ resource: ResourceDefinition; count: number; value: number }>;
  tierBreakdown: {
    common: { count: number; value: number };
    uncommon: { count: number; value: number };
    rare: { count: number; value: number };
  };
}

/**
 * Calculate realistic GDP from population and GDP stat (matching backend)
 */
function calculateRealisticGDP(populationThousands: number, gdpStat: number): number {
  const population = populationThousands * 1000;
  
  let gdpPerCapita: number;
  if (gdpStat < 20) {
    gdpPerCapita = 500 + (gdpStat / 20) * 4500;
  } else if (gdpStat < 40) {
    gdpPerCapita = 5000 + ((gdpStat - 20) / 20) * 10000;
  } else if (gdpStat < 70) {
    gdpPerCapita = 15000 + ((gdpStat - 40) / 30) * 35000;
  } else {
    gdpPerCapita = 50000 + ((gdpStat - 70) / 30) * 50000;
  }
  
  return population * gdpPerCapita;
}

export function calculateIndustryStats(
  resourceCounts: Record<string, number>,
  totalTiles: number,
  nationStats?: { population: number; gdp: number }
): NationIndustryStats {
  let totalValue = 0;
  let resourceTiles = 0;
  
  const tierBreakdown = {
    common: { count: 0, value: 0 },
    uncommon: { count: 0, value: 0 },
    rare: { count: 0, value: 0 }
  };
  
  const topResources: Array<{ resource: ResourceDefinition; count: number; value: number }> = [];
  
  for (const [resourceId, count] of Object.entries(resourceCounts)) {
    const resource = RESOURCE_BY_ID.get(resourceId);
    if (resource && count > 0) {
      const value = count * resource.value;
      totalValue += value;
      resourceTiles += count;
      
      tierBreakdown[resource.tier].count += count;
      tierBreakdown[resource.tier].value += value;
      
      topResources.push({ resource, count, value });
    }
  }
  
  // Sort by value descending
  topResources.sort((a, b) => b.value - a.value);
  
  // Calculate GDP contribution properly
  let gdpContribution = 0;
  let industryPercentOfGDP = 0;
  
  if (nationStats && nationStats.population > 0) {
    // Calculate actual GDP
    const actualGDP = calculateRealisticGDP(nationStats.population, nationStats.gdp);
    
    // Private sector is typically 50-80% of GDP (government is 20-50%)
    // We'll use 65% as a baseline private sector share
    const privateSectorShare = 0.65;
    const privateSectorGDP = actualGDP * privateSectorShare;
    
    // Industry/natural resources is a portion of the private sector
    // Base: 5% of private sector (even with no resources, there's some industry)
    // Max: 40% of private sector (resource-rich nations like Saudi Arabia, Norway)
    // Scale based on resource richness
    
    // Resource richness factor (0 to 1)
    const resourceDensity = totalTiles > 0 ? resourceTiles / totalTiles : 0;
    const rareBonus = tierBreakdown.rare.count * 0.02; // 2% bonus per rare tile
    const resourceRichness = Math.min(1, resourceDensity + rareBonus);
    
    // Industry % of private sector: 5% base + up to 35% based on resources
    const industryShareOfPrivate = 0.05 + (0.35 * resourceRichness);
    
    // GDP Contribution = Private Sector GDP × Industry Share
    gdpContribution = privateSectorGDP * industryShareOfPrivate;
    
    // Calculate what % of total GDP this represents
    industryPercentOfGDP = (gdpContribution / actualGDP) * 100;
  }
  
  return {
    totalTiles,
    resourceTiles,
    resourceCounts,
    totalValue,
    gdpContribution,
    industryPercentOfGDP,
    topResources,
    tierBreakdown
  };
}

// Tier colors for UI
export const TIER_COLORS = {
  common: '#94A3B8',
  uncommon: '#22C55E', 
  rare: '#F59E0B'
};

export const TIER_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare'
};
