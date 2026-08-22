// Dijkstra cost-based expansion for realistic borders
export function dijkstraExpansion(
  territories: any[],
  capitalCol: number,
  capitalRow: number,
  expansionLimit: number,
  maxTiles: number = Infinity // Hard cap on number of tiles
): Set<string> {
  const claimedTiles = new Set<string>();
  const costs = new Map<string, number>();
  const visited = new Set<string>(); // Track visited tiles
  const pq: Array<{ id: string; cost: number }> = [];
  
  // Start from capital
  const capitalId = `${capitalCol}-${capitalRow}`;
  pq.push({ id: capitalId, cost: 0 });
  costs.set(capitalId, 0);
  
  let iterations = 0;
  const maxIterations = 50000; // Safety limit
  
  while (pq.length > 0 && iterations < maxIterations && claimedTiles.size < maxTiles) {
    iterations++;
    
    // Sort and pop lowest cost (simple priority queue)
    pq.sort((a, b) => a.cost - b.cost);
    const current = pq.shift()!;
    
    // Skip if already visited
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    if (current.cost > expansionLimit) continue;
    
    const territory = territories.find(t => t.id === current.id);
    if (!territory) continue;
    
    // Skip if already owned by another nation
    if (territory.ownerId) continue;
    
    claimedTiles.add(current.id);
    
    // Expand to neighbors
    const neighbors = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
      [1, -1], [-1, -1], [1, 1], [-1, 1]
    ];
    
    for (const [dc, dr] of neighbors) {
      const neighbor = territories.find(
        t => t.col === territory.col + dc && t.row === territory.row + dr
      );
      
      if (!neighbor) continue;
      
      // Calculate terrain cost
      let terrainCost = 1.0;
      
      if (neighbor.biome === 'abyss' || neighbor.biome === 'midnight_zone') {
        terrainCost = 100; // Impossible
      } else if (neighbor.biome === 'deep_ocean') {
        terrainCost = 30;
      } else if (neighbor.biome === 'shallow_sea') {
        terrainCost = 15;
      } else if (neighbor.biome === 'rocky_mountain' || neighbor.biome === 'alpine_tundra') {
        terrainCost = 10;
      } else if (neighbor.biome === 'swamp' || neighbor.biome === 'marsh' || neighbor.biome === 'wetland') {
        terrainCost = 6;
      } else if (neighbor.biome === 'hot_desert' || neighbor.biome === 'barren') {
        terrainCost = 5;
      } else if (neighbor.biome === 'arctic_tundra' || neighbor.biome === 'tundra') {
        terrainCost = 7;
      } else if (neighbor.biome.includes('forest')) {
        terrainCost = 3;
      } else if (neighbor.biome === 'river') {
        terrainCost = 0.6; // Rivers help!
      } else if (neighbor.biome === 'grassland' || neighbor.biome === 'temperate_grassland' || neighbor.biome === 'savanna') {
        terrainCost = 0.8; // Plains easy
      }
      
      // Add randomness (±10%)
      const jitter = ((Math.sin((neighbor.col + 1) * 12.9898 + (neighbor.row + 1) * 78.233) * 43758.5453) % 1 + 1) % 1;
      terrainCost *= 0.9 + jitter * 0.2;
      
      const newCost = current.cost + terrainCost;
      const neighborId = neighbor.id;
      
      if (!costs.has(neighborId) || newCost < costs.get(neighborId)!) {
        costs.set(neighborId, newCost);
        pq.push({ id: neighborId, cost: newCost });
      }
    }
  }
  
  console.log(`Dijkstra completed: ${iterations} iterations, ${claimedTiles.size} tiles claimed, pq max size: ${pq.length}`);
  
  return claimedTiles;
}
