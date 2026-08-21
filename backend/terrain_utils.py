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


_MAP_COLS = 505
_MAP_ROWS = 284
_minmax_cache: dict = {}


def _cylinder_fbm(noise: SimplexNoise, col: float, row: float, freq: float, octaves: int, pers: float) -> float:
    t = (2.0 * math.pi * col) / _MAP_COLS
    r = _MAP_COLS / (2.0 * math.pi)
    a = noise.fbm(math.cos(t) * r * freq, row * freq, octaves, pers)
    b = noise.fbm(math.sin(t) * r * freq, row * freq + 50, octaves, pers)
    return (a + b) * 0.5


def _cylinder_noise2d(noise: SimplexNoise, col: float, row: float, fx: float, fy: float) -> float:
    t = (2.0 * math.pi * col) / _MAP_COLS
    r = _MAP_COLS / (2.0 * math.pi)
    return (
        noise.noise2D(math.cos(t) * r * fx, row * fy) * 0.5
        + noise.noise2D(math.sin(t) * r * fx, row * fy + 80) * 0.5
    )


def _cylinder_ridged(noise: SimplexNoise, col: float, row: float, fx: float, fy: float, octaves: int) -> float:
    t = (2.0 * math.pi * col) / _MAP_COLS
    r = _MAP_COLS / (2.0 * math.pi)
    return (
        noise.ridged(math.cos(t) * r * fx, row * fy, octaves) * 0.5
        + noise.ridged(math.sin(t) * r * fx, row * fy + 90, octaves) * 0.5
    )


def _elevation(noise: SimplexNoise, col: float, row: float) -> float:
    continent_mask = _cylinder_fbm(noise, col, row, 0.002, 3, 0.5)
    base = _cylinder_fbm(noise, col, row, 0.01, 4, 0.35) * 0.6
    ridges = pow(_cylinder_ridged(noise, col, row, 0.02, 0.02, 5), 1.8) * 0.35
    directional = abs(_cylinder_noise2d(noise, col, row, 0.005, 0.12)) * -0.2
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
    center_col, center_row = _MAP_COLS // 2, _MAP_ROWS // 2
    row_lo, row_hi = 24, _MAP_ROWS - 24

    def wrap_dx(a: int, b: int) -> float:
        d = (a - b) % _MAP_COLS
        if d > _MAP_COLS / 2:
            d -= _MAP_COLS
        return d

    for attempt in range(max_attempts):
        if nation_count == 0 and attempt == 0:
            test_col, test_row = center_col, center_row
        else:
            angle = (nation_count + attempt) * 2.4 + random.uniform(-0.5, 0.5)
            radius = 15 + (attempt * 2.5) + random.uniform(-3, 3)
            test_col = int(center_col + radius * math.cos(angle)) % _MAP_COLS
            test_row = int(center_row + radius * math.sin(angle))

        if not (row_lo < test_row < row_hi):
            continue
        if not is_land_tile(test_col, test_row, seed):
            continue

        valid_distance = True
        for (ex_col, ex_row) in existing_positions:
            dx = wrap_dx(test_col, ex_col)
            distance = math.sqrt(dx ** 2 + (test_row - ex_row) ** 2)
            if distance < min_distance:
                valid_distance = False
                break
        if valid_distance:
            return (test_col, test_row)

    for grid_row in range(40, _MAP_ROWS - 34, 8):
        for grid_col in range(0, _MAP_COLS, 8):
            if not is_land_tile(grid_col, grid_row, seed):
                continue
            valid = True
            for (ex_col, ex_row) in existing_positions:
                dx = wrap_dx(grid_col, ex_col)
                if math.sqrt(dx ** 2 + (grid_row - ex_row) ** 2) < min_distance:
                    valid = False
                    break
            if valid:
                return (grid_col, grid_row)

    return (center_col, center_row)


def _wrap_dx(a: int, b: int) -> float:
    d = (a - b) % _MAP_COLS
    if d > _MAP_COLS / 2:
        d -= _MAP_COLS
    return d


def capacity_from_population(population: float) -> int:
    p = float(population or 0)
    if p < 1: return 3
    if p < 5: return 10
    if p < 10: return 20
    if p < 50: return 40
    if p < 100: return 70
    if p < 500: return 150
    if p < 1000: return 250
    if p < 5000: return 500
    if p < 10000: return 800
    if p < 25000: return 1200
    if p < 50000: return 1800
    if p < 100000: return 2500
    if p < 200000: return 3500
    if p < 300000: return 4000
    return 5000


def extra_city_count(population: float) -> int:
    cap = capacity_from_population(population)
    if cap < 40:
        return 0
    if cap < 150:
        return 1
    if cap < 500:
        return 2
    if cap < 1200:
        return 3
    if cap < 2500:
        return 4
    return 5


def snap_to_land(col: int, row: int, seed: int, max_r: int = 12):
    col = int(col) % _MAP_COLS
    row = int(row)
    if is_land_tile(col, row, seed) and 2 <= row <= _MAP_ROWS - 3:
        return col, row
    best = None
    best_d = 1e9
    for dr in range(-max_r, max_r + 1):
        for dc in range(-max_r, max_r + 1):
            c = (col + dc) % _MAP_COLS
            r = row + dr
            if r < 2 or r > _MAP_ROWS - 3:
                continue
            if not is_land_tile(c, r, seed):
                continue
            d = math.hypot(dc, dr)
            if d < best_d:
                best_d = d
                best = (c, r)
    return best


def validate_capital_site(col: int, row: int, seed: int, others: list):
    """others: list of (col, row, population). Returns (error, col, row)."""
    col = int(col) % _MAP_COLS
    row = int(row)
    if row < 2 or row > _MAP_ROWS - 3:
        return ("Too close to the poles.", col, row)
    snapped = snap_to_land(col, row, seed)
    if not snapped:
        return ("That tile is water.", col, row)
    col, row = snapped
    for ex_col, ex_row, pop in others:
        cap = capacity_from_population(pop)
        radius = max(6, math.sqrt(cap) * 1.15)
        dist = math.hypot(_wrap_dx(col, int(ex_col)), row - int(ex_row))
        if dist < radius:
            return ("That land is already claimed.", col, row)
    return ("", col, row)
