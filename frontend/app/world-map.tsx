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
  Image,
  GestureResponderEvent,
  LayoutChangeEvent,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import Svg, { Polygon, G, Text as SvgText, Rect, Circle , SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SimplexNoise } from '../utils/noise';
import { api } from '../utils/api';
import { colorsFromFlag } from '../utils/flagColors';
import { colonizeFromCapitals } from '../utils/borders';
import { calculateCapacityFromPopulation } from '../utils/nationSize';
import { generateVoronoiCells, VoronoiCell, WATER_BIOMES } from '../utils/voronoiMap';
import { assignResourceToTile, RESOURCE_BY_ID, TIER_COLORS } from '../utils/resources';
import { rasterizeWorldMap } from '../utils/mapPaint';
import { terrainColor } from '../utils/biomePalette';
import {
  MAP_COLS,
  MAP_ROWS,
  CELL_SCALE,
  MAP_WIDTH,
  MAP_HEIGHT,
  VORONOI_CELLS,
  wrapDx,
  timezoneColor,
  timezoneLabel,
  officialTimezoneColor,
  contiguousOccupiedBands,
  mercatorY,
} from '../utils/mapConstants';

const WORLD_SEED = 123456;
const MAP_CACHE_KEY = `world_map_terrain_v11_cyl_merc_${WORLD_SEED}`;
const MAX_ZOOM = 8;

function fitZoomFor(_width: number, height: number): number {
  if (height < 8) return 1;
  return height / MAP_HEIGHT;
}

interface Territory extends VoronoiCell {
  borderColor?: string;
}

interface NationCluster {
  nationId: string;
  nationName: string;
  flag: string | null;
  centerCol: number;
  centerRow: number;
  color: string;
  discRadius?: number;
}

// Map mode types
type MapMode = 'political' | 'terrain' | 'resources' | 'faction' | 'timezone';

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
  const { nation, saveNation } = useNationStore();
  const params = useLocalSearchParams<{ place?: string }>();
  const placing = params.place === '1';
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [mapImageUri, setMapImageUri] = useState<string | null>(null);
  const [nationClusters, setNationClusters] = useState<NationCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const userHasZoomed = useRef(false);
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const tzPolicyRef = useRef<Map<string, { bands: number[]; count: number }>>(new Map());

  // Direct URL /world-map.html is not the game — send them home.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    const referrer = document.referrer || '';
    const fromThisApp = referrer.includes(host);
    if (!placing && !fromThisApp && window.history.length <= 2) {
      router.replace('/');
    }
  }, [router, placing]);

  useEffect(() => {
    if (!placing) return;
    AsyncStorage.getItem('selected_world_id').then((id) => setPlaceWorldId(id));
  }, [placing]);

  useEffect(() => {
    if (loading) return;
    const worldW = MAP_WIDTH * zoom;
    const id = requestAnimationFrame(() => {
      horizontalScrollRef.current?.scrollTo({ x: worldW, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [loading, fitZoom]);
  
  // World-specific data
  const [placeWorldId, setPlaceWorldId] = useState<string | null>(null);
  const worldId = nation?.world_id || placeWorldId;
  const placingBusy = useRef(false);
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
    const targetZoom = Math.max(0.8, fitZoom * 2.2);
    userHasZoomed.current = true;
    setZoom(targetZoom);
    
    // Calculate the pixel position of the nation's center
    const nationX = centerCol * CELL_SCALE * targetZoom;
    const nationY = centerRow * CELL_SCALE * targetZoom;
    
    // Calculate scroll offset to center the nation on screen
    const screenWidth = viewport.w || Dimensions.get('window').width;
    const screenHeight = viewport.h || Dimensions.get('window').height - 150;
    
    const scrollX = Math.max(0, nationX + MAP_WIDTH * targetZoom - screenWidth / 2);
    const scrollY = Math.max(0, nationY - screenHeight / 2);
    
    // Delay scroll to allow zoom to apply first
    setTimeout(() => {
      horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      verticalScrollRef.current?.scrollTo({ y: scrollY, animated: true });
    }, 100);
  };

  useEffect(() => {
    if (placing && !placeWorldId) return;
    loadMap();
  }, [worldId]);

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
        return terrainColor(territory.biome, terrainColors.get(territory.id) || territory.color);
        
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

      case 'timezone': {
        const owner = territory.ownerId;
        if (owner) {
          const p = tzPolicyRef.current.get(owner);
          if (p && p.bands.length) {
            return officialTimezoneColor(territory.col, p.bands, p.count);
          }
        }
        return timezoneColor(territory.col);
      }
        
      case 'political':
      default:
        return territory.color;
    }
  };

  // Get stroke style based on map mode
  const getTerritoryStroke = (territory: Territory, isBorder: boolean, isOwned: boolean): { color: string; width: number } => {
    const baseWidth = 0.6;
    
    switch (mapMode) {
      case 'terrain':
        return { color: 'rgba(255,255,255,0.10)', width: baseWidth };
        
      case 'resources':
        return { color: 'rgba(255,255,255,0.10)', width: baseWidth };
        
      case 'faction':
        if (isOwned) {
          return { color: '#F3F6FA', width: isBorder ? 4 : 1.5 };
        }
        return { color: '#11171F', width: baseWidth };
        
      case 'political':
      default:
        return {
          color: isBorder ? '#F2C94C' : isOwned ? '#F3F6FA' : '#2D3748',
          width: isBorder ? 4 : isOwned ? 1.5 : baseWidth
        };
    }
  };

  // Map mode configuration
  const MAP_MODES: { key: MapMode; label: string; icon: string }[] = [
    { key: 'political', label: 'Political', icon: 'flag' },
    { key: 'terrain', label: 'Terrain', icon: 'earth' },
    { key: 'faction', label: 'Faction', icon: 'people' },
    { key: 'timezone', label: 'Timezones', icon: 'time-outline' },
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
      
      // v5 = 40k Voronoi. Older caches were hex or 1500-cell and must not be reused.
      const worldCacheKey = `world_map_terrain_v11_cyl_merc_${mapSeed}`;
      
      setLoadingStatus('Checking cache...');
      
      // Try to load cached base terrain
      const cachedData = await AsyncStorage.getItem(worldCacheKey);
      
      if (cachedData) {
        setLoadingStatus('Loading cached terrain...');
        console.log('Found cached terrain, loading...');
        const baseTerritories: Territory[] = JSON.parse(cachedData);
        
        const resourceCount = baseTerritories.filter(t => t.resourceId).length;
        const polygonCount = baseTerritories.filter(t => Array.isArray(t.polygon) && t.polygon.length >= 3).length;
        console.log(`Cached territories: ${baseTerritories.length}, with resources: ${resourceCount}, with polygons: ${polygonCount}`);
        
        // Reject hex/v3-shaped cache (no polygons) or resource-less cache
        if (polygonCount < baseTerritories.length * 0.8 || resourceCount === 0) {
          console.log('Cache is outdated (missing Voronoi polygons or resources), regenerating...');
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
      await generateAndCacheTerrain(worldSeed, `world_map_terrain_v11_cyl_merc_${worldSeed}`);
    }
  };

  // Generate terrain and cache it
  const generateAndCacheTerrain = async (seed: number = WORLD_SEED, cacheKey: string = MAP_CACHE_KEY) => {
    try {
      // Yield so the loading label can paint before the sync Voronoi pass
      setLoadingStatus('Carving 40,000 Voronoi territories...');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const baseTerritories = generateBaseTerrain(seed);
      
      // Cache the base terrain (without nation ownership)
      setLoadingStatus('Caching terrain for faster future loads...');
      try {
        // 40k polygons blow localStorage (~5MB). Only cache small maps.
        if (baseTerritories.length > 4000) {
          console.log(`Skipping AsyncStorage cache (${baseTerritories.length} cells)`);
        } else {
        const cacheData = baseTerritories.map(t => ({
          id: t.id,
          index: t.index,
          col: t.col,
          row: t.row,
          x: t.x,
          y: t.y,
          polygon: t.polygon,
          neighbors: t.neighbors,
          normalized: t.normalized,
          moisture: t.moisture,
          biome: t.biome,
          color: t.color,
          resourceId: t.resourceId || null,
          ownerId: null,
          isRiver: t.isRiver,
          nearWater: t.nearWater,
        }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('Terrain cached successfully (with polygons + resources)');
        }
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
    setLoadingStatus('Carving 40,000 Voronoi territories...');
    return generateVoronoiCells(seed, MAP_COLS, MAP_ROWS, VORONOI_CELLS, CELL_SCALE).map(cell => ({
      ...cell,
      ownerId: null,
      ownerName: undefined,
    }));
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
        primary: string;
        secondary: string;
        timezoneCount: number | null;
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
          
          const palette = await colorsFromFlag(nationData.flag_base64, nationData.name || nationEntry.nation_id);
          nationSeeds.push({
            nationId: nationEntry.nation_id,
            col: startCol,
            row: startRow,
            name: nationData.name,
            flag: nationData.flag_base64 || null,
            capacity,
            maxRadius: 0,
            primary: palette.primary,
            secondary: palette.secondary,
            timezoneCount: nationData.timezone_count ?? null,
          });
        } catch (error) {
          console.error(`Error loading nation:`, error);
        }
      }
      
      setLoadingStatus('Calculating borders...');
      
      nationSeeds.forEach((seed) => {
        seed.maxRadius = Math.max(5, Math.sqrt(seed.capacity) * 1.4);
      });

      // Grow along easy land (plains, coasts, valleys) — not Manhattan diamonds.
      const landCells = workingTerritories.filter(t => !WATER_BIOMES.has(t.biome));
      if (!landCells.length) {
        setTerritories(workingTerritories);
        setLoading(false);
        return;
      }
      const borderNoise = new SimplexNoise(worldSeed + 789012);
      const startIndexFor = (col: number, row: number) => {
        let best = landCells[0];
        let bestD = Infinity;
        for (const t of landCells) {
          const dx = wrapDx(t.col - col);
          const d = dx * dx + (t.row - row) ** 2;
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        return best.index;
      };

      const claims = colonizeFromCapitals(
        workingTerritories.map(t => ({
          index: t.index,
          col: t.col,
          row: t.row,
          biome: t.biome,
          normalized: t.normalized,
          nearWater: t.nearWater,
          isRiver: t.isRiver,
          neighbors: t.neighbors,
        })),
        nationSeeds.map(s => ({
          nationId: s.nationId,
          startIndex: startIndexFor(s.col, s.row),
          capacity: s.capacity,
        })),
        (b) => WATER_BIOMES.has(b),
        (i) => borderNoise.noise2D(i * 0.017, i * 0.009)
      );

      const seedById = new Map(nationSeeds.map((s, i) => [s.nationId, i]));
      for (const territory of workingTerritories) {
        const ownerId = claims.get(territory.index);
        if (!ownerId) continue;
        const seedIndex = seedById.get(ownerId) ?? 0;
        const seed = nationSeeds[seedIndex];
        territory.ownerId = ownerId;
        territory.ownerName = seed?.name;
        territory.color = seed?.primary || '#888888';
        territory.borderColor = seed?.secondary || '#222222';
      }

      console.log(
        `Border ownership applied: ` +
        `${workingTerritories.filter(t => t.ownerId).length} owned tiles, ` +
        `${nationSeeds.length} nations`
      );

      const nextTz = new Map<string, { bands: number[]; count: number }>();
      for (const seed of nationSeeds) {
        const cols = workingTerritories.filter(t => t.ownerId === seed.nationId).map(t => t.col);
        const bands = contiguousOccupiedBands(cols);
        const geoMax = Math.max(1, bands.length);
        const count = Math.max(1, Math.min(geoMax, seed.timezoneCount ?? geoMax));
        nextTz.set(seed.nationId, { bands, count });
      }
      tzPolicyRef.current = nextTz;
      const playerId = nation?.id || nation?._id;
      if (playerId && nextTz.has(playerId)) {
        const p = nextTz.get(playerId)!;
        api.reportTimezoneGeo(playerId, p.bands.length, p.bands).catch(() => {});
      }
      
      // Calculate territory counts for each nation and sync to backend
      setLoadingStatus('Syncing territory data...');
      await syncTerritoryCounts(workingTerritories, nationSeeds);
      
      // Build cluster markers anchored on the centroid of each nation's owned tiles
      for (let i = 0; i < nationSeeds.length; i++) {
        const seed = nationSeeds[i];
        const owned = workingTerritories.filter(t => t.ownerId === seed.nationId);
        let centerCol = seed.col;
        let centerRow = seed.row;
        let discRadius = 0;
        if (owned.length > 0) {
          const tau = (2 * Math.PI) / MAP_COLS;
          const sx = owned.reduce((acc, t) => acc + Math.cos(t.col * tau), 0);
          const sy = owned.reduce((acc, t) => acc + Math.sin(t.col * tau), 0);
          centerCol = Math.round(((Math.atan2(sy, sx) / tau) + MAP_COLS) % MAP_COLS);
          centerRow = Math.round(owned.reduce((acc, t) => acc + t.row, 0) / owned.length);
          discRadius = Math.max(
            1,
            Math.ceil(
              Math.sqrt(
                Math.max(...owned.map(t => wrapDx(t.col - centerCol) ** 2 + (t.row - centerRow) ** 2))
              )
            )
          );
        }
        clusters.push({
          nationId: seed.nationId,
          nationName: seed.name,
          flag: seed.flag,
          centerCol,
          centerRow,
          color: seed.primary,
          discRadius,
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

  const isBorderTerritory = (territory: Territory): boolean => {
    if (!territory.ownerId) return false;
    for (const n of territory.neighbors) {
      const neighbor = territories[n];
      if (!neighbor || neighbor.ownerId !== territory.ownerId) {
        return true;
      }
    }
    return false;
  };

  // Rasterize 40k cells to a bitmap — hillshade, coasts, grain (not flat fills).
  useEffect(() => {
    if (!territories.length) return;
    const uri = rasterizeWorldMap({
      territories,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      fillFor: (t) => getTerritoryColor(t as Territory),
      isNationBorder: (t) => isBorderTerritory(t as Territory),
      mapMode,
      resourceColor: (id) => RESOURCE_BY_ID.get(id)?.color,
    });
    if (uri) setMapImageUri(uri);
  }, [territories, mapMode, diplomaticData, terrainColors, nation]);

  const handleMapPress = (event: GestureResponderEvent) => {
    const ne: any = event.nativeEvent;
    const lx = Number(ne.locationX ?? ne.offsetX ?? 0);
    const ly = Number(ne.locationY ?? ne.offsetY ?? 0);
    let mx = (lx / zoom) % MAP_WIDTH;
    if (mx < 0) mx += MAP_WIDTH;
    const my = ly / zoom;
    let best: Territory | null = null;
    let bestD = Infinity;
    for (const t of territories) {
      const dx = wrapDx((t.x - mx) / CELL_SCALE) * CELL_SCALE;
      const dy = t.y - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (best) handleTerritoryPress(best);
  };

  const handleZoomIn = () => {
    userHasZoomed.current = true;
    setZoom(prev => Math.min(prev * 1.3, MAX_ZOOM));
  };
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = prev / 1.3;
      if (next <= fitZoom * 1.02) {
        userHasZoomed.current = false;
        return fitZoom;
      }
      return next;
    });
  };

  const onMapViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width < 8 || height < 8) return;
    const nextFit = fitZoomFor(width, height);
    setViewport({ w: width, h: height });
    setFitZoom(nextFit);
    setZoom((z) => {
      if (!userHasZoomed.current) return nextFit;
      return Math.max(z, nextFit);
    });
  };

  const handleTerritoryPress = (territory: Territory) => {
    if (placing) {
      void confirmCapital(territory);
      return;
    }
    setSelectedTerritory(territory);
  };

  const confirmCapital = async (territory: Territory) => {
    if (placingBusy.current) return;
    if (WATER_BIOMES.has(territory.biome)) {
      Alert.alert('Water', 'Found your capital on land, not in the ocean.');
      return;
    }
    if (territory.ownerId) {
      Alert.alert('Claimed', `${territory.ownerName || 'Another nation'} already holds this land.`);
      return;
    }
    placingBusy.current = true;
    Alert.alert(
      'Found your capital here?',
      `${territory.biome.replace(/_/g, ' ')} at (${Math.round(territory.col)}, ${Math.round(territory.row)})`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => { placingBusy.current = false; } },
        {
          text: 'Found here',
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('pending_nation');
              if (!raw) {
                Alert.alert('Missing quiz', 'Go back and finish founding first.');
                placingBusy.current = false;
                return;
              }
              const pending = JSON.parse(raw);
              setLoading(true);
              setLoadingStatus('Founding your nation...');
              const response = await api.createNation(
                pending.userId,
                pending.quizResult,
                pending.race || 'human',
                pending.worldId,
                { col: Math.round(territory.col), row: Math.round(territory.row) }
              );
              if (!response.success || !response.nation) {
                throw new Error(response.detail || 'Create failed');
              }
              await AsyncStorage.setItem('user_id', pending.userId);
              await AsyncStorage.removeItem('pending_nation');
              await saveNation(response.nation);
              router.replace('/(tabs)/overview');
            } catch (e: any) {
              setLoading(false);
              placingBusy.current = false;
              Alert.alert('Could not found here', e?.message || 'Try another tile.');
            }
          },
        },
      ]
    );
  };

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
        <Text style={styles.loadingSubtext}>First load carves the world; later loads are much faster</Text>
      </View>
    );
  }

  const mapWidth = MAP_WIDTH;
  const mapHeight = MAP_HEIGHT;
  const sliceW = Math.round(mapWidth * zoom);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(placing ? '/quiz' : '/(tabs)/nation')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00E0C7" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{placing ? 'Place Capital' : 'World Map'}</Text>
          <Text style={styles.subtitle}>{placing ? 'Tap unclaimed land' : 'Voronoi Territories'}</Text>
        </View>
        {!placing && (
        <TouchableOpacity onPress={zoomToMyNation} style={styles.myNationButton}>
          <Ionicons name="locate" size={20} color="#F3F6FA" />
        </TouchableOpacity>
        )}
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

      <View style={{ flex: 1 }} onLayout={onMapViewportLayout}>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        style={{ flex: 1 }}
        contentContainerStyle={{
          minWidth: mapWidth * zoom * 3,
          minHeight: Math.max(viewport.h, mapHeight * zoom),
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
        showsHorizontalScrollIndicator={true}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const worldW = mapWidth * zoom;
          if (worldW < 8) return;
          if (x < worldW * 0.45) {
            horizontalScrollRef.current?.scrollTo({ x: x + worldW, animated: false });
          } else if (x > worldW * 1.55) {
            horizontalScrollRef.current?.scrollTo({ x: x - worldW, animated: false });
          }
        }}
        scrollEventThrottle={16}
      >
        <ScrollView
          ref={verticalScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            minHeight: Math.max(viewport.h, mapHeight * zoom),
            justifyContent: 'center',
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={true}
        >
        <View style={{ width: mapWidth * zoom * 3, height: mapHeight * zoom }}>
          <Pressable
            onPress={handleMapPress}
            style={{ width: mapWidth * zoom * 3, height: mapHeight * zoom }}
          >
            {[0, 1, 2].map((copy) => (
              mapImageUri ? (
                <Image
                  key={copy}
                  source={{ uri: mapImageUri }}
                  style={{
                    position: 'absolute',
                    left: copy * sliceW,
                    top: 0,
                    width: sliceW + 2,
                    height: mapHeight * zoom,
                  }}
                  resizeMode="stretch"
                />
              ) : null
            ))}
          </Pressable>
          <Svg
            width={mapWidth * zoom * 3}
            height={mapHeight * zoom}
            style={{ position: 'absolute', left: 0, top: 0 }}
            pointerEvents="none"
          >
            {[0, 1, 2].map((copy) => (
              <G key={`wrap-${copy}`} x={copy * sliceW}>
            {mapMode === 'timezone' && Array.from({ length: 24 }, (_, band) => {
              const col = ((band + 0.5) / 24) * MAP_COLS;
              const x = col * CELL_SCALE * zoom;
              const y = Math.min(mapHeight * zoom - 16, Math.max(16, mercatorY(MAP_ROWS / 2) * zoom));
              return (
                <SvgText
                  key={`tz-${band}`}
                  x={x}
                  y={y}
                  fontSize={Math.min(Math.max(9, 11 * zoom), 13)}
                  fill="#F3F6FA"
                  textAnchor="middle"
                  fontWeight="700"
                  opacity={0.92}
                >
                  {timezoneLabel(col)}
                </SvgText>
              );
            })}
            {/* Nation territory discs - make territories visible at global zoom */}
            {nationClusters.map((cluster) => {
              const centerTerritory = territories.find(
                t => t.col === cluster.centerCol && t.row === cluster.centerRow
              );
              if (!centerTerritory || !cluster.discRadius) return null;
              const discR = Math.max(cluster.discRadius * CELL_SCALE * zoom * 1.1, 18);
              return (
                <Circle
                  key={`disc-${cluster.nationId}`}
                  cx={centerTerritory.x * zoom}
                  cy={centerTerritory.y * zoom}
                  r={discR}
                  fill={cluster.color}
                  opacity={0.22}
                  pointerEvents="none"
                />
              );
            })}
            
            {/* Render nation flags at cluster centers */}
            {nationClusters.map((cluster) => {
              const centerTerritory = territories.find(
                t => t.col === cluster.centerCol && t.row === cluster.centerRow
              );
              
              if (!centerTerritory) return null;
              
              const centerX = centerTerritory.x * zoom;
              const centerY = centerTerritory.y * zoom;
              const flagSize = Math.min(Math.max(CELL_SCALE * zoom * 4, 14), 48);
              const flagWidth = flagSize * 1.5;
              const flagHeight = flagSize;
              const labelVisible = zoom > 0.08;

              return (
                <G key={`flag-${cluster.nationId}`}>
                  {/* Fallback marker for nations without a flag */}
                  {!cluster.flag && (
                    <Circle
                      cx={centerX}
                      cy={centerY - flagHeight * 0.3}
                      r={flagSize * 0.55}
                      fill={cluster.color}
                      stroke="#0B0F14"
                      strokeWidth={1}
                    />
                  )}

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
                  {labelVisible && (
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
                        fontSize={Math.min(Math.max(10, 13 * zoom), 14)}
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
              </G>
            ))}
          </Svg>
        </View>
        </ScrollView>
      </ScrollView>
      </View>

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
              <Text style={styles.infoText}>{timezoneLabel(selectedTerritory.col)}</Text>
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
