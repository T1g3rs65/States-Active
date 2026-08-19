// Enhanced noise functions for realistic world generation
export class SimplexNoise {
  private perm: number[];

  constructor(seed: number = Math.random()) {
    this.perm = this.buildPermutationTable(seed);
  }

  private buildPermutationTable(seed: number): number[] {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    let n, q;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      n = Math.floor((seed / 233280) * (i + 1));
      q = p[i];
      p[i] = p[n];
      p[n] = q;
    }
    
    return [...p, ...p];
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
      this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // Fractional Brownian Motion (fBm) - multiple octaves
  fbm(x: number, y: number, octaves: number = 6, persistence: number = 0.5): number {
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

  // Ridged multifractal noise for mountain ranges
  ridged(x: number, y: number, octaves: number = 5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise2D(x * frequency, y * frequency));
      const ridge = 1 - n; // Invert to create ridges
      total += ridge * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / maxValue;
  }

  // Cellular/Worley noise for rivers (Distance2Add method)
  cellular(x: number, y: number, frequency: number = 0.018, jitter: number = 0.82): number {
    x *= frequency;
    y *= frequency;
    
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    
    let minDist1 = 999999;
    let minDist2 = 999999;
    
    // Check 3x3 grid of cells
    for (let yOffset = -1; yOffset <= 1; yOffset++) {
      for (let xOffset = -1; xOffset <= 1; xOffset++) {
        const cellX = xi + xOffset;
        const cellY = yi + yOffset;
        
        // Hash to get random point in cell
        const hash = (cellX * 374761393 + cellY * 668265263) & 0x7FFFFFFF;
        const xPoint = cellX + (hash % 1000) / 1000.0 * jitter;
        const yPoint = cellY + (Math.floor(hash / 1000) % 1000) / 1000.0 * jitter;
        
        // Distance to this cell point
        const dx = x - xPoint;
        const dy = y - yPoint;
        const dist = dx * dx + dy * dy; // EuclideanSq
        
        if (dist < minDist1) {
          minDist2 = minDist1;
          minDist1 = dist;
        } else if (dist < minDist2) {
          minDist2 = dist;
        }
      }
    }
    
    // Distance2Add - returns sum of two closest
    return (Math.sqrt(minDist1) + Math.sqrt(minDist2)) * 0.5;
  }
}
