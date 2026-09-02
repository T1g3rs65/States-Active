"""Daily macro coupling: stats pull on each other with small, realistic drifts.

Runs once per UTC day on nation load (same cadence as advisors).
Does not rewrite player budgets. Lifetime STAT_DEFINITIONS clamps apply.
"""
from __future__ import annotations

from typing import Any

from stats_config import STAT_DEFINITIONS


DRIFT = 0.33
STOCKS = {
    "inflation",
    "national_debt",
    "gdp",
    "life_expectancy",
    "population",
    "tax_revenue",
}


def _g(stats: dict, key: str, default: float = 50.0) -> float:
    try:
        return float(stats.get(key, default) or default)
    except (TypeError, ValueError):
        return default


def _set(stats: dict, key: str, value: float) -> None:
    spec = STAT_DEFINITIONS.get(key)
    if spec:
        lo, hi = float(spec["min"]), float(spec["max"])
    else:
        lo, hi = 0.0, 100.0
    stats[key] = max(lo, min(hi, value))


def _add(stats: dict, key: str, delta: float) -> None:
    delta *= DRIFT
    if key in STOCKS:
        delta *= 0.5
    _set(stats, key, _g(stats, key) + delta)


def apply_macro_tick(nation: dict) -> None:
    """Mutate nation['stats'] in place. Safe to call with missing keys."""
    stats: dict[str, Any] = nation.get("stats") or {}
    if not stats:
        return

    gdp = _g(stats, "gdp", 20)
    growth = _g(stats, "economy_growth", 2)
    unemp = _g(stats, "unemployment", 5)
    infl = _g(stats, "inflation", 2)
    tax = _g(stats, "tax_rate", 25)
    debt = _g(stats, "national_debt", 40)
    happy = _g(stats, "happiness", 50)
    eq = _g(stats, "income_equality", 50)
    crime = _g(stats, "crime_rate", 5)
    law = _g(stats, "law_enforcement", 50)
    health = _g(stats, "healthcare_quality", 50)
    env = _g(stats, "environment", 50)
    poll = _g(stats, "pollution", 50)
    sci = _g(stats, "scientific_advancement", 50)
    lit = _g(stats, "literacy_rate", 95)
    uni = _g(stats, "university_attendance", 30)
    mil = _g(stats, "military_strength", 20)
    corr = _g(stats, "corruption", 50)
    apathy = _g(stats, "political_apathy", 50)
    speech = _g(stats, "freedom_speech", 50)
    press = _g(stats, "freedom_press", 50)
    assembly = _g(stats, "freedom_assembly", 50)
    religion = _g(stats, "freedom_religion", 50)
    voting = _g(stats, "voting_rights", 50)
    life = _g(stats, "life_expectancy", 75)
    obese = _g(stats, "obesity_rate", 20)
    bio = _g(stats, "biodiversity", 50)
    foot = _g(stats, "eco_footprint", 50)
    pop = _g(stats, "population", 2.5)
    pop_g = _g(stats, "population_growth", 1)
    approval = _g(stats, "international_approval", 50)

    b_edu = _g(stats, "budget_education", 15)
    b_def = _g(stats, "budget_defense", 10)
    b_health = _g(stats, "budget_healthcare", 20)
    b_wel = _g(stats, "budget_welfare", 15)
    b_env = _g(stats, "budget_environment", 5)
    b_infra = _g(stats, "budget_infrastructure", 20)

    # --- Economy (Okun + Phillips, damped) ---
    # GDP index slowly follows growth. 2% growth ≈ +0.06 GDP index / day.
    _add(stats, "gdp", growth * 0.03)

    # Overheating: growth above ~2.2 or unemployment very low → inflation up.
    gap = growth - 2.2
    _add(stats, "inflation", gap * 0.06)
    if unemp < 4.5:
        _add(stats, "inflation", (4.5 - unemp) * 0.05)
    elif unemp > 8.5:
        _add(stats, "inflation", -(unemp - 8.5) * 0.04)

    # High tax cools growth, funds equality; very low tax the reverse.
    _add(stats, "economy_growth", -(tax - 28) * 0.012)
    _add(stats, "income_equality", (tax - 22) * 0.02)

    # Debt drag. Above 60% of GDP it eats growth and credibility.
    if debt > 60:
        _add(stats, "economy_growth", -(debt - 60) * 0.008)
        _add(stats, "international_approval", -(debt - 60) * 0.01)
        _add(stats, "inflation", (debt - 60) * 0.004)
    elif debt < 30:
        _add(stats, "economy_growth", 0.04)

    # Unemployment follows growth (Okun) and welfare (mild stabilizer).
    _add(stats, "unemployment", -(growth - 2.0) * 0.12)
    _add(stats, "unemployment", -(b_wel - 15) * 0.015)
    _add(stats, "unemployment", (sci - 50) * -0.004)  # productivity
    if gdp < 25:
        _add(stats, "unemployment", 0.06)

    # Inflation far from 2% hurts growth and mood.
    infl_err = infl - 2.0
    _add(stats, "economy_growth", -abs(infl_err) * 0.04)
    _add(stats, "happiness", -abs(infl_err) * 0.08)
    if infl > 6:
        _add(stats, "national_debt", 0.08)

    # Infrastructure + science → growth; heavy defense → slight growth tax.
    _add(stats, "economy_growth", (b_infra - 18) * 0.01 + (sci - 45) * 0.004)
    _add(stats, "economy_growth", -(max(0.0, b_def - 14) * 0.012))

    # Corruption leaks growth and approval.
    _add(stats, "economy_growth", -(corr - 45) * 0.006)
    _add(stats, "international_approval", -(corr - 50) * 0.02)

    # --- Crime & order ---
    _add(stats, "crime_rate", (unemp - 6) * 0.04 + (50 - eq) * 0.015 + (30 - gdp) * 0.01)
    _add(stats, "crime_rate", -(law - 50) * 0.025)
    if law > 70:
        _add(stats, "freedom_assembly", -0.08)
        _add(stats, "civil_rights", -0.04)
    _add(stats, "happiness", -(crime - 5) * 0.06)

    # --- Health, education, science ---
    _add(stats, "healthcare_quality", (b_health - 18) * 0.03)
    target_life = 68.0 + _g(stats, "healthcare_quality") * 0.14 - poll * 0.03
    _add(stats, "life_expectancy", (target_life - life) * 0.04)
    _add(stats, "obesity_rate", (gdp - 35) * 0.01 - (health - 50) * 0.015)
    _add(stats, "literacy_rate", (b_edu - 14) * 0.02)
    _add(stats, "university_attendance", (b_edu - 14) * 0.025 + (lit - 90) * 0.02)
    _add(stats, "scientific_advancement", (uni - 25) * 0.02 + (b_edu - 14) * 0.015)

    # --- Environment ---
    _add(stats, "pollution", (gdp - 30) * 0.012 - (b_env - 5) * 0.06)
    _add(stats, "environment", -(_g(stats, "pollution") - 45) * 0.02 + (b_env - 5) * 0.04)
    _add(stats, "biodiversity", (_g(stats, "environment") - 50) * 0.02 - (gdp - 35) * 0.008)
    _add(stats, "eco_footprint", (gdp - 30) * 0.015 - (b_env - 5) * 0.03)
    if _g(stats, "pollution") > 65:
        _add(stats, "life_expectancy", -0.04)
        _add(stats, "happiness", -0.08)

    # --- Society / politics ---
    _add(stats, "happiness", (eq - 50) * 0.02 + (health - 50) * 0.015 - (unemp - 6) * 0.08)
    _add(stats, "happiness", (env - 50) * 0.01)
    _add(stats, "political_apathy", (unemp - 6) * 0.02 + (corr - 50) * 0.015 - (happy - 50) * 0.02)
    _add(stats, "military_strength", (b_def - 10) * 0.025)
    if mil > 70 and b_def > 18:
        _add(stats, "international_approval", -0.05)

    # Population (thousands). Yearly % applied as a tiny daily step.
    _add(stats, "population_growth", (happy - 50) * 0.008 + (life - 74) * 0.01 - (unemp - 6) * 0.02)
    pop_g = _g(stats, "population_growth", 1)
    _add(stats, "population", pop * (pop_g / 100.0) * (1.0 / 120.0))

    # Linked identities — keep meaning coherent.
    eq = _g(stats, "income_equality")
    _set(stats, "gini_coefficient", 0.55 - 0.30 * (eq / 100.0))
    _set(
        stats,
        "civil_rights",
        (
            _g(stats, "freedom_speech")
            + _g(stats, "freedom_press")
            + _g(stats, "freedom_assembly")
            + _g(stats, "freedom_religion")
        )
        / 4.0,
    )
    _set(
        stats,
        "political_freedom",
        (_g(stats, "voting_rights") + (100.0 - _g(stats, "corruption"))) / 2.0,
    )

    # Tax take: rate × compliance. Corruption leaks.
    corr = _g(stats, "corruption")
    tax = _g(stats, "tax_rate", 25)
    compliance = max(0.28, min(0.98, 1.0 - corr / 160.0))
    _set(stats, "tax_revenue", tax * compliance)

    nation["stats"] = stats
