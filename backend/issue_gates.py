"""Issue deck gates: current stats force at least one matching dilemma."""
from __future__ import annotations

from typing import Any, List


def _s(nation: Any) -> dict:
    if isinstance(nation, dict):
        return nation.get("stats") or {}
    return getattr(nation, "stats", None).__dict__ if False else (
        nation.stats.dict() if hasattr(getattr(nation, "stats", None), "dict") else dict(getattr(nation, "stats", {}) or {})
    )


def _g(stats: dict, key: str, default: float = 50.0) -> float:
    try:
        v = stats.get(key, default) if isinstance(stats, dict) else getattr(stats, key, default)
        return float(v if v is not None else default)
    except (TypeError, ValueError):
        return default


def required_themes(nation: Any) -> List[str]:
    stats = nation.get("stats") if isinstance(nation, dict) else getattr(nation, "stats", None)
    if stats is None:
        return []
    if not isinstance(stats, dict):
        try:
            stats = stats.model_dump() if hasattr(stats, "model_dump") else dict(stats)
        except Exception:
            stats = {}

    form = ""
    subtype = ""
    if isinstance(nation, dict):
        form = str(nation.get("government_form") or "")
        subtype = str(nation.get("government_subtype") or "")
    else:
        form = str(getattr(nation, "government_form", "") or "")
        subtype = str(getattr(nation, "government_subtype", "") or "")

    out: List[str] = []
    crime = _g(stats, "crime_rate", 5)
    sci = _g(stats, "scientific_advancement", 50)
    unemp = _g(stats, "unemployment", 5)
    poll = _g(stats, "pollution", 50)
    mil = _g(stats, "military_strength", 20)
    vote = _g(stats, "voting_rights", 50)
    infl = _g(stats, "inflation", 2)
    debt = _g(stats, "national_debt", 40)
    tax = _g(stats, "tax_rate", 25)
    happy = _g(stats, "happiness", 50)

    if crime >= 10:
        out.append("street crime, gangs, or the reach of the police")
    if sci >= 62:
        out.append("laboratories, patents, campuses, or a new device in the street")
    if unemp >= 10:
        out.append("jobs, layoffs, or the dole")
    if poll >= 65:
        out.append("smog, rivers, or a plant that will not close")
    if mil >= 58:
        out.append("the army, conscription, or a border scare")
    if vote <= 35:
        out.append("the ballot, a banned rally, or who counts the votes")
    if infl >= 6 or infl <= -1:
        out.append("prices in the market and what a loaf costs")
    if debt >= 75:
        out.append("the debt, a bond sale, or a lender at the door")
    if tax <= 8 or "anarch" in (subtype + form).lower():
        out.append("who, if anyone, collects tax — and what fills the pot")
    if happy <= 32:
        out.append("a restless street and a government that looks away")

    # de-dupe, cap
    seen = set()
    uniq = []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq[:3]


def neglected_stats(nation: Any, limit: int = 3) -> List[str]:
    """Stats not moved by an issue in a while (or never)."""
    from stats_config import STAT_DEFINITIONS

    skip = {
        "tax_revenue",
        "gini_coefficient",
        "alliance_power",
        "civil_rights",
        "political_freedom",
    }
    if isinstance(nation, dict):
        hits = nation.get("stat_last_hit") or {}
        n = int(nation.get("total_decisions") or 0)
    else:
        hits = getattr(nation, "stat_last_hit", None) or {}
        n = int(getattr(nation, "total_decisions", 0) or 0)
    if n < 6:
        return []
    stale = []
    for key in STAT_DEFINITIONS:
        if key in skip:
            continue
        last = hits.get(key)
        try:
            last_n = int(last) if last is not None else -999
        except (TypeError, ValueError):
            last_n = -999
        age = n - last_n if last_n >= 0 else n + 50
        if age >= 8:
            stale.append((age, key))
    stale.sort(reverse=True)
    return [k for _, k in stale[:limit]]


def prompt_block(nation: Any) -> str:
    themes = required_themes(nation)
    neglected = neglected_stats(nation)
    parts = []
    if themes:
        listed = "; ".join(themes)
        parts.append(
            f"- STAT GATES: Conditions in this nation REQUIRE at least one issue in this batch about: {listed}. "
            "Do not skip these. Other issues may be ordinary life."
        )
    if neglected:
        from stats_config import STAT_DEFINITIONS
        names = ", ".join(
            f"{k} ({STAT_DEFINITIONS.get(k, {}).get('name', k)})" for k in neglected
        )
        parts.append(
            f"- NEGLECTED STATS: These have not been on an issue in a while: {names}. "
            "At least one issue in this batch MUST have choices whose effects include those exact stat names. "
            "Do not only talk about them in prose — put them in the JSON effects."
        )
    return "\n".join(parts)
