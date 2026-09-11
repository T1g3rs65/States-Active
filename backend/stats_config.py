"""Configuration for all nation statistics and their relationships."""

from typing import Dict, List, Tuple
from models import GovernmentType

# Stat definitions with ranges and descriptions
STAT_DEFINITIONS = {
    "gdp": {"min": 0, "max": 100, "default": 50, "name": "GDP per Capita", "higher_is_better": True},
    "economy_growth": {"min": -10, "max": 15, "default": 2, "name": "Economic Growth", "higher_is_better": True},
    "unemployment": {"min": 0, "max": 50, "default": 5, "name": "Unemployment Rate", "higher_is_better": False},
    "inflation": {"min": -5, "max": 20, "default": 2, "name": "Inflation Rate", "higher_is_better": False},
    "civil_rights": {"min": 0, "max": 100, "default": 50, "name": "Civil Rights", "higher_is_better": True},
    "freedom_speech": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Speech", "higher_is_better": True},
    "freedom_press": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Press", "higher_is_better": True},
    "freedom_assembly": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Assembly", "higher_is_better": True},
    "freedom_religion": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Religion", "higher_is_better": True},
    "political_freedom": {"min": 0, "max": 100, "default": 50, "name": "Political Freedom", "higher_is_better": True},
    "voting_rights": {"min": 0, "max": 100, "default": 50, "name": "Voting Rights", "higher_is_better": True},
    "corruption": {"min": 0, "max": 100, "default": 50, "name": "Corruption Level", "higher_is_better": False},
    "political_apathy": {"min": 0, "max": 100, "default": 50, "name": "Political Apathy", "higher_is_better": False},
    "happiness": {"min": 0, "max": 100, "default": 50, "name": "Happiness Index", "higher_is_better": True},
    "life_expectancy": {"min": 40, "max": 100, "default": 75, "name": "Life Expectancy", "higher_is_better": True},
    "obesity_rate": {"min": 0, "max": 60, "default": 20, "name": "Obesity Rate", "higher_is_better": False},
    "environment": {"min": 0, "max": 100, "default": 50, "name": "Environmental Health", "higher_is_better": True},
    "pollution": {"min": 0, "max": 100, "default": 50, "name": "Pollution Level", "higher_is_better": False},
    "biodiversity": {"min": 0, "max": 100, "default": 50, "name": "Biodiversity", "higher_is_better": True},
    "eco_footprint": {"min": 0, "max": 100, "default": 50, "name": "Ecological Footprint", "higher_is_better": False},
    "healthcare_quality": {"min": 0, "max": 100, "default": 50, "name": "Healthcare Quality", "higher_is_better": True},
    "literacy_rate": {"min": 0, "max": 100, "default": 95, "name": "Literacy Rate", "higher_is_better": True},
    "university_attendance": {"min": 0, "max": 80, "default": 30, "name": "University Attendance", "higher_is_better": True},
    "scientific_advancement": {"min": 0, "max": 100, "default": 50, "name": "Scientific Advancement", "higher_is_better": True},
    "crime_rate": {"min": 0, "max": 50, "default": 5, "name": "Crime Rate", "higher_is_better": False},
    "law_enforcement": {"min": 0, "max": 100, "default": 50, "name": "Law Enforcement", "higher_is_better": True},
    "military_strength": {"min": 0, "max": 100, "default": 50, "name": "Military Strength", "higher_is_better": True},
    "budget_defense": {"min": 0, "max": 50, "default": 10, "name": "Defense Budget", "higher_is_better": False},
    "income_equality": {"min": 0, "max": 100, "default": 50, "name": "Income Equality", "higher_is_better": True},
    "gini_coefficient": {"min": 0.2, "max": 0.7, "default": 0.35, "name": "Gini Coefficient", "higher_is_better": False},
    "population": {"min": 1, "max": 1000, "default": 2.5, "name": "Population (thousands)", "higher_is_better": True},
    "population_growth": {"min": -5, "max": 10, "default": 1, "name": "Population Growth (%/year)", "higher_is_better": True},
    "national_debt": {"min": 0, "max": 200, "default": 40, "name": "National Debt", "higher_is_better": False},
    "tax_rate": {"min": 0, "max": 80, "default": 25, "name": "Average Tax Rate", "higher_is_better": False},
    "tax_revenue": {"min": 0, "max": 80, "default": 18, "name": "Tax Take", "higher_is_better": True},
    "international_approval": {"min": 0, "max": 100, "default": 50, "name": "International Approval", "higher_is_better": True},
}

def clamp_stat_value(stat_name: str, value: float) -> float:
    """Clamp a live stat to STAT_DEFINITIONS (not founding bands, not blanket 0–100)."""
    spec = STAT_DEFINITIONS.get(stat_name)
    if spec:
        lo, hi = float(spec["min"]), float(spec["max"])
        fallback = float(spec.get("default", lo))
    else:
        lo, hi, fallback = 0.0, 100.0, 0.0
    try:
        v = float(value)
    except (TypeError, ValueError):
        v = fallback
    return max(lo, min(hi, v))

# Founding-only. Units match STAT_DEFINITIONS / the overview UI.
# Indexes stay 0–100 but a new village-state is mid, not a failed state or utopia.
# Percents, years, debt, gini, crime/1000 use real-world bands.
FOUNDING_START_BOUNDS = {
    # GDP stat 0–100 → $/capita. 24–42 ≈ $7k–$17k (developing / lower-developed).
    "gdp": (24, 42),
    "economy_growth": (1.0, 3.8),          # %
    "unemployment": (4.5, 10.5),           # %
    "inflation": (1.4, 3.8),               # %  target ~2
    "civil_rights": (32, 72),
    "freedom_speech": (28, 78),
    "freedom_press": (28, 78),
    "freedom_assembly": (28, 78),
    "freedom_religion": (28, 78),
    "political_freedom": (32, 72),
    "voting_rights": (30, 80),
    "corruption": (28, 62),
    "political_apathy": (28, 58),
    "happiness": (42, 68),
    "life_expectancy": (71, 80),           # years
    "obesity_rate": (14, 28),              # %
    "environment": (36, 68),
    "pollution": (32, 62),
    "biodiversity": (36, 68),
    "eco_footprint": (32, 62),
    "healthcare_quality": (36, 68),
    "literacy_rate": (90, 99),             # %
    "university_attendance": (18, 38),     # %
    "scientific_advancement": (28, 55),
    "crime_rate": (2.2, 8.5),              # per 1000
    "law_enforcement": (36, 68),
    "military_strength": (14, 30),         # village militia, not a power
    "income_equality": (36, 68),
    "gini_coefficient": (0.30, 0.46),
    "population": (1.8, 3.4),              # thousands
    "population_growth": (0.4, 1.8),       # %
    "budget_education": (10, 20),          # % of budget
    "budget_defense": (5, 14),
    "budget_healthcare": (12, 22),
    "budget_welfare": (8, 18),
    "budget_environment": (2, 8),
    "budget_infrastructure": (12, 22),
    "budget_other": (10, 18),
    "national_debt": (28, 68),             # % of GDP
    "tax_rate": (16, 38),                  # %  OECD-ish; anarchy handled below
    "international_approval": (36, 64),
}

ZERO_TAX_ANARCHY_SUBTYPES = {
    "Anarcho-Capitalist / Private-Law",
    "Anarcho-Communist Commune",
    "Mutual-Aid Network",
    "Hive Collapse / Swarm Anarchy",
}

_BUDGET_KEYS = (
    "budget_education", "budget_defense", "budget_healthcare", "budget_welfare",
    "budget_environment", "budget_infrastructure", "budget_other",
)


def clamp_founding_stats(stats, government_form: str | None = None, government_subtype: str | None = None):
    """Clamp quiz output to realistic founding values. Future starts only."""
    form = (government_form or "").lower()
    subtype = government_subtype or ""
    allow_zero_tax = form == "anarchy" and subtype in ZERO_TAX_ANARCHY_SUBTYPES
    data = stats.dict() if hasattr(stats, "dict") else dict(stats)

    for key, (lo, hi) in FOUNDING_START_BOUNDS.items():
        if key not in data:
            continue
        if key == "tax_rate" and allow_zero_tax:
            lo, hi = 0.0, 6.0
        elif key == "tax_rate" and form == "anarchy":
            lo, hi = 6.0, 16.0
        try:
            data[key] = max(lo, min(hi, float(data[key])))
        except (TypeError, ValueError):
            continue

    # Budget shares are percents of one pie.
    for k in _BUDGET_KEYS:
        lo, hi = FOUNDING_START_BOUNDS[k]
        data[k] = max(lo, min(hi, float(data.get(k, lo))))
    total = sum(float(data[k]) for k in _BUDGET_KEYS)
    if total > 0:
        scale = 100.0 / total
        for k in _BUDGET_KEYS:
            data[k] = round(float(data[k]) * scale, 2)
        extra = round(100.0 - sum(float(data[k]) for k in _BUDGET_KEYS), 2)
        data["budget_other"] = round(float(data["budget_other"]) + extra, 2)

    # Keep linked stats consistent with their meaning.
    freedoms = [
        float(data.get("freedom_speech", 50)),
        float(data.get("freedom_press", 50)),
        float(data.get("freedom_assembly", 50)),
        float(data.get("freedom_religion", 50)),
    ]
    data["civil_rights"] = max(32.0, min(72.0, sum(freedoms) / 4.0))
    voting = float(data.get("voting_rights", 50))
    corruption = float(data.get("corruption", 50))
    data["political_freedom"] = max(32.0, min(72.0, (voting + (100.0 - corruption)) / 2.0))
    eq = float(data.get("income_equality", 50))
    data["gini_coefficient"] = max(0.30, min(0.46, 0.55 - 0.30 * (eq / 100.0)))
    health = float(data.get("healthcare_quality", 50))
    data["life_expectancy"] = max(71.0, min(80.0, 68.0 + health * 0.16))

    if hasattr(stats, "copy"):
        return stats.copy(update=data)
    for k, v in data.items():
        setattr(stats, k, v)
    return stats


# Compass cell matches frontend politicalCompass.ts (±0.22 bands).
_CELL_EDGE = 0.22


def compass_cell_from_stats(economy: float, civil_rights: float, political_freedom: float) -> tuple[str, str]:
    """Return (row, col) on the 3×3 chart. row=auth|mid|lib, col=left|center|right."""
    x = (economy - 50) / 50.0
    y = ((civil_rights + political_freedom) / 2.0 - 50) / 50.0
    col = "left" if x < -_CELL_EDGE else "right" if x > _CELL_EDGE else "center"
    row = "auth" if y < -_CELL_EDGE else "lib" if y > _CELL_EDGE else "mid"
    return row, col


def classify_government(civil_rights: float, economy: float, political_freedom: float,
                       environment: float = 50, military: float = 50,
                       scientific: float = 50, crime: float = 5,
                       race: str = "human",
                       freedom_religion: float = 50,
                       tax_rate: float = 25) -> GovernmentType:
    """Classify a *flavor* inside a compass cell.

    Cell (color / region) comes from GDP + civil + political freedom.
    Flavor inside the cell uses secondary stats so similar nations aren't
    forced into one stereotype (e.g. auth-right is not always a monarch).
    """
    if race and race.lower() == "zythera":
        return classify_zythera_government(
            civil_rights, economy, political_freedom,
            environment, military, scientific, crime,
        )

    row, col = compass_cell_from_stats(economy, civil_rights, political_freedom)
    liberty = (civil_rights + political_freedom) / 2.0

    # ----- Auth-Left: communist / planned -----
    if row == "auth" and col == "left":
        if political_freedom < 12 and civil_rights < 12:
            return GovernmentType.PSYCHOTIC_DICTATORSHIP
        if crime >= 10 and political_freedom < 25:
            return GovernmentType.CORRUPT_DICTATORSHIP
        if military >= 75:
            return GovernmentType.MARTIAL_COMMAND
        if liberty < 25:
            return GovernmentType.PEOPLES_REPUBLIC
        return GovernmentType.LEFT_WING_UTOPIA

    # ----- Auth-Center: strongman / nationalist -----
    if row == "auth" and col == "center":
        if political_freedom < 12 and civil_rights < 12:
            return GovernmentType.PSYCHOTIC_DICTATORSHIP
        if crime >= 10:
            return GovernmentType.CORRUPT_DICTATORSHIP
        if military >= 75:
            return GovernmentType.MARTIAL_COMMAND
        if freedom_religion < 30:
            return GovernmentType.THEOCRATIC_ENFORCERS
        if civil_rights < 35 and crime < 3:
            return GovernmentType.SURVEILLANCE_PANOPTICON
        if civil_rights >= 45:
            return GovernmentType.AUTHORITARIAN_DEMOCRACY
        return GovernmentType.FATHER_KNOWS_BEST_STATE

    # ----- Auth-Right: conservative — republic default, not monarch -----
    if row == "auth" and col == "right":
        if freedom_religion < 28:
            return GovernmentType.THEOCRATIC_ENFORCERS
        if military >= 78:
            return GovernmentType.MARTIAL_COMMAND
        if civil_rights < 32 and crime < 2.5:
            return GovernmentType.SURVEILLANCE_PANOPTICON
        if political_freedom < 22 and civil_rights >= 40:
            return GovernmentType.BENEVOLENT_DICTATORSHIP
        if civil_rights < 38 and 40 <= political_freedom < 70:
            return GovernmentType.MORALISTIC_DEMOCRACY
        return GovernmentType.CONSERVATIVE_REPUBLIC

    # ----- Mid-Left: socialist -----
    if row == "mid" and col == "left":
        if environment >= 75:
            return GovernmentType.ECO_SOCIALIST_HAVEN
        if civil_rights >= 70 and political_freedom >= 65:
            return GovernmentType.WELFARE_PARADISE
        if political_freedom >= 60:
            return GovernmentType.DEMOCRATIC_SOCIALISTS
        return GovernmentType.SOCIALIST_REPUBLIC

    # ----- Mid-Center: centrist -----
    if row == "mid" and col == "center":
        if scientific >= 72:
            return GovernmentType.PRAGMATIC_MERITOCRACY
        return GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY

    # ----- Mid-Right: corporatist / state capitalist -----
    if row == "mid" and col == "right":
        if scientific >= 75 and civil_rights < 45:
            return GovernmentType.CYBERPUNK_MEGACITY
        if scientific >= 75:
            return GovernmentType.TECH_OLIGARCHY
        if military < 40 and political_freedom >= 55:
            return GovernmentType.TRADE_EMPIRE
        if scientific >= 70:
            return GovernmentType.TECHNOCRATIC_SYNDICATE
        if civil_rights < 40 or political_freedom < 40:
            return GovernmentType.CORPORATE_POLICE_STATE if crime < 6 else GovernmentType.CORPORATE_BORDELLO
        return GovernmentType.TRADE_EMPIRE

    # ----- Lib-Left: eco / anarchist -----
    if row == "lib" and col == "left":
        if political_freedom < 25 and economy < 25 and civil_rights < 25:
            return GovernmentType.ANARCHY
        if crime >= 12 and political_freedom >= 70:
            return GovernmentType.ANARCHY
        if environment >= 70:
            return GovernmentType.ECO_SOCIALIST_HAVEN
        return GovernmentType.CIVIL_RIGHTS_LOVEFEST

    # ----- Lib-Center: liberal -----
    if row == "lib" and col == "center":
        if crime >= 8 and civil_rights >= 80:
            return GovernmentType.PSYCHEDELIC_FREE_STATE
        if 40 <= economy < 70 and civil_rights >= 75 and political_freedom >= 75:
            return GovernmentType.SCANDINAVIAN_PARADISE
        return GovernmentType.LIBERAL_DEMOCRACY

    # ----- Lib-Right: libertarian / free market -----
    if row == "lib" and col == "right":
        if crime >= 12:
            return GovernmentType.PIRATE_HAVEN
        if scientific >= 65 and civil_rights >= 80:
            return GovernmentType.SEASTEAD_REPUBLIC
        if economy >= 80 and political_freedom >= 70:
            return GovernmentType.LAISSEZ_FAIRE_DYNAMO
        if political_freedom >= 75:
            return GovernmentType.FREE_MARKET_PARADISE
        if civil_rights >= 70:
            return GovernmentType.CAPITALIST_PARADISE
        return GovernmentType.RIGHT_WING_UTOPIA

    return GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY


def classify_zythera_government(civil_rights: float, economy: float, political_freedom: float, 
                                environment: float = 50, military: float = 50, 
                                scientific: float = 50, crime: float = 5) -> GovernmentType:
    """Classify Zythera hive government type based on stats. All led by Queens."""
    
    # Extreme/chaotic
    if political_freedom < 20 and civil_rights < 20:
        return GovernmentType.SPLINTER_COLONY  # Anarchic, competing queens
    
    if political_freedom < 15 and civil_rights < 15 and economy < 30:
        return GovernmentType.PARASITIC_HIVE  # Exploitative, extractive
    
    # Hivemind (very low freedom, high order)
    if political_freedom < 25 and civil_rights < 25 and crime < 2:
        return GovernmentType.HIVEMIND_COLLECTIVE
    
    # Military focus
    if military >= 75 and political_freedom < 45:
        return GovernmentType.MILITANT_HIVE
    
    # Imperial expansion
    if military >= 65 and economy >= 60 and political_freedom < 40:
        return GovernmentType.IMPERIAL_SWARM
    
    # Divine/Religious hive
    if civil_rights < 40 and political_freedom < 35 and environment >= 60:
        return GovernmentType.DIVINE_HIVE
    
    # Traditional monarchy (strict hierarchy)
    if political_freedom < 40 and civil_rights < 45 and economy >= 50:
        return GovernmentType.ROYAL_HIVE
    
    # Ordered bureaucracy
    if political_freedom < 50 and civil_rights >= 40 and economy >= 55 and crime < 4:
        return GovernmentType.ORDERED_COLONY
    
    # Collective (left-wing authoritarian)
    if economy < 45 and civil_rights >= 50 and political_freedom < 50:
        return GovernmentType.COLLECTIVE_HIVE
    
    # Worker's equality (left-wing)
    if economy < 40 and civil_rights >= 60 and political_freedom >= 50:
        return GovernmentType.WORKERS_SWARM
    
    # Tech focused
    if scientific >= 70 and economy >= 60:
        return GovernmentType.TECHNO_SWARM
    
    # Merchant/trade focused
    if economy >= 70 and political_freedom >= 55:
        return GovernmentType.MERCHANT_HIVE
    
    # Environmental harmony
    if environment >= 70 and civil_rights >= 60:
        return GovernmentType.NURTURING_HIVE
    
    # Cooperative/symbiotic (high freedom, collective)
    if civil_rights >= 70 and political_freedom >= 65 and economy < 60:
        return GovernmentType.SYMBIOTIC_SWARM
    
    # Free colony (maximum freedom)
    if civil_rights >= 75 and political_freedom >= 75:
        return GovernmentType.FREE_COLONY
    
    # Harmonious (balanced high)
    if civil_rights >= 60 and political_freedom >= 60 and economy >= 50:
        return GovernmentType.HARMONIOUS_HIVE
    
    # Diplomatic focus
    if civil_rights >= 55 and political_freedom >= 50 and military < 40:
        return GovernmentType.DIPLOMATIC_SWARM
    
    # Default balanced
    return GovernmentType.BALANCED_HIVE


def get_government_description(gov_type: GovernmentType) -> str:
    """Get a brief description of the government type."""
    descriptions = {
        # Human Government Types
        GovernmentType.LEFT_WING_UTOPIA: "Public ownership, tight equality.",
        GovernmentType.SCANDINAVIAN_PARADISE: "High tax, high services, still a market.",
        GovernmentType.LIBERAL_DEMOCRACY: "Elections and civil liberties.",
        GovernmentType.CAPITALIST_PARADISE: "Light regulation, business first.",
        GovernmentType.RIGHT_WING_UTOPIA: "Small state. Property and little else.",
        GovernmentType.ECO_SOCIALIST_HAVEN: "Green rules and public ownership.",
        GovernmentType.WELFARE_PARADISE: "Cradle-to-grave benefits.",
        GovernmentType.LAISSEZ_FAIRE_DYNAMO: "No industrial policy.",
        GovernmentType.CIVIL_RIGHTS_LOVEFEST: "The state gets out of the way.",
        GovernmentType.FREE_MARKET_PARADISE: "Competition is the only plan.",
        GovernmentType.DEMOCRATIC_SOCIALISTS: "Elected government, heavy welfare.",
        GovernmentType.CORPORATE_POLICE_STATE: "Firms write the rules.",
        GovernmentType.AUTHORITARIAN_DEMOCRACY: "Votes happen. Same people stay in.",
        GovernmentType.BENEVOLENT_DICTATORSHIP: "One ruler. Competent, not free.",
        GovernmentType.IRON_FIST_CONSUMERISTS: "Shop freely. Do not talk politics.",
        GovernmentType.MORALISTIC_DEMOCRACY: "The majority voted in a moral code.",
        GovernmentType.CONSERVATIVE_REPUBLIC: "Elected, traditional, market-friendly. No crown required.",
        GovernmentType.CONSTITUTIONAL_MONARCHY: "A crown on paper. Parliament does the work.",
        GovernmentType.PSYCHOTIC_DICTATORSHIP: "Terror as policy.",
        GovernmentType.ANARCHY: "No centre.",
        GovernmentType.FATHER_KNOWS_BEST_STATE: "The state parents you.",
        GovernmentType.TECH_OLIGARCHY: "Engineers in the cabinet.",
        GovernmentType.TRADE_EMPIRE: "Ports and deals.",
        GovernmentType.SURVEILLANCE_PANOPTICON: "Cameras. No private life.",
        GovernmentType.THEOCRATIC_ENFORCERS: "Clergy as law.",
        GovernmentType.MARTIAL_COMMAND: "Generals keep the peace.",
        GovernmentType.SEASTEAD_REPUBLIC: "Offshore, lightly taxed.",
        GovernmentType.PSYCHEDELIC_FREE_STATE: "Drugs are legal.",
        GovernmentType.PRAGMATIC_MERITOCRACY: "Exams beat bloodlines.",
        GovernmentType.TECHNOCRATIC_SYNDICATE: "Specialists vote.",
        GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY: "The middle of every chart.",
        GovernmentType.CORPORATE_BORDELLO: "If it sells, it's legal.",
        GovernmentType.CORRUPT_DICTATORSHIP: "The palace is a payroll.",
        GovernmentType.CYBERPUNK_MEGACITY: "High tech, bad streets.",
        GovernmentType.PIRATE_HAVEN: "No extradition.",
        GovernmentType.SOCIALIST_REPUBLIC: "Central plan, some speech.",
        GovernmentType.PEOPLES_REPUBLIC: "The party owns the press.",
        
        # Zythera Hive Government Types
        GovernmentType.COLLECTIVE_HIVE: "Shares are even. Queen as quartermaster.",
        GovernmentType.WORKERS_SWARM: "Labour caste runs production.",
        GovernmentType.ROYAL_HIVE: "Caste is law.",
        GovernmentType.IMPERIAL_SWARM: "The hive grows by taking ground.",
        GovernmentType.DIVINE_HIVE: "The Queen is worshipped.",
        GovernmentType.MILITANT_HIVE: "Warrior caste first.",
        GovernmentType.ORDERED_COLONY: "Forms, rosters, quotas.",
        GovernmentType.SYMBIOTIC_SWARM: "Room for individuals inside the hive.",
        GovernmentType.NURTURING_HIVE: "The Queen spends on brood and sick.",
        GovernmentType.MERCHANT_HIVE: "Trade first.",
        GovernmentType.TECHNO_SWARM: "Labs outrank temples.",
        GovernmentType.HARMONIOUS_HIVE: "Neither tight nor loose.",
        GovernmentType.FREE_COLONY: "The Queen lets subjects wander.",
        GovernmentType.BALANCED_HIVE: "Whatever the hive needs this season.",
        GovernmentType.DIPLOMATIC_SWARM: "Treaties over raids.",
        GovernmentType.PARASITIC_HIVE: "Tribute in, work out.",
        GovernmentType.HIVEMIND_COLLECTIVE: "Individual thought merges into the Queen's will.",
        GovernmentType.SPLINTER_COLONY: "Rival queens compete in chaotic power struggles.",
    }
    return descriptions.get(gov_type, "A nation finding its identity.")
