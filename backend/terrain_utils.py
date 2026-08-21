"""
Terrain helpers for nation placement. Noise matches frontend/utils/noise.ts
so land checks agree with the Voronoi map.
"""
import math
from typing import Tuple


class SimplexNoise:
    """Match frontend/utils/noise.ts (LCG perm + fade/lerp value noise)."""

    def __init__(self, seed: int = 0):
        self.seed = seed
        p = list(range(256))
        s = float(seed)
        for i in range(255, 0, -1):
            s = (s * 9301 + 49297) % 233280
            n = int((s / 233280) * (i + 1))
            p[i], p[n] = p[n], p[i]
        self.perm = p + p

    def noise2D(self, x: float, y: float) -> float:
        X = int(math.floor(x)) & 255
        Y = int(math.floor(y)) & 255
        x -= math.floor(x)
        y -= math.floor(y)
        u = x * x * x * (x * (x * 6 - 15) + 10)
        v = y * y * y * (y * (y * 6 - 15) + 10)
        A = self.perm[X] + Y
        B = self.perm[X + 1] + Y

        def grad(h: int, gx: float, gy: float) -> float:
            hh = h & 3
            uu = gx if hh < 2 else gy
            vv = gy if hh < 2 else gx
            return (uu if (hh & 1) == 0 else -uu) + (vv if (hh & 2) == 0 else -vv)

        def lerp(t: float, a: float, b: float) -> float:
            return a + t * (b - a)

        return lerp(
            v,
            lerp(u, grad(self.perm[A], x, y), grad(self.perm[B], x - 1, y)),
            lerp(u, grad(self.perm[A + 1], x, y - 1), grad(self.perm[B + 1], x - 1, y - 1)),
        )

    def fbm(self, x: float, y: float, octaves: int = 4, persistence: float = 0.5) -> float:
        total = 0.0
        amplitude = 1.0
        frequency = 1.0
        max_value = 0.0
        for _ in range(octaves):
            total += self.noise2D(x * frequency, y * frequency) * amplitude
            max_value += amplitude
            amplitude *= persistence
            frequency *= 2.0
        return total / max_value if max_value else 0.0

    def ridged(self, x: float, y: float, octaves: int = 5) -> float:
        total = 0.0
        amplitude = 1.0
        frequency = 1.0
        max_value = 0.0
        for _ in range(octaves):
            n = abs(self.noise2D(x * frequency, y * frequency))
            ridge = 1.0 - n
            total += ridge * amplitude
            max_value += amplitude
            amplitude *= 0.5
            frequency *= 2.0
        return total / max_value if max_value else 0.0


_MAP_COLS = 160
_MAP_ROWS = 284
_minmax_cache: dict = {}


def _elevation(noise: SimplexNoise, col: float, row: float) -> float:
    continent_mask = noise.fbm(col * 0.002, row * 0.002, 3, 0.5)
    base = noise.fbm(col / 100, row / 100, 4, 0.35) * 0.6
    ridges = pow(noise.ridged(col * 0.02, row * 0.02, 5), 1.8) * 0.35
    directional = abs(noise.noise2D(col * 0.005, row * 0.12)) * -0.2
    return continent_mask * 0.7 + (base + ridges + directional) * 0.3


def _minmax(seed: int) -> Tuple[float, float]:
    if seed in _minmax_cache:
        return _minmax_cache[seed]
    noise = SimplexNoise(seed)
    min_e = float("inf")
    max_e = float("-inf")
    for r in range(40):
        for c in range(40):
            col = (c / 39.0) * _MAP_COLS
            row = (r / 39.0) * _MAP_ROWS
            e = _elevation(noise, col, row)
            min_e = min(min_e, e)
            max_e = max(max_e, e)
    _minmax_cache[seed] = (min_e, max_e)
    return min_e, max_e


def is_land_tile(col: int, row: int, seed: int = 123456) -> bool:
    """Same elevation field as frontend Voronoi. Water if normalized < 0.45."""
    min_e, max_e = _minmax(seed)
    e = _elevation(SimplexNoise(seed), col, row)
    span = max_e - min_e
    normalized = (e - min_e) / span if span else 0.5
    return normalized >= 0.52


def find_land_position(existing_positions: set, seed: int = 123456, min_distance: int = 25) -> Tuple[int, int]:
    """Find a valid inland position for a new nation. Returns (col, row)."""
    import random

    nation_count = len(existing_positions)
    max_attempts = 800
    center_col, center_row = 80, 142
    col_lo, col_hi = 18, 142
    row_lo, row_hi = 24, 260

    for attempt in range(max_attempts):
        if nation_count == 0 and attempt == 0:
            test_col, test_row = center_col, center_row
        else:
            angle = (nation_count + attempt) * 2.4 + random.uniform(-0.5, 0.5)
            radius = 15 + (attempt * 2.5) + random.uniform(-3, 3)
            test_col = int(center_col + radius * math.cos(angle))
            test_row = int(center_row + radius * math.sin(angle))

        if not (col_lo < test_col < col_hi and row_lo < test_row < row_hi):
            continue
        if not is_land_tile(test_col, test_row, seed):
            continue

        valid_distance = True
        for (ex_col, ex_row) in existing_positions:
            distance = math.sqrt((test_col - ex_col) ** 2 + (test_row - ex_row) ** 2)
            if distance < min_distance:
                valid_distance = False
                break
        if valid_distance:
            return (test_col, test_row)

    for grid_row in range(40, 250, 8):
        for grid_col in range(25, 140, 8):
            if not is_land_tile(grid_col, grid_row, seed):
                continue
            valid = True
            for (ex_col, ex_row) in existing_positions:
                if math.sqrt((grid_col - ex_col) ** 2 + (grid_row - ex_row) ** 2) < min_distance:
                    valid = False
                    break
            if valid:
                return (grid_col, grid_row)

    return (80, 142)
