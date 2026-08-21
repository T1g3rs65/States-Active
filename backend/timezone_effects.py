"""Timezone policy: keep-the-sun vs one-clock tradeoffs."""

from typing import Dict, Optional


def timezone_deltas(geo_max: int, count: int, daily: bool = False) -> Dict[str, float]:
    """Positive = good for that stat's usual direction (caller still clamps)."""
    geo_max = max(1, int(geo_max or 1))
    count = max(1, min(geo_max, int(count or geo_max)))
    if geo_max < 2:
        return {}
    # t=0 keep every geographic hour; t=1 one national clock
    t = (geo_max - count) / (geo_max - 1)
    w = geo_max ** 0.7
    k = 0.025 if daily else 1.6
    return {
        "happiness": (2.4 * (1 - t) - 3.6 * t) * w * k,
        "life_expectancy": (0.6 * (1 - t) - 0.9 * t) * w * k,
        "gdp": (-2.0 * (1 - t) + 3.2 * t) * w * k,
        "economy_growth": (-0.4 * (1 - t) + 0.7 * t) * w * k,
        "scientific_advancement": (-0.5 * (1 - t) + 1.1 * t) * w * k,
        "military_strength": (-0.3 * (1 - t) + 0.8 * t) * w * k,
        "law_enforcement": (-0.3 * (1 - t) + 0.7 * t) * w * k,
        "corruption": (1.2 * (1 - t) - 1.0 * t) * w * k,
        "political_apathy": (0.8 * (1 - t) - 0.4 * t) * w * k,
        "civil_rights": (0.5 * (1 - t) - 1.4 * t) * w * k,
        "international_approval": (0.7 * (1 - t) - 0.9 * t) * w * k,
        "crime_rate": (0.4 * (1 - t) - 0.2 * t) * w * k,
    }


def apply_timezone_tick(nation: dict) -> None:
    stats = nation.get("stats") or {}
    geo = int(nation.get("timezone_geo_max") or 1)
    count = nation.get("timezone_count")
    count = geo if count is None else int(count)
    for key, delta in timezone_deltas(geo, count, daily=True).items():
        if key not in stats:
            continue
        hi = 0.7 if key == "gini_coefficient" else 100.0
        lo = 0.0
        if key == "life_expectancy":
            lo = 40.0
        stats[key] = max(lo, min(hi, float(stats[key]) + delta))
    nation["stats"] = stats
