"""Government wheel system for SovereignHex.

Backend logic for the 4-wheel government founding system and crisis re-spins.
"""

from __future__ import annotations

import random
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Wheel tables
# ---------------------------------------------------------------------------

WheelTable = List[Tuple[str, float]]
ConditionalWheel = Dict[str, WheelTable]

WHEEL_1: WheelTable = [
    ("democracy", 42),
    ("oligarchy", 25),
    ("autocracy", 20),
    ("anocracy", 8),
    ("anarchy", 5),
]

WHEEL_1_ZYTHERA: WheelTable = [
    ("oligarchy", 55),
    ("autocracy", 45),
]

WHEEL_2: ConditionalWheel = {
    "democracy": [
        ("Representative Democracy", 30),
        ("Parliamentary Democracy", 22),
        ("Presidential Democracy", 17),
        ("Democratic Republic", 13),
        ("Direct Democracy", 5),
        ("Consociational Democracy", 8),
        ("Deliberative Democracy", 5),
    ],
    "oligarchy": [
        ("One-Party Elite Rule", 25),
        ("Military Junta", 21),
        ("Plutocracy", 17),
        ("Aristocracy", 12),
        ("Theocratic Council", 6),
        ("Gerontocracy", 5),
        ("Syndicate / Labor Oligarchy", 10),
        ("Mafiocracy / Criminal Oligarchy", 4),
    ],
    "autocracy": [
        ("Dictatorship", 30),
        ("Absolute Monarchy", 23),
        ("Tyranny / Personalist Rule", 16),
        ("Absolute Theocracy", 10),
        ("Electoral Autocracy", 13),
        ("Diarchy / Dual Rule", 8),
    ],
    "anocracy": [
        ("Competitive Authoritarian", 35),
        ("Illiberal Democracy", 30),
        ("Military-Managed Democracy", 20),
        ("Electoral Autocracy", 15),
    ],
    "anarchy": [
        ("Anarcho-Communist Commune", 25),
        ("Warlord / Failed State", 25),
        ("Anarcho-Capitalist / Private-Law", 15),
        ("Mutual-Aid Network", 15),
        ("Tribal / Clan Anarchy", 10),
        ("Worker-Syndicate Free Territory", 10),
    ],
}

WHEEL_2_ZYTHERA: ConditionalWheel = {
    "oligarchy": [
        ("Hive Council / One-Party Elite Rule", 45),
        ("Caste Oligarchy", 25),
        ("Theocratic Council", 20),
        ("Gerontocracy", 10),
    ],
    "autocracy": [
        ("Absolute Monarchy / Queen-Rule", 60),
        ("Tyranny / Personalist Rule", 30),
        ("Absolute Theocracy", 10),
    ],
    "anarchy": [
        ("Hive Collapse / Swarm Anarchy", 100),
    ],
}

WHEEL_3: WheelTable = [
    ("unitary", 45),
    ("federal", 25),
    ("confederal", 11),
    ("federacy / asymmetrical federation", 12),
    ("imperial / hegemonic", 7),
]

WHEEL_4: WheelTable = [
    ("Constitutional / Limited", 16),
    ("None (clean result)", 15),
    ("Populist", 10),
    ("Military-Influenced", 9),
    ("Paternalist / Welfare-First", 8),
    ("Traditional / Hereditary", 7),
    ("Theocratic Influence", 6),
    ("Technocratic", 5),
    ("Revolutionary / Provisional", 4),
    ("Corporate / Business Elite", 4),
    ("Bureaucratic", 3),
    ("Ecological / Green-Influenced", 3),
    ("Meritocratic", 2),
    ("Charismatic Leader Focus", 2),
    ("Praetorian / Security-State", 2),
    ("Libertarian / Minimal-State", 2),
    ("Participatory / Deliberative", 1),
    ("Isolationist", 1),
]

# ---------------------------------------------------------------------------
# Naming system — full blended government display names
# ---------------------------------------------------------------------------

SUBTYPE_ARCHETYPES: Dict[str, str] = {
    # Democracy subtypes (7)
    "Representative Democracy": "Representative Republic",
    "Parliamentary Democracy": "Parliamentary Republic",
    "Presidential Democracy": "Presidential Republic",
    "Democratic Republic": "Democratic Republic",
    "Direct Democracy": "Direct Republic",
    "Consociational Democracy": "Consociational Republic",
    "Deliberative Democracy": "Deliberative Republic",

    # Oligarchy subtypes (8)
    "One-Party Elite Rule": "One-Party State",
    "Military Junta": "Military Junta",
    "Plutocracy": "Plutocratic State",
    "Aristocracy": "Aristocratic State",
    "Theocratic Council": "Theocratic Council",
    "Gerontocracy": "Gerontocratic State",
    "Syndicate / Labor Oligarchy": "Syndicate Federation",
    "Mafiocracy / Criminal Oligarchy": "Criminal State",

    # Autocracy subtypes (6)
    "Dictatorship": "Dictatorship",
    "Absolute Monarchy": "Kingdom",
    "Tyranny / Personalist Rule": "Personalist Regime",
    "Absolute Theocracy": "Theocracy",
    "Electoral Autocracy": "Electoral Autocracy",
    "Diarchy / Dual Rule": "Diarchy",

    # Anocracy subtypes (4, Electoral Autocracy shared)
    "Competitive Authoritarian": "Competitive Regime",
    "Illiberal Democracy": "Illiberal Republic",
    "Military-Managed Democracy": "Managed Republic",

    # Anarchy subtypes (6)
    "Anarcho-Communist Commune": "Free Commune",
    "Warlord / Failed State": "Warlord State",
    "Anarcho-Capitalist / Private-Law": "Free Territory",
    "Mutual-Aid Network": "Mutual-Aid Network",
    "Tribal / Clan Anarchy": "Tribal Confederacy",
    "Worker-Syndicate Free Territory": "Syndicate Free Territory",
}

SUBTYPE_ARCHETYPES_ZYTHERA: Dict[str, str] = {
    # Oligarchy overrides
    "Hive Council / One-Party Elite Rule": "Hive Council",
    "Caste Oligarchy": "Caste Council",
    # Autocracy overrides
    "Absolute Monarchy / Queen-Rule": "Hive Kingdom",
    "Absolute Theocracy": "Divine Hive",
    # Anarchy override
    "Hive Collapse / Swarm Anarchy": "Swarm",
}

STYLE_ADJECTIVES: Dict[str, Optional[str]] = {
    "Constitutional / Limited": "Constitutional",
    "None (clean result)": None,
    "Populist": "Populist",
    "Military-Influenced": "Military-Backed",
    "Paternalist / Welfare-First": "Paternalist",
    "Traditional / Hereditary": "Traditionalist",
    "Theocratic Influence": "Theocratic",
    "Technocratic": "Technocratic",
    "Revolutionary / Provisional": "Revolutionary",
    "Corporate / Business Elite": "Corporate",
    "Bureaucratic": "Bureaucratic",
    "Ecological / Green-Influenced": "Ecological",
    "Meritocratic": "Meritocratic",
    "Charismatic Leader Focus": "Charismatic",
    "Praetorian / Security-State": "Praetorian",
    "Libertarian / Minimal-State": "Libertarian",
    "Participatory / Deliberative": "Participatory",
    "Isolationist": "Isolationist",
}

TERRITORIAL_PREFIX: Dict[str, Optional[str]] = {
    "unitary": None,
    "federal": "Federal",
    "confederal": "Confederal",
    "federacy / asymmetrical federation": "Federated",
    "imperial / hegemonic": "Imperial",
}

IMPERIAL_OVERRIDE: Dict[str, str] = {
    "Kingdom": "Empire",
    "Hive Kingdom": "Hive Empire",
}

_ANARCHY_ALWAYS_OK_STYLES = frozenset({
    "Populist",
    "Revolutionary",
    "Ecological",
    "Participatory",
    "Libertarian",
    "Traditionalist",
    "Isolationist",
})


def _filter_anarchy_style(style_adj: Optional[str], subtype: str) -> Optional[str]:
    """Drop style modifiers that imply a state apparatus for anarchy nations."""
    if not style_adj:
        return None
    if style_adj in _ANARCHY_ALWAYS_OK_STYLES:
        return style_adj
    if subtype == "Warlord / Failed State" and style_adj in ("Charismatic", "Military-Backed"):
        return style_adj
    if subtype == "Anarcho-Capitalist / Private-Law" and style_adj == "Corporate":
        return style_adj
    if subtype == "Tribal / Clan Anarchy" and style_adj == "Theocratic":
        return style_adj
    return None


def build_government_name(nation: dict) -> str:
    """Build the full blended government display name.

    Formula: The [Style?] [Territorial?] [Archetype] of [Nation Name]

    - Style drops if null/None
    - Territorial drops if unitary or if anarchy + federacy/imperial
    - Archetype may be overridden by imperial (Kingdom -> Empire)
    - Compass is NOT in the name (shown as color dot elsewhere)
    """
    form = nation.get("government_form", "")
    subtype = nation.get("government_subtype", "")
    territorial = nation.get("territorial_structure", "")
    style_raw = nation.get("style_modifier", "")
    nation_name = nation.get("name", "")
    race = (nation.get("race") or "").lower()

    is_zythera = race == "zythera"

    # Step 1: archetype lookup
    if is_zythera and subtype in SUBTYPE_ARCHETYPES_ZYTHERA:
        archetype = SUBTYPE_ARCHETYPES_ZYTHERA[subtype]
    else:
        archetype = SUBTYPE_ARCHETYPES.get(subtype, subtype)

    # Step 2: style adjective
    style_adj = STYLE_ADJECTIVES.get(style_raw)

    # Step 3: anarchy style filter
    if form == "anarchy":
        style_adj = _filter_anarchy_style(style_adj, subtype)

    # Step 4: territorial prefix
    territorial_prefix = TERRITORIAL_PREFIX.get(territorial)

    # Step 5: anarchy territorial filter (federacy/imperial drop)
    if form == "anarchy" and territorial_prefix in ("Federated", "Imperial"):
        territorial_prefix = None

    # Step 6: imperial archetype override
    if territorial_prefix == "Imperial" and archetype in IMPERIAL_OVERRIDE:
        archetype = IMPERIAL_OVERRIDE[archetype]
        territorial_prefix = None  # drop "Imperial" — archetype now says "Empire"

    # Step 7: assemble
    parts = []
    if style_adj:
        parts.append(style_adj)
    if territorial_prefix:
        parts.append(territorial_prefix)
    parts.append(archetype)

    descriptor = " ".join(parts)
    if nation_name:
        return f"The {descriptor} of {nation_name}"
    return f"The {descriptor}"


# Human-readable wheel labels for config endpoint
WHEEL_LABELS = {
    "form": "Core Power Structure",
    "subtype": "Specific Government Type",
    "territorial": "Territorial Structure",
    "style": "Flavor / Style Modifier",
}


# ---------------------------------------------------------------------------
# Founding / collapse tables
# ---------------------------------------------------------------------------

# Anarchy -> form re-spin odds (subtype-weighted). Rows need not sum to 100;
# they are normalized at runtime.
FOUNDING_ODDS: Dict[str, WheelTable] = {
    "Anarcho-Communist Commune": [("democracy", 60), ("oligarchy", 25), ("autocracy", 15)],
    "Warlord / Failed State": [("democracy", 15), ("oligarchy", 30), ("autocracy", 55)],
    "Anarcho-Capitalist / Private-Law": [("democracy", 20), ("oligarchy", 50), ("autocracy", 30)],
    "Mutual-Aid Network": [("democracy", 55), ("oligarchy", 30), ("autocracy", 15)],
    "Tribal / Clan Anarchy": [("democracy", 20), ("oligarchy", 40), ("autocracy", 40)],
    "Worker-Syndicate Free Territory": [("democracy", 35), ("oligarchy", 50), ("autocracy", 15)],
    "Hive Collapse / Swarm Anarchy": [("democracy", 0), ("oligarchy", 50), ("autocracy", 50)],
}

# Anarchy subtypes available for humans via collapse. Zythera always Hive Collapse.
HUMAN_ANARCHY_SUBTYPES = [
    "Anarcho-Communist Commune",
    "Warlord / Failed State",
    "Anarcho-Capitalist / Private-Law",
    "Mutual-Aid Network",
    "Tribal / Clan Anarchy",
    "Worker-Syndicate Free Territory",
]


# ---------------------------------------------------------------------------
# Pydantic result models
# ---------------------------------------------------------------------------

class WheelResult(BaseModel):
    government_form: str
    government_subtype: str
    territorial_structure: str
    style_modifier: str


class CrisisState(BaseModel):
    type: str  # revolution | coup | state_collapse | founding | convention | territorial_reform | reform_evolution
    phase: int  # 1..N
    started_at: datetime
    started_by_issue_id: Optional[str] = None


class CrisisHistoryEntry(BaseModel):
    type: str
    started_at: datetime
    resolved_at: datetime
    final_issue_id: Optional[str] = None
    wheel_changed: Optional[str] = None


# ---------------------------------------------------------------------------
# Core probability helpers
# ---------------------------------------------------------------------------

def weighted_choice(options: WheelTable, seed: Optional[int] = None) -> str:
    """Pick one option given [(label, weight), ...]."""
    rng = random.Random(seed) if seed is not None else random
    total = sum(w for _, w in options)
    r = rng.uniform(0, total)
    upto = 0.0
    for label, w in options:
        upto += w
        if upto >= r:
            return label
    return options[-1][0]


def _conditional_options(
    form: str,
    race: Optional[str] = None,
) -> Tuple[ConditionalWheel, str]:
    """Return the right conditional wheel for a given form and race."""
    is_zythera = bool(race and race.lower() == "zythera")
    if is_zythera:
        # Zythera Wheel 2 uses hive labels; fall back to human table if the
        # selected form doesn't have a special override.
        return WHEEL_2_ZYTHERA, form
    return WHEEL_2, form


def _pick_subtype(form: str, race: Optional[str] = None, seed: Optional[int] = None) -> str:
    """Pick Wheel 2 conditional on Wheel 1 form and race."""
    conditional_wheel, lookup_form = _conditional_options(form, race)
    subtype_table = conditional_wheel.get(
        lookup_form,
        WHEEL_2.get(form, WHEEL_2["democracy"]),
    )
    return weighted_choice(subtype_table, seed)


def spin_wheels(seed: Optional[int] = None, race: Optional[str] = None) -> WheelResult:
    """Spin all four wheels and return the result.

    Race-aware: Zythera nations only roll autocracy/oligarchy.
    """
    is_zythera = bool(race and race.lower() == "zythera")

    form_table = WHEEL_1_ZYTHERA if is_zythera else WHEEL_1
    form = weighted_choice(form_table, seed)

    subtype = _pick_subtype(form, race, seed)

    territorial = weighted_choice(WHEEL_3, seed)
    style = weighted_choice(WHEEL_4, seed)

    return WheelResult(
        government_form=form,
        government_subtype=subtype,
        territorial_structure=territorial,
        style_modifier=style,
    )


WHEEL_FIELD = {
    "form": "government_form",
    "subtype": "government_subtype",
    "territorial": "territorial_structure",
    "style": "style_modifier",
}
FOUNDING_WHEEL_ORDER = ["form", "subtype", "territorial", "style"]


def founding_next_wheel(saved: Optional[dict] = None) -> Optional[str]:
    blob = saved or {}
    for wid in FOUNDING_WHEEL_ORDER:
        if not blob.get(WHEEL_FIELD[wid]):
            return wid
    return None


def spin_one_wheel(
    wheel_id: str,
    current: Optional[dict] = None,
    race: Optional[str] = None,
) -> dict:
    """Roll a single founding wheel. Already-filled fields are kept."""
    if wheel_id not in WHEEL_FIELD:
        raise ValueError(f"Unknown wheel_id: {wheel_id}")
    out = dict(current or {})
    field = WHEEL_FIELD[wheel_id]
    if out.get(field):
        return out
    expected = founding_next_wheel(out)
    if expected != wheel_id:
        raise ValueError(f"Spin {expected or 'none'} before {wheel_id}")
    is_zythera = bool(race and race.lower() == "zythera")
    if wheel_id == "form":
        table = WHEEL_1_ZYTHERA if is_zythera else WHEEL_1
        out["government_form"] = weighted_choice(table)
    elif wheel_id == "subtype":
        out["government_subtype"] = _pick_subtype(out["government_form"], race)
    elif wheel_id == "territorial":
        out["territorial_structure"] = weighted_choice(WHEEL_3)
    elif wheel_id == "style":
        out["style_modifier"] = weighted_choice(WHEEL_4)
    return out


def respin_wheel(
    wheel_id: str,
    current: WheelResult,
    seed: Optional[int] = None,
    race: Optional[str] = None,
) -> WheelResult:
    """Re-spin one wheel during a crisis.

    Dependent wheels are re-rolled as needed (e.g. form change forces subtype).
    """
    if wheel_id == "form":
        # For collapse-to-anarchy or founding-to-form, the caller already knows
        # the desired form; otherwise this is a generic form re-spin.
        return current.copy(
            update={
                "government_subtype": _pick_subtype(current.government_form, race, seed),
            }
        )

    if wheel_id == "subtype":
        return current.copy(
            update={
                "government_subtype": _pick_subtype(current.government_form, race, seed),
            }
        )

    if wheel_id == "territorial":
        territorial = weighted_choice(WHEEL_3, seed)
        return current.copy(update={"territorial_structure": territorial})

    if wheel_id == "style":
        style = weighted_choice(WHEEL_4, seed)
        return current.copy(update={"style_modifier": style})

    raise ValueError(f"Unknown wheel_id: {wheel_id}")


def respin_to_form(
    current: WheelResult,
    new_form: str,
    race: Optional[str] = None,
    seed: Optional[int] = None,
) -> WheelResult:
    """Force Wheel 1 to a specific form and re-roll subtype accordingly."""
    new_subtype = _pick_subtype(new_form, race, seed)
    return current.copy(
        update={
            "government_form": new_form,
            "government_subtype": new_subtype,
        }
    )


# ---------------------------------------------------------------------------
# Config exposure for frontend
# ---------------------------------------------------------------------------

def wheels_config(race: Optional[str] = None) -> dict:
    """Return all four wheels with labels and weights for the frontend."""
    is_zythera = bool(race and race.lower() == "zythera")

    form_table = WHEEL_1_ZYTHERA if is_zythera else WHEEL_1
    subtype_table = WHEEL_2_ZYTHERA if is_zythera else WHEEL_2

    return {
        "wheels": [
            {
                "id": "form",
                "label": WHEEL_LABELS["form"],
                "options": [{"label": label, "weight": weight} for label, weight in form_table],
            },
            {
                "id": "subtype",
                "label": WHEEL_LABELS["subtype"],
                "conditional_on": "form",
                "options": {
                    form: [{"label": label, "weight": weight} for label, weight in table]
                    for form, table in subtype_table.items()
                },
            },
            {
                "id": "territorial",
                "label": WHEEL_LABELS["territorial"],
                "options": [{"label": label, "weight": weight} for label, weight in WHEEL_3],
            },
            {
                "id": "style",
                "label": WHEEL_LABELS["style"],
                "options": [{"label": label, "weight": weight} for label, weight in WHEEL_4],
            },
        ]
    }


# ---------------------------------------------------------------------------
# Legitimacy
# ---------------------------------------------------------------------------

LOW_LEGIT = 30.0
MID_LEGIT = 50.0
HIGH_LEGIT = 70.0


def recalc_legitimacy(stats: dict, wheel_result: WheelResult) -> float:
    """Recalculate legitimacy from stats and wheel modifiers."""
    base = 50.0
    base += (stats.get("happiness", 50) - 50) * 0.4
    base += (stats.get("political_freedom", 50) - 50) * 0.25
    base += (stats.get("civil_rights", 50) - 50) * 0.15
    base += (stats.get("corruption", 50) - 50) * -0.2

    if wheel_result.government_form == "autocracy":
        base -= 5
    elif wheel_result.government_form == "democracy":
        base += 3

    # Anocracy and anarchy have no generic form bonus/penalty beyond subtype below.

    if wheel_result.style_modifier in ("Populist", "Revolutionary / Provisional"):
        base -= 4
    if wheel_result.style_modifier == "Constitutional / Limited":
        base += 4

    base = _subtype_legitimacy_mod(stats, wheel_result, base)

    return max(0.0, min(100.0, base))


def _subtype_legitimacy_mod(stats: dict, wheel_result: WheelResult, base: float) -> float:
    """Apply subtype-specific anarchy legitimacy modifiers."""
    if wheel_result.government_form != "anarchy":
        return base

    subtype = wheel_result.government_subtype
    political_freedom = stats.get("political_freedom", 50)
    economy = stats.get("gdp", stats.get("economy", 50))
    happiness = stats.get("happiness", 50)
    style = wheel_result.style_modifier or ""

    if subtype == "Anarcho-Communist Commune":
        return base + (political_freedom - 50) * 0.5
    if subtype == "Warlord / Failed State":
        return base - 20
    if subtype == "Anarcho-Capitalist / Private-Law":
        return base + (economy - 50) * 0.3
    if subtype == "Mutual-Aid Network":
        return base + (happiness - 50) * 0.4
    if subtype == "Tribal / Clan Anarchy":
        bonus = 10 if "Traditional / Hereditary" in style else 0
        return base + bonus
    if subtype == "Worker-Syndicate Free Territory":
        return base + (economy - 50) * 0.2 + (political_freedom - 50) * 0.2
    if subtype == "Hive Collapse / Swarm Anarchy":
        return base - 30

    return base


# ---------------------------------------------------------------------------
# Crisis mechanics
# ---------------------------------------------------------------------------

CRISIS_PRIORITY = [
    "revolution",
    "coup",
    "state_collapse",
    "founding",
    "convention",
    "territorial_reform",
    "reform_evolution",
]

CRISIS_WHEEL_MAP = {
    "revolution": "form",
    "coup": "form",
    "state_collapse": "form",
    "founding": "form",
    "convention": "style",
    "territorial_reform": "territorial",
    "reform_evolution": "subtype",
}


def crisis_check(stats: dict, legitimacy: float, nation: dict) -> Optional[str]:
    """Check if a new crisis should fire.

    Returns the crisis type with highest priority if any trigger matches.
    """
    political_freedom = stats.get("political_freedom", 50)
    military_strength = stats.get("military_strength", 50)
    corruption = stats.get("corruption", 50)
    political_apathy = stats.get("political_apathy", 50)
    scientific_advancement = stats.get("scientific_advancement", 50)
    territory_count = nation.get("total_territories", 1)
    timezone_count = nation.get("timezone_count") or nation.get("timezone_geo_max", 1)
    current_form = nation.get("government_form", "democracy")

    matched = []

    # Revolution: low legitimacy + high political freedom + non-democracy
    if legitimacy < LOW_LEGIT and political_freedom >= HIGH_LEGIT:
        if current_form in ("autocracy", "oligarchy", "anocracy"):
            matched.append("revolution")

    # Coup: low legitimacy + high military strength
    if legitimacy < LOW_LEGIT and military_strength >= HIGH_LEGIT:
        matched.append("coup")

    # State Collapse: legitimacy < 15 + military < 20 + political freedom < 20
    if legitimacy < 15 and military_strength < 20 and political_freedom < 20:
        matched.append("state_collapse")

    # Founding: anarchy only, legitimacy > 60 + political apathy < 30
    if current_form == "anarchy" and legitimacy > 60 and political_apathy < 30:
        matched.append("founding")

    # Convention: mid legitimacy + high corruption
    if LOW_LEGIT <= legitimacy < MID_LEGIT and corruption >= HIGH_LEGIT:
        matched.append("convention")

    # Territorial reform: many territories or timezones
    if territory_count >= 12 or timezone_count >= 6:
        matched.append("territorial_reform")

    # Reform/evolution: high apathy + high science
    if political_apathy >= HIGH_LEGIT and scientific_advancement >= HIGH_LEGIT:
        matched.append("reform_evolution")

    for crisis in CRISIS_PRIORITY:
        if crisis in matched:
            return crisis
    return None


def crisis_for_issue(
    issue_kind: Optional[str],
    stats: dict,
    legitimacy: float,
    nation: dict,
) -> Optional[str]:
    """Map a resolving issue kind to the crisis it should resolve, if any."""
    if issue_kind in CRISIS_WHEEL_MAP:
        return issue_kind
    return crisis_check(stats, legitimacy, nation)


# ---------------------------------------------------------------------------
# Collapse / founding resolution helpers
# ---------------------------------------------------------------------------

def collapse_subtype(stats: dict, race: Optional[str] = None) -> str:
    """Pick an anarchy subtype for state collapse (design doc section)."""
    if race and race.lower() == "zythera":
        return "Hive Collapse / Swarm Anarchy"

    # Use the strongest signal; default to warlord state.
    corruption = stats.get("corruption", 50)
    wealth_concentration = stats.get("wealth_concentration", stats.get("gdp", 50))
    community = stats.get("civic_tradition", stats.get("happiness", 50))
    labor = stats.get("labor_movement", stats.get("political_freedom", 50))
    clan = stats.get("tribal_structure", stats.get("traditional", 50))
    market = stats.get("market_tradition", stats.get("economy", 50))

    # Tie-break via ordered preference once thresholds are met.
    if race and race.lower() == "zythera":
        return "Hive Collapse / Swarm Anarchy"
    if corruption >= 60 and wealth_concentration >= 60:
        return "Warlord / Failed State"
    if clan >= 60:
        return "Tribal / Clan Anarchy"
    if labor >= 60:
        return "Worker-Syndicate Free Territory"
    if market >= 60:
        return "Anarcho-Capitalist / Private-Law"
    if community >= 60:
        return "Mutual-Aid Network"
    return "Warlord / Failed State"


def founding_target_form(
    subtype: str,
    race: Optional[str] = None,
    seed: Optional[int] = None,
) -> str:
    """Re-spin Wheel 1 from anarchy to a form, weighted by current subtype."""
    if race and race.lower() == "zythera":
        return weighted_choice([("oligarchy", 50), ("autocracy", 50)], seed)

    table = FOUNDING_ODDS.get(subtype, [("democracy", 33), ("oligarchy", 33), ("autocracy", 34)])
    return weighted_choice(table, seed)


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def build_display_identity(nation: dict) -> str:
    """Build the full blended government display name from wheel fields."""
    return build_government_name(nation)


# Backwards-compatible alias
build_government_display_name = build_display_identity
