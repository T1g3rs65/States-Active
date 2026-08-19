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
