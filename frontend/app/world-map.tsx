import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import Svg, { Polygon, G, Text as SvgText, Rect, Circle , SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SimplexNoise } from '../utils/noise';
import { api } from '../utils/api';
import { lloydRelaxation, calculateBorderOwnership } from '../utils/borders';
import { calculateCapacityFromPopulation } from '../utils/nationSize';
import { dijkstraExpansion } from '../utils/dijkstra';
import { assignResourceToTile, RESOURCE_BY_ID, TIER_COLORS } from '../utils/resources';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WORLD_SEED = 123456; // Constant seed for deterministic terrain
const MAP_CACHE_KEY = `world_map_terrain_v3_${WORLD_SEED}`; // v3 = 45% resource spawn rate

const MAP_COLS = 200; // Width - reduced for mobile performance
const MAP_ROWS = 200; // Height - 200x200 = 40,000 hexagons (mobile-friendly)
const HEX_SIZE = 25; // Radius
// Flat-top hexagon dimensions
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3); // Width (flat side to flat side)
const HEX_HEIGHT = HEX_SIZE * 2; // Height (point to point)
const HEX_HORIZ_SPACING = HEX_WIDTH; // FULL width - hexagons side-by-side
const HEX_VERT_SPACING = HEX_SIZE * 1.5; // 1.5 × radius for perfect vertical nesting

interface Territory {
  id: string;
  col: number;
  row: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerName?: string;
  normalized: number; // Normalized elevation (0-1)
  moisture?: number; // Realistic moisture with latitude curve (0-1)
  resourceId?: string | null; // Resource on this tile (from seed)
  biome: // Water
         'deep_ocean' | 'shallow_sea' | 'abyss' | 'midnight_zone' | 'river' |
         // Ice
         'glacier' | 'ice_shelf' | 'snow_ice' |
         // Tundra
         'arctic_tundra' | 'tundra' |
         // Mountains
         'rocky_mountain' | 'alpine_meadow' | 'sparse_vegetation' |
         // Forests
         'boreal_forest' | 'temperate_rainforest' | 'tropical_rainforest' |
         'evergreen_forest' | 'deciduous_forest' | 'mixed_forest' |
         // Wetlands
         'swamp' | 'marsh' | 'peat_bog' | 'mangrove' | 'wetland' |
         // Grasslands
         'temperate_grassland' | 'flooded_grassland' | 'grassland' | 
         'savanna' | 'woody_savanna' | 'shrubland' |
         // Deserts
         'hot_desert' | 'semi_arid_desert' | 'cold_desert' | 'barren' |
         // Coastal
         'beach' | 'rocky_coast' | 'salt_marsh' |
         // Special
         'badlands' | 'karst';
  color: string;
}

interface NationCluster {
  nationId: string;
  nationName: string;
  flag: string | null;
  centerCol: number;
  centerRow: number;
  color: string;
}

// Map mode types
type MapMode = 'political' | 'terrain' | 'resources' | 'faction';

// Faction mode diplomatic relationship data
interface DiplomaticData {
  factionMemberIds: Set<string>;
  vassalIds: Set<string>;
  napPartnerIds: Set<string>;
}

// Helper function to darken a hex color
const darkenColor = (hex: string, factor: number): string => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Darken each channel
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  // Convert back to hex
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

export default function WorldMap() {
  const router = useRouter();
  const { nation } = useNationStore();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [nationClusters, setNationClusters] = useState<NationCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [zoom, setZoom] = useState(0.12); // Start zoomed all the way out
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  
  // World-specific data
  const worldId = nation?.world_id || null;
  const [worldSeed, setWorldSeed] = useState<number>(WORLD_SEED);
  
  // Diplomatic data for faction mode
  const [diplomaticData, setDiplomaticData] = useState<DiplomaticData>({
    factionMemberIds: new Set(),
    vassalIds: new Set(),
    napPartnerIds: new Set(),
  });
  
  // Store original terrain colors for terrain/resource modes
  const [terrainColors, setTerrainColors] = useState<Map<string, string>>(new Map());
  
  // Refs for scrolling to player's nation
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);

  // Function to zoom and center on player's nation
  const zoomToMyNation = async () => {
    if (!nation) return;
    
    // Fetch fresh nation data to ensure we have the latest coordinates
    const nationId = nation.id || nation._id;
    let centerCol = nation.territory_center_col || 100;
    let centerRow = nation.territory_center_row || 100;
    
    try {
      const response = await api.getNation(nationId);
      if (response.success && response.nation) {
        centerCol = response.nation.territory_center_col || 100;
        centerRow = response.nation.territory_center_row || 100;
        console.log(`Zooming to ${response.nation.name}: (${centerCol}, ${centerRow})`);
      }
    } catch (error) {
      console.log(`Using cached position for ${nation.name}: (${centerCol}, ${centerRow})`);
    }
    
    // Set zoom level to see the nation clearly
    const targetZoom = 0.8;
    setZoom(targetZoom);
    
    // Calculate the pixel position of the nation's center
    const nationX = centerCol * HEX_HORIZ_SPACING * targetZoom;
    const nationY = centerRow * HEX_VERT_SPACING * targetZoom;
    
    // Calculate scroll offset to center the nation on screen
    const screenWidth = SCREEN_WIDTH;
    const screenHeight = Dimensions.get('window').height - 150; // Account for header
    
    const scrollX = Math.max(0, nationX - screenWidth / 2);
    const scrollY = Math.max(0, nationY - screenHeight / 2);
    
    // Delay scroll to allow zoom to apply first
    setTimeout(() => {
      horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      verticalScrollRef.current?.scrollTo({ y: scrollY, animated: true });
    }, 100);
  };

  useEffect(() => {
    loadMap();
  }, []);

  // Load diplomatic data when faction mode is selected
  useEffect(() => {
    if (mapMode === 'faction' && nation) {
      loadDiplomaticData();
    }
  }, [mapMode, nation]);

  // Load diplomatic relationships for faction mode
  const loadDiplomaticData = async () => {
    if (!nation) return;
    
    const nationId = nation.id || nation._id;
    const factionMemberIds = new Set<string>();
    const vassalIds = new Set<string>();
    const napPartnerIds = new Set<string>();
    
    try {
      // Load player's faction (multi-alliance)
      const factionResponse = await api.getNationMultiAlliance(nationId);
      if (factionResponse.success && factionResponse.alliance) {
        const faction = factionResponse.alliance;
        
        // Add all faction members (except self)
        for (const member of faction.members || []) {
          if (member.nation_id !== nationId) {
            factionMemberIds.add(member.nation_id);
          }
        }
        
        // Add all vassals
        for (const vassal of faction.vassals || []) {
          vassalIds.add(vassal.nation_id);
        }
      }
      
      // Load player's NAPs (1v1 alliances)
      const napsResponse = await api.getAlliances(nationId);
      if (napsResponse.success && napsResponse.alliances) {
        for (const alliance of napsResponse.alliances) {
          // Get the other nation in the alliance
          const otherId = alliance.nation1_id === nationId 
            ? alliance.nation2_id 
            : alliance.nation1_id;
          
          // Only add as NAP if not already a faction member or vassal
          if (!factionMemberIds.has(otherId) && !vassalIds.has(otherId)) {
            napPartnerIds.add(otherId);
          }
        }
      }
      
      setDiplomaticData({ factionMemberIds, vassalIds, napPartnerIds });
      console.log(`Diplomatic data loaded: ${factionMemberIds.size} faction members, ${vassalIds.size} vassals, ${napPartnerIds.size} NAPs`);
      
    } catch (error) {
      console.error('Error loading diplomatic data:', error);
    }
  };

  // Get territory color based on current map mode
  const getTerritoryColor = (territory: Territory): string => {
    const nationId = nation?.id || nation?._id;
    
    switch (mapMode) {
      case 'terrain':
        // Use original biome color (stored during generation)
        return terrainColors.get(territory.id) || territory.color;
        
      case 'resources':
        // Color tiles based on resource presence and tier
        if (territory.resourceId) {
          const resource = RESOURCE_BY_ID.get(territory.resourceId);
          if (resource) {
            // Use resource's own color for the tile
            return resource.color;
          }
        }
        // No resource - show muted/darker version of terrain
        const baseColor = terrainColors.get(territory.id) || territory.color;
        // Darken tiles without resources to make resources stand out
        return darkenColor(baseColor, 0.5);
        
      case 'faction':
        if (!territory.ownerId) {
          // Unclaimed - dark gray
          return '#374151';
        }
        if (territory.ownerId === nationId) {
          // Player's nation - Yellow
          return '#F2C94C';
        }
        if (diplomaticData.factionMemberIds.has(territory.ownerId)) {
          // Faction member - Purple
          return '#00E0C7';
        }
        if (diplomaticData.vassalIds.has(territory.ownerId)) {
          // Vassal - Pink
          return '#00B8B8';
        }
        if (diplomaticData.napPartnerIds.has(territory.ownerId)) {
          // Non-aggression pact - Green
          return '#27D17A';
        }
        // Everyone else - Red
        return '#FF5A65';
        
      case 'political':
      default:
        return territory.color;
    }
  };

  // Get stroke style based on map mode
  const getTerritoryStroke = (territory: Territory, isBorder: boolean, isOwned: boolean): { color: string; width: number } => {
    const baseWidth = 0.5;
    
    switch (mapMode) {
      case 'terrain':
        return { color: '#11171F', width: baseWidth };
        
      case 'resources':
        return { color: '#11171F', width: baseWidth };
        
      case 'faction':
        if (isOwned) {
          return { color: '#F3F6FA', width: isBorder ? 2.5 : 1.2 };
        }
        return { color: '#11171F', width: baseWidth };
        
      case 'political':
      default:
        return {
          color: isBorder ? '#F2C94C' : isOwned ? '#F3F6FA' : '#2D3748',
          width: isBorder ? 2.5 : isOwned ? 1.2 : baseWidth
        };
    }
  };

  // Map mode configuration
  const MAP_MODES: { key: MapMode; label: string; icon: string }[] = [
    { key: 'political', label: 'Political', icon: 'flag' },
    { key: 'terrain', label: 'Terrain', icon: 'earth' },
    { key: 'faction', label: 'Faction', icon: 'people' },
  ];

  // Try to load cached terrain, otherwise generate it
  const loadMap = async () => {
    try {
      setLoadingStatus('Loading world data...');
      
      // Load world seed from the world if nation has world_id
      let mapSeed = WORLD_SEED;
      if (worldId) {
        try {
          const worldResponse = await api.getWorld(worldId);
          if (worldResponse.success && worldResponse.world) {
            mapSeed = worldResponse.world.seed || WORLD_SEED;
            setWorldSeed(mapSeed);
            console.log(`Using world seed: ${mapSeed} from world: ${worldResponse.world.name}`);
          }
        } catch (e) {
          console.log('Could not load world seed, using default');
        }
      }
      
      // Use world-specific cache key
      const worldCacheKey = `world_map_terrain_v3_${mapSeed}`;
      
      setLoadingStatus('Checking cache...');
      
      // Try to load cached base terrain
      const cachedData = await AsyncStorage.getItem(worldCacheKey);
      
      if (cachedData) {
        setLoadingStatus('Loading cached terrain...');
        console.log('Found cached terrain, loading...');
        const baseTerritories: Territory[] = JSON.parse(cachedData);
        
        // Check if cache has resources
        const resourceCount = baseTerritories.filter(t => t.resourceId).length;
        console.log(`Cached territories: ${baseTerritories.length}, with resources: ${resourceCount}`);
        
        // If cache is old (no resources), regenerate
        if (resourceCount === 0) {
          console.log('Cache is outdated (no resources), regenerating...');
          await AsyncStorage.removeItem(worldCacheKey);
          await generateAndCacheTerrain(mapSeed, worldCacheKey);
          return;
        }
        
        // Apply nation ownership on top of cached terrain
        await applyNationOwnership(baseTerritories);
      } else {
        setLoadingStatus('Generating terrain (first time only)...');
        console.log('No cache found, generating terrain...');
        await generateAndCacheTerrain(mapSeed, worldCacheKey);
      }
    } catch (error) {
      console.error('Error loading map:', error);
      // Fallback to generating terrain
      await generateAndCacheTerrain(worldSeed, `world_map_terrain_v3_${worldSeed}`);
    }
  };

  // Generate terrain and cache it
  const generateAndCacheTerrain = async (seed: number = WORLD_SEED, cacheKey: string = MAP_CACHE_KEY) => {
    try {
      const baseTerritories = generateBaseTerrain(seed);
      
      // Cache the base terrain (without nation ownership)
      setLoadingStatus('Caching terrain for faster future loads...');
      try {
        // Store a simplified version (only essential data)
        const cacheData = baseTerritories.map(t => ({
          id: t.id,
          col: t.col,
          row: t.row,
          x: t.x,
          y: t.y,
          normalized: t.normalized,
          biome: t.biome,
          color: t.color,
          resourceId: t.resourceId || null,
          ownerId: null,
        }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('Terrain cached successfully (with resources)');
      } catch (cacheError) {
        console.warn('Failed to cache terrain:', cacheError);
      }
      
      // Apply nation ownership
      await applyNationOwnership(baseTerritories);
    } catch (error) {
      console.error('Error generating terrain:', error);
      setLoading(false);
    }
  };

  // Generate the base terrain (biomes, colors) - deterministic based on seed
  const generateBaseTerrain = (seed: number = WORLD_SEED): Territory[] => {
    setLoadingStatus('Generating 40,000 hexagons...');
    const noise = new SimplexNoise(seed);
    const newTerritories: Territory[] = [];

    // PASS 1: Generate raw elevation with SMOOTH COASTLINES
    const rawElevations: number[] = [];
    let minElev = Infinity;
    let maxElev = -Infinity;
    
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        // Large smooth continent mask (very low frequency)
        const continentMask = noise.fbm(col * 0.002, row * 0.002, 3, 0.5);
        
        // Detailed elevation (reduced high frequencies)
        const base = noise.fbm(col / 100, row / 100, 4, 0.35) * 0.6;
        const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.35;
        const directional = Math.abs(noise.noise2D(col * 0.005, row * 0.12)) * -0.2;
        
        // Blend continent mask with elevation (70% smooth, 30% detail)
        const elevation = continentMask * 0.7 + (base + ridges + directional) * 0.3;
        
        rawElevations.push(elevation);
        minElev = Math.min(minElev, elevation);
        maxElev = Math.max(maxElev, elevation);
      }
    }
    
    console.log(`Elevation range: ${minElev.toFixed(2)} to ${maxElev.toFixed(2)}`);
    
    // PASS 2: Create hexes with NORMALIZED elevation (0-1 range)
    let idx = 0;
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const x = col * HEX_HORIZ_SPACING + (row % 2 === 0 ? 0 : HEX_HORIZ_SPACING / 2);
        const y = row * HEX_VERT_SPACING;

        // Normalize elevation to 0-1 range
        const normalized = (rawElevations[idx] - minElev) / (maxElev - minElev);
        
        // Moisture (unchanged)
        const moisture = noise.fbm((col + 2000) / 20, (row + 2000) / 25, 5, 0.85);
        
        // PASS 2.5: Calculate realistic moisture with latitude curve
        const latitude = Math.abs((row - MAP_ROWS / 2) / (MAP_ROWS / 2));
        
        // Desert probability band (subtropical ~15-35° = lat 0.15-0.35)
        const desertLat = Math.exp(-Math.pow((latitude - 0.33), 2) / 0.015);
        
        // Normalize moisture to [0, 1] range, then apply moderate latitude reduction
        const finalMoisture = (moisture + 1) * 0.5 - (desertLat * 0.4);
        
        newTerritories.push({
          id: `${col}-${row}`,
          col,
          row,
          x,
          y,
          ownerId: null,
          normalized: normalized,
          moisture: finalMoisture,
          biome: 'temperate_grassland',
          color: '#C8C87A',
        });
        
        idx++;
      }
    }

    // PATHFINDING RIVERS - Simple downhill flow from mountains to ocean
    setLoadingStatus('Generating rivers...');
    const finalRivers = new Set<string>();
    
    // Find mountain sources (high elevation)
    const mountainSources = newTerritories
      .filter(t => {
        const base = noise.fbm(t.col / 100, t.row / 100, 6, 0.5) * 0.6;
        const ridges = Math.pow(noise.ridged(t.col * 0.02, t.row * 0.02, 5), 1.8) * 0.75;
        const directional = noise.noise2D(t.col * 0.005, t.row * 0.12) * 0.3;
        const elev = base + ridges + directional - 0.1;
        return elev > 0.8 && elev < 1.5;
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);
    
    // Flow each river downhill to ocean
    for (const source of mountainSources) {
      let current = source;
      const visited = new Set<string>();
      let steps = 0;
      const maxSteps = 200;
      
      while (steps < maxSteps) {
        if (visited.has(current.id)) break;
        visited.add(current.id);
        finalRivers.add(current.id);
        
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
          const neighbor = newTerritories.find(
            t => t.col === current.col + dc && t.row === current.row + dr
          );
          
          if (!neighbor || visited.has(neighbor.id)) continue;
          
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

    // STEP 3: Assign biomes
    setLoadingStatus('Assigning biomes...');
    for (const territory of newTerritories) {
      const { col, row } = territory;
      
      const base = noise.fbm(col / 100, row / 100, 6, 0.5) * 0.6;
      const ridges = Math.pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.75;
      const directional = noise.noise2D(col * 0.005, row * 0.12) * 0.3;
      const elevation = base + ridges + directional;
      
      const moisture = territory.moisture || 0.5;
      const latitude = Math.abs((row - MAP_ROWS / 2) / (MAP_ROWS / 2));
      
      let biome: Territory['biome'] = 'temperate_grassland';
      let color = '#C8C87A';

      // OCEANS
      if (territory.normalized < 0.25) {
        biome = 'abyss';
        color = '#001133';
      } else if (territory.normalized < 0.30) {
        biome = 'midnight_zone';
        color = '#002244';
      } else if (territory.normalized < 0.35) {
        biome = 'deep_ocean';
        color = '#1C0DFF';
      } else if (territory.normalized < 0.45) {
        biome = 'shallow_sea';
        color = '#0064C8';
      }
      // POLAR ICE
      else if (latitude > 0.9) {
        if (elevation > 0.6) {
          biome = 'glacier';
          color = '#B0E0FF';
        } else if (elevation > 0.4) {
          biome = 'snow_ice';
          color = '#F0F0F0';
        } else if (elevation > 0.2) {
          biome = 'ice_shelf';
          color = '#E8F4FF';
        } else {
          biome = 'arctic_tundra';
          color = '#D0D8C0';
        }
      } else if (latitude > 0.90) {
        biome = 'tundra';
        color = '#F6E2A0';
      }
      // MOUNTAINS
      else if (territory.normalized > 0.92) {
        biome = 'rocky_mountain';
        color = '#000000';
      } else if (territory.normalized > 0.88) {
        biome = 'alpine_meadow';
        color = '#2B2B2B';
      }
      // HIGH MOUNTAINS
      else if (elevation > 0.8) {
        if (latitude > 0.7) {
          biome = 'boreal_forest';
          color = '#2F4F2F';
        } else if (moisture < 0.1) {
          biome = 'badlands';
          color = '#B86F50';
        } else if (moisture > 0.5) {
          biome = 'karst';
          color = '#C0C0C0';
        } else {
          biome = 'sparse_vegetation';
          color = '#8B8B7A';
        }
      }
      // COASTAL
      else if (elevation < 0.25 && elevation > 0.15) {
        const nearOcean = noise.noise2D(col / 3, row / 3) > 0.3;
        if (nearOcean) {
          if (moisture > 0.5) {
            biome = 'salt_marsh';
            color = '#8FBC8F';
          } else if (moisture > 0.2) {
            biome = 'beach';
            color = '#F0E68C';
          } else {
            biome = 'rocky_coast';
            color = '#707070';
          }
        } else {
          biome = 'flooded_grassland';
          color = '#A0D6A0';
        }
      }
      // WETLANDS
      else if (elevation < 0.35 && moisture > 0.6) {
        if (latitude < 0.2) {
          biome = 'swamp';
          color = '#2F3F2F';
        } else if (latitude < 0.35) {
          biome = 'mangrove';
          color = '#00CF75';
        } else if (latitude < 0.5) {
          biome = 'marsh';
          color = '#5F7F5F';
        } else {
          biome = 'peat_bog';
          color = '#4F3F2F';
        }
      } else if (elevation < 0.25 && moisture > 0.5) {
        biome = 'wetland';
        color = '#27FF87';
      }
      // FORESTS
      else if (moisture > 0.40) {
        if (latitude < 0.15) {
          biome = 'tropical_rainforest';
          color = '#003300';
        } else if (latitude > 0.70) {
          biome = 'boreal_forest';
          color = '#2F4F2F';
        } else if (moisture > 0.60) {
          biome = 'temperate_rainforest';
          color = '#1F3F1F';
        } else if (moisture > 0.45) {
          biome = 'evergreen_forest';
          color = '#05450A';
        } else {
          biome = 'deciduous_forest';
          color = '#78D203';
        }
      } else if (moisture > 0.35) {
        biome = 'mixed_forest';
        color = '#009900';
      }
      // DESERTS
      else if (moisture < 0.15) {
        if (latitude > 0.7) {
          biome = 'cold_desert';
          color = '#C9B89B';
        } else if (latitude > 0.35 && latitude < 0.5) {
          if (elevation > 0.5) {
            biome = 'hot_desert';
            color = '#E3B98F';
          } else if (moisture < 0.03) {
            biome = 'savanna';
            color = '#FBFF13';
          } else {
            biome = 'semi_arid_desert';
            color = '#D8B56B';
          }
        } else if (elevation > 0.6) {
          biome = 'barren';
          color = '#F9FFA4';
        } else {
          const useSavanna = noise.noise2D(col / 3, row / 3) > 0.2;
          biome = useSavanna ? 'savanna' : 'semi_arid_desert';
          color = useSavanna ? '#FBFF13' : '#D8B56B';
        }
      }
      // GRASSLANDS & SAVANNAS
      else if (moisture > 0.05) {
        if (latitude < 0.35 && moisture < 0.22) {
          biome = 'woody_savanna';
          color = '#DADE48';
        } else if (moisture < 0.25) {
          biome = 'shrubland';
          color = '#BFBB22';
        } else if (moisture < 0.28 && latitude < 0.45) {
          biome = 'savanna';
          color = '#FBFF13';
        } else if (moisture > 0.22) {
          biome = 'grassland';
          color = '#B6FF05';
        } else {
          biome = 'temperate_grassland';
          color = '#C8C87A';
        }
      }
      // DEFAULT GRASSLAND
      else {
        biome = 'grassland';
        color = '#B6FF05';
      }

      // RIVERS OVERLAY
      const isRiver = finalRivers.has(territory.id);
      if (isRiver) {
        biome = 'river';
        color = '#2060A0';
      }

      territory.biome = biome;
      territory.color = color;
      
      // Assign resource based on biome and seed (deterministic)
      territory.resourceId = assignResourceToTile(biome, territory.col, territory.row, WORLD_SEED);
    }

    return newTerritories;
  };

  // Apply nation ownership to territories (fetches from server)
  const applyNationOwnership = async (baseTerritories: Territory[]) => {
    setLoadingStatus('Loading nations...');
    
    // Create a working copy of territories - preserve all properties including resourceId
    const workingTerritories = baseTerritories.map(t => ({
      ...t,
      resourceId: t.resourceId || null, // Explicitly preserve resourceId
      ownerId: null as string | null,
      ownerName: undefined as string | undefined,
    }));
    
    console.log(`Working territories: ${workingTerritories.length}, with resources: ${workingTerritories.filter(t => t.resourceId).length}`);
    
    // Store original terrain colors for terrain/resource map modes
    const originalColors = new Map<string, string>();
    workingTerritories.forEach(t => originalColors.set(t.id, t.color));
    setTerrainColors(originalColors); // Save to state for map mode switching
    
    const clusters: NationCluster[] = [];
    
    try {
      // Get rankings filtered by world_id
      const response = await api.getRankings('gdp', 100, worldId || undefined);
      const allNations = response.rankings || [];
      
      // Collect nation positions with capacities
      const nationSeeds: { 
        nationId: string; 
        col: number; 
        row: number; 
        name: string; 
        flag: string | null;
        capacity: number;
        maxRadius: number;
      }[] = [];
      
      let totalCapacity = 0;
      
      setLoadingStatus(`Loading ${allNations.length} nations...`);
      
      // Load ALL nations
      for (const nationEntry of allNations) {
        try {
          const nationResponse = await api.getNation(nationEntry.nation_id);
          if (!nationResponse.success) continue;
          
          const nationData = nationResponse.nation;
          const startCol = nationData.territory_center_col || 100;
          const startRow = nationData.territory_center_row || 100;
          
          const capacity = calculateCapacityFromPopulation(nationData.stats.population);
          totalCapacity += capacity;
          
          nationSeeds.push({
            nationId: nationEntry.nation_id,
            col: startCol,
            row: startRow,
            name: nationData.name,
            flag: nationData.flag_base64 || null,
            capacity,
            maxRadius: 0,
          });
        } catch (error) {
          console.error(`Error loading nation:`, error);
        }
      }
      
      setLoadingStatus('Calculating borders...');
      
      // Calculate max radius per nation
      nationSeeds.forEach((seed) => {
        seed.maxRadius = Math.sqrt(seed.capacity) * 1.1;
        console.log(`${seed.name}: capacity=${seed.capacity}, maxRadius=${seed.maxRadius.toFixed(1)}`);
      });
      
      // Nation colors
      const nationColors = [
        '#00E0C7', '#FF5A65', '#27D17A', '#F2C94C', '#00E0C7', 
        '#00B8B8', '#06B6D4', '#84CC16', '#F97316', '#A855F7',
        '#00E0C7', '#F43F5E', '#6366F1', '#27D17A', '#EAB308',
        '#D946EF', '#0EA5E9', '#78716C', '#FB7185', '#A3E635',
        '#818CF8', '#7FFFD4', '#FACC15', '#E879F9', '#38BDF8',
        '#27D17A', '#FCA5A5', '#93C5FD', '#C084FC', '#FDE047'
      ];
      
      // DIJKSTRA COST-BASED EXPANSION
      for (let idx = 0; idx < nationSeeds.length; idx++) {
        const seed = nationSeeds[idx];
        const nationColor = nationColors[idx % nationColors.length];
        
        const expansionLimit = Math.min(
          Math.sqrt(seed.capacity) * 1.5,
          seed.capacity * 0.5
        );
        const maxTiles = Math.floor(seed.capacity * 0.8);
        
        const claimedTiles = dijkstraExpansion(
          workingTerritories,
          seed.col,
          seed.row,
          expansionLimit,
          maxTiles
        );
        
        console.log(`${seed.name}: claimed ${claimedTiles.size} tiles`);
        
        // Assign claimed territories to this nation
        for (const tileId of claimedTiles) {
          const territory = workingTerritories.find(t => t.id === tileId);
          if (territory && !territory.ownerId) {
            territory.ownerId = seed.nationId;
            territory.ownerName = seed.name;
            territory.color = nationColor;
          }
        }
      }
      
      // Calculate territory counts for each nation and sync to backend
      setLoadingStatus('Syncing territory data...');
      await syncTerritoryCounts(workingTerritories, nationSeeds);
      
      // Build cluster markers
      for (let i = 0; i < nationSeeds.length; i++) {
        const seed = nationSeeds[i];
        clusters.push({
          nationId: seed.nationId,
          nationName: seed.name,
          flag: seed.flag,
          centerCol: seed.col,
          centerRow: seed.row,
          color: nationColors[i % nationColors.length],
        });
      }
      
      setNationClusters(clusters);
    } catch (error) {
      console.error('Error applying nation ownership:', error);
    }
    
    setTerritories(workingTerritories);
    setLoading(false);
  };

  // Sync territory counts to backend for each nation
  const syncTerritoryCounts = async (
    territories: Territory[], 
    nationSeeds: { nationId: string; name: string }[]
  ) => {
    for (const seed of nationSeeds) {
      // Count territories by biome for this nation
      const nationTerritories = territories.filter(t => t.ownerId === seed.nationId);
      const territoryCounts: Record<string, number> = {};
      const resourceCounts: Record<string, number> = {};
      
      for (const territory of nationTerritories) {
        const biome = territory.biome;
        territoryCounts[biome] = (territoryCounts[biome] || 0) + 1;
        
        // Count resources
        if (territory.resourceId) {
          resourceCounts[territory.resourceId] = (resourceCounts[territory.resourceId] || 0) + 1;
        }
      }
      
      const totalTerritories = nationTerritories.length;
      
      // Sync to backend including resources
      try {
        await api.updateTerritoryCounts(seed.nationId, territoryCounts, totalTerritories, resourceCounts);
        console.log(`Synced territory for ${seed.name}: ${totalTerritories} tiles, ${Object.keys(resourceCounts).length} resource types`);
      } catch (error) {
        console.error(`Failed to sync territory counts for ${seed.name}:`, error);
      }
    }
  };

  const getHexagonPoints = (centerX: number, centerY: number, size: number): string => {
    const points = [];
    
    // Flat-top hexagon: rotate 30° from pointy-top
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // -30° rotation for flat-top
      const x = centerX + size * Math.cos(angle);
      const y = centerY + size * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    
    return points.join(' ');
  };

  const getSquareTiles = () => {
    // No squares needed - hexagons tile perfectly!
    return [];
  };

  const isBorderTerritory = (territory: Territory): boolean => {
    if (!territory.ownerId) return false;
    
    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    
    for (const [dc, dr] of neighbors) {
      const neighbor = territories.find(
        t => t.col === territory.col + dc && t.row === territory.row + dr
      );
      
      if (!neighbor || neighbor.ownerId !== territory.ownerId) {
        return true;
      }
    }
    
    return false;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.12));

  // Fix overlapping nation positions and reload map
  const handleFixOverlaps = async () => {
    setLoading(true);
    setLoadingStatus('Fixing overlapping positions...');
    try {
      const response = await api.fixOverlappingPositions();
      if (response.success) {
        console.log('Fixed positions:', response.details);
        // Clear cache and reload
        await AsyncStorage.removeItem(MAP_CACHE_KEY);
        setLoadingStatus('Reloading map with fixed positions...');
        await loadMap();
      } else {
        setLoading(false);
        console.error('Failed to fix positions:', response);
      }
    } catch (error) {
      console.error('Error fixing overlaps:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E0C7" />
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        <Text style={styles.loadingSubtext}>Terrain is cached after first load for faster access</Text>
      </View>
    );
  }

  const mapWidth = MAP_COLS * HEX_HORIZ_SPACING + HEX_SIZE;
  const mapHeight = MAP_ROWS * HEX_VERT_SPACING + HEX_SIZE;
  const squares = getSquareTiles();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00E0C7" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>World Map</Text>
          <Text style={styles.subtitle}>40,000 Territories</Text>
        </View>
        <TouchableOpacity onPress={zoomToMyNation} style={styles.myNationButton}>
          <Ionicons name="locate" size={20} color="#F3F6FA" />
        </TouchableOpacity>
      </View>

      {/* Map Mode Selector */}
      <View style={styles.mapModeBar}>
        <TouchableOpacity 
          style={styles.mapModeSelector}
          onPress={() => setShowModeDropdown(true)}
        >
          <Ionicons 
            name={MAP_MODES.find(m => m.key === mapMode)?.icon as any || 'flag'} 
            size={16} 
            color="#F3F6FA" 
          />
          <Text style={styles.mapModeSelectorText}>
            {MAP_MODES.find(m => m.key === mapMode)?.label || 'Political'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="rgba(243,246,250,0.70)" />
        </TouchableOpacity>
        
        {/* Faction mode legend */}
        {mapMode === 'faction' && (
          <View style={styles.factionLegend}>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: '#F2C94C' }]} />
              <Text style={styles.legendDotText}>You</Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: '#00E0C7' }]} />
              <Text style={styles.legendDotText}>Faction</Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: '#00B8B8' }]} />
              <Text style={styles.legendDotText}>Vassal</Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: '#27D17A' }]} />
              <Text style={styles.legendDotText}>NAP</Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: '#FF5A65' }]} />
              <Text style={styles.legendDotText}>Other</Text>
            </View>
          </View>
        )}
        
      </View>

      {/* Map Mode Dropdown Modal */}
      <Modal
        visible={showModeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModeDropdown(false)}
      >
        <Pressable 
          style={styles.dropdownOverlay}
          onPress={() => setShowModeDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Map Mode</Text>
            {MAP_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={[
                  styles.dropdownItem,
                  mapMode === mode.key && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setMapMode(mode.key);
                  setShowModeDropdown(false);
                }}
              >
                <Ionicons 
                  name={mode.icon as any} 
                  size={20} 
                  color={mapMode === mode.key ? '#00E0C7' : 'rgba(243,246,250,0.70)'} 
                />
                <Text style={[
                  styles.dropdownItemText,
                  mapMode === mode.key && styles.dropdownItemTextActive
                ]}>
                  {mode.label}
                </Text>
                {mapMode === mode.key && (
                  <Ionicons name="checkmark" size={20} color="#00E0C7" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
          <Ionicons name="add" size={20} color="#F3F6FA" />
        </TouchableOpacity>
        <Text style={styles.zoomText}>{zoom.toFixed(2)}x</Text>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
          <Ionicons name="remove" size={20} color="#F3F6FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        contentContainerStyle={{ width: mapWidth * zoom }}
        showsHorizontalScrollIndicator={true}
      >
        <ScrollView
          ref={verticalScrollRef}
          contentContainerStyle={{ height: mapHeight * zoom }}
          showsVerticalScrollIndicator={true}
        >
          <Svg width={mapWidth * zoom} height={mapHeight * zoom}>
            {/* Pure hexagon map - perfect tiling */}
            
            {/* Render hexagon territories */}
            {territories.map((territory) => {
              const isBorder = isBorderTerritory(territory);
              const isOwned = !!territory.ownerId;
              const fillColor = getTerritoryColor(territory);
              const stroke = getTerritoryStroke(territory, isBorder, isOwned);
              
              return (
                <G key={territory.id}>
                  <Polygon
                    points={getHexagonPoints(
                      territory.x * zoom,
                      territory.y * zoom,
                      HEX_SIZE * zoom
                    )}
                    fill={fillColor}
                    stroke={stroke.color}
                    strokeWidth={stroke.width * zoom}
                    opacity={territory.biome === 'deep_ocean' ? 0.8 : territory.biome === 'shallow_sea' ? 0.7 : isOwned ? 0.95 : 0.85}
                    onPress={() => setSelectedTerritory(territory)}
                  />
                  
                  {/* Resource indicator for resources mode */}
                  {mapMode === 'resources' && territory.resourceId && zoom > 0.3 && (
                    <Circle
                      cx={territory.x * zoom}
                      cy={territory.y * zoom}
                      r={Math.max(4, HEX_SIZE * zoom * 0.3)}
                      fill={RESOURCE_BY_ID.get(territory.resourceId)?.color || '#F3F6FA'}
                      stroke="#0B0F14"
                      strokeWidth={1}
                      opacity={0.9}
                    />
                  )}
                </G>
              );
            })}
            
            {/* Render nation flags at cluster centers */}
            {nationClusters.map((cluster) => {
              const centerTerritory = territories.find(
                t => t.col === cluster.centerCol && t.row === cluster.centerRow
              );
              
              if (!centerTerritory) return null;
              
              const centerX = (centerTerritory.x + HEX_SIZE) * zoom;
              const centerY = (centerTerritory.y + HEX_SIZE) * zoom;
              const flagSize = Math.max(35, HEX_SIZE * zoom * 1.5);
              const flagWidth = flagSize * 1.5;
              const flagHeight = flagSize;
              
              return (
                <G key={`flag-${cluster.nationId}`}>
                  {/* Render ACTUAL SVG flag (no border) */}
                  {cluster.flag && (() => {
                    const isSvg = cluster.flag.includes('svg');
                    
                    if (isSvg) {
                      try {
                        const base64Data = cluster.flag.split('base64,')[1];
                        const svgString = atob(base64Data);
                        
                        return (
                          <G 
                            x={centerX - flagWidth / 2} 
                            y={centerY - flagHeight}
                          >
                            <SvgXml 
                              xml={svgString} 
                              width={flagWidth} 
                              height={flagHeight}
                            />
                          </G>
                        );
                      } catch (e) {
                        return null;
                      }
                    }
                    
                    return null;
                  })()}
                  
                  {/* Nation name label (dark background only) */}
                  {zoom > 0.25 && (
                    <G>
                      <Rect
                        x={centerX - flagWidth / 2}
                        y={centerY + 8}
                        width={flagWidth}
                        height={flagSize * 0.5}
                        fill="#0B0F14"
                        rx={4}
                        opacity={0.95}
                      />
                      <SvgText
                        x={centerX}
                        y={centerY + 8 + (flagSize * 0.35)}
                        fontSize={Math.max(10, 12 * zoom)}
                        fill="#F3F6FA"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {cluster.nationName}
                      </SvgText>
                    </G>
                  )}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {selectedTerritory && (
        <View style={styles.infoPanel}>
          <View style={styles.infoPanelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {selectedTerritory.ownerName || selectedTerritory.biome.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.infoCoords}>
                ({selectedTerritory.col}, {selectedTerritory.row})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTerritory(null)}>
              <Ionicons name="close-circle" size={28} color="rgba(243,246,250,0.48)" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContent}>
            <View style={[styles.biomeSwatch, { backgroundColor: terrainColors.get(selectedTerritory.id) || selectedTerritory.color }]} />
            <View style={styles.infoDetails}>
              <Text style={styles.infoText}>Biome: {selectedTerritory.biome.replace(/_/g, ' ')}</Text>
              <Text style={styles.infoText}>
                {selectedTerritory.ownerId ? `Owned by ${selectedTerritory.ownerName}` : 'Unclaimed'}
              </Text>
              {selectedTerritory.resourceId && (
                <View style={styles.resourceInfo}>
                  <View style={[styles.resourceDot, { backgroundColor: RESOURCE_BY_ID.get(selectedTerritory.resourceId)?.color || '#F3F6FA' }]} />
                  <Text style={styles.resourceText}>
                    {RESOURCE_BY_ID.get(selectedTerritory.resourceId)?.name || selectedTerritory.resourceId}
                    <Text style={[styles.resourceTier, { color: TIER_COLORS[RESOURCE_BY_ID.get(selectedTerritory.resourceId)?.tier || 'common'] }]}>
                      {' '}({RESOURCE_BY_ID.get(selectedTerritory.resourceId)?.tier || 'common'})
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F14',
  },
  loadingText: {
    marginTop: 16,
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
  },
  myNationButton: {
    padding: 8,
    backgroundColor: '#00E0C7',
    borderRadius: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.70)',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  legendText: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.70)',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    gap: 4,
    zIndex: 10,
    backgroundColor: '#11171F',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlButton: {
    padding: 6,
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 10,
    color: 'rgba(243,246,250,0.70)',
    paddingVertical: 2,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#11171F',
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: '#00E0C7',
  },
  infoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 4,
  },
  infoCoords: {
    fontSize: 11,
    color: 'rgba(243,246,250,0.48)',
  },
  infoContent: {
    flexDirection: 'row',
    gap: 12,
  },
  biomeSwatch: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 4,
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  resourceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resourceText: {
    fontSize: 13,
    color: '#F3F6FA',
    fontWeight: '500',
  },
  resourceTier: {
    fontSize: 11,
    fontWeight: '400',
  },
  // Map Mode Bar
  mapModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#11171F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  mapModeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  mapModeSelectorText: {
    color: '#F3F6FA',
    fontSize: 14,
    fontWeight: '500',
  },
  // Faction Legend
  factionLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  legendDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 11,
  },
  resourcesLegendLabel: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  // Dropdown Modal
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 16,
  },
  dropdownContainer: {
    backgroundColor: '#11171F',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dropdownTitle: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 12,
    marginTop: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dropdownItemText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#F3F6FA',
    fontWeight: '600',
  },
});
