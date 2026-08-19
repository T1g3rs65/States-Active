"""
Simplex Noise implementation for terrain generation.
Used to ensure nation placement only occurs on land tiles.
"""
import math
from typing import List, Tuple

# Permutation table for noise generation
PERM = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
        8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
        35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
        134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
        55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
        18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
        250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
        189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
        172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
        228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
        107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]

# Extend permutation table
P = PERM + PERM

# Gradients for 2D simplex noise
GRAD2 = [
    (1, 1), (-1, 1), (1, -1), (-1, -1),
    (1, 0), (-1, 0), (0, 1), (0, -1)
]

def dot2(g: Tuple[int, int], x: float, y: float) -> float:
    """Dot product of gradient and distance vectors."""
    return g[0] * x + g[1] * y

class SimplexNoise:
    """Simplex noise generator with seed support."""
    
    def __init__(self, seed: int = 0):
        """Initialize with a seed for reproducibility."""
        self.seed = seed
        # Create seeded permutation table
        import random
        rng = random.Random(seed)
        self.perm = list(range(256))
        rng.shuffle(self.perm)
        self.perm = self.perm + self.perm
    
    def noise2D(self, x: float, y: float) -> float:
        """Generate 2D simplex noise value between -1 and 1."""
        # Skewing factors for 2D
        F2 = 0.5 * (math.sqrt(3.0) - 1.0)
        G2 = (3.0 - math.sqrt(3.0)) / 6.0
        
        # Skew input space
        s = (x + y) * F2
        i = math.floor(x + s)
        j = math.floor(y + s)
        
        t = (i + j) * G2
        X0 = i - t
        Y0 = j - t
        x0 = x - X0
        y0 = y - Y0
        
        # Determine which simplex we're in
        if x0 > y0:
            i1, j1 = 1, 0
        else:
            i1, j1 = 0, 1
        
        x1 = x0 - i1 + G2
        y1 = y0 - j1 + G2
        x2 = x0 - 1.0 + 2.0 * G2
        y2 = y0 - 1.0 + 2.0 * G2
        
        # Hashed gradient indices
        ii = i & 255
        jj = j & 255
        
        gi0 = self.perm[ii + self.perm[jj]] % 8
        gi1 = self.perm[ii + i1 + self.perm[jj + j1]] % 8
        gi2 = self.perm[ii + 1 + self.perm[jj + 1]] % 8
        
        # Calculate contributions from three corners
        n0 = n1 = n2 = 0.0
        
        t0 = 0.5 - x0*x0 - y0*y0
        if t0 >= 0:
            t0 *= t0
            n0 = t0 * t0 * dot2(GRAD2[gi0], x0, y0)
        
        t1 = 0.5 - x1*x1 - y1*y1
        if t1 >= 0:
            t1 *= t1
            n1 = t1 * t1 * dot2(GRAD2[gi1], x1, y1)
        
        t2 = 0.5 - x2*x2 - y2*y2
        if t2 >= 0:
            t2 *= t2
            n2 = t2 * t2 * dot2(GRAD2[gi2], x2, y2)
        
        # Sum and scale to [-1, 1]
        return 70.0 * (n0 + n1 + n2)
    
    def fbm(self, x: float, y: float, octaves: int = 4, persistence: float = 0.5) -> float:
        """Fractal Brownian Motion - layered noise for natural terrain."""
        total = 0.0
        amplitude = 1.0
        frequency = 1.0
        max_value = 0.0
        
        for _ in range(octaves):
            total += self.noise2D(x * frequency, y * frequency) * amplitude
            max_value += amplitude
            amplitude *= persistence
            frequency *= 2.0
        
        return total / max_value
    
    def ridged(self, x: float, y: float, octaves: int = 4) -> float:
        """Ridged multifractal noise for mountain ranges."""
        total = 0.0
        amplitude = 1.0
        frequency = 1.0
        
        for _ in range(octaves):
            n = self.noise2D(x * frequency, y * frequency)
            n = 1.0 - abs(n)  # Create ridges
            total += n * amplitude
            amplitude *= 0.5
            frequency *= 2.0
        
        return total / 2.0


def is_land_tile(col: int, row: int, seed: int = 123456) -> bool:
    """
    Check if a tile at (col, row) is land based on terrain generation.
    Uses the same algorithm as the frontend world-map.tsx.
    """
    noise = SimplexNoise(seed)
    
    # Same terrain generation as frontend
    continent_mask = noise.fbm(col * 0.002, row * 0.002, 3, 0.5)
    base = noise.fbm(col / 100, row / 100, 4, 0.35) * 0.6
    ridges = pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.35
    directional = abs(noise.noise2D(col * 0.005, row * 0.12)) * -0.2
    
    # Blend continent mask with elevation (70% smooth, 30% detail)
    elevation = continent_mask * 0.7 + (base + ridges + directional) * 0.3
    
    # Normalize elevation (approximate since we don't have global min/max)
    # Based on typical values, elevation ranges roughly -0.5 to 0.8
    normalized = (elevation + 0.5) / 1.3
    normalized = max(0.0, min(1.0, normalized))
    
    # Land threshold: above 0.40 is definitely land (conservative to avoid coastlines)
    # Ocean is < 0.35, so 0.40+ gives safe margin
    return normalized > 0.42


def find_land_position(existing_positions: set, seed: int = 123456, min_distance: int = 25) -> Tuple[int, int]:
    """
    Find a valid land position for a new nation.
    Returns (col, row) tuple.
    """
    import random
    
    nation_count = len(existing_positions)
    max_attempts = 500
    
    for attempt in range(max_attempts):
        if nation_count == 0 and attempt == 0:
            # First nation - try center
            test_col, test_row = 100, 100
        else:
            # Spiral outward with randomization
            angle = (nation_count + attempt) * 2.4 + random.uniform(-0.5, 0.5)
            radius = 15 + (attempt * 2.5) + random.uniform(-3, 3)
            test_col = int(100 + radius * math.cos(angle))
            test_row = int(100 + radius * math.sin(angle))
        
        # Check bounds
        if not (20 < test_col < 180 and 20 < test_row < 180):
            continue
        
        # Check if it's land
        if not is_land_tile(test_col, test_row, seed):
            continue
        
        # Check distance from existing nations
        valid_distance = True
        for (ex_col, ex_row) in existing_positions:
            distance = math.sqrt((test_col - ex_col)**2 + (test_row - ex_row)**2)
            if distance < min_distance:
                valid_distance = False
                break
        
        if valid_distance:
            return (test_col, test_row)
    
    # Fallback: grid search for any land tile
    for grid_row in range(30, 170, 20):
        for grid_col in range(30, 170, 20):
            if is_land_tile(grid_col, grid_row, seed):
                valid = True
                for (ex_col, ex_row) in existing_positions:
                    if math.sqrt((grid_col - ex_col)**2 + (grid_row - ex_row)**2) < min_distance:
                        valid = False
                        break
                if valid:
                    return (grid_col, grid_row)
    
    # Ultimate fallback
    return (100, 100)
