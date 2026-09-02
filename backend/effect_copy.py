"""NationStates-style result lines. Words only — never quote the numbers."""
from __future__ import annotations

from typing import Dict, List

# (up phrase, down phrase) — "up" means the raw stat increased
PHRASES = {
    "gdp": ("the books thicken", "the books thin"),
    "economy_growth": ("shops put on extra shifts", "orders slow"),
    "unemployment": ("the dole queue lengthens", "more people find a wage"),
    "inflation": ("prices climb", "prices ease"),
    "civil_rights": ("the street feels freer", "the street feels watched"),
    "freedom_speech": ("tongues loosen", "tongues stay behind teeth"),
    "freedom_press": ("the papers bite", "the papers go quiet"),
    "freedom_assembly": ("squares fill", "squares empty on command"),
    "freedom_religion": ("temple doors stay open", "temple doors close"),
    "political_freedom": ("the ballot thickens", "the ballot thins"),
    "voting_rights": ("more names on the roll", "names come off the roll"),
    "corruption": ("palms get greasier", "the ledgers get cleaner"),
    "political_apathy": ("nobody bothers to vote", "people show up"),
    "happiness": ("the mood lifts", "the mood sours"),
    "life_expectancy": ("people live a little longer", "funerals come earlier"),
    "obesity_rate": ("waistlines grow", "waistlines shrink"),
    "environment": ("the air clears a little", "the air fouls"),
    "pollution": ("smokestacks thicken", "smokestacks thin"),
    "biodiversity": ("birds return", "birds leave"),
    "eco_footprint": ("the land feels heavier", "the land feels lighter"),
    "healthcare_quality": ("clinics cope better", "clinics buckle"),
    "literacy_rate": ("more people can read a contract", "schools lose a year"),
    "university_attendance": ("campuses swell", "campuses empty"),
    "scientific_advancement": ("the labs hum", "the labs go dark"),
    "crime_rate": ("locks sell well", "the night feels safer"),
    "law_enforcement": ("the police thicken", "the police thin"),
    "military_strength": ("the army looks ready", "the army looks thin"),
    "income_equality": ("the gap narrows", "the gap yawns"),
    "gini_coefficient": ("the rich pull further ahead", "the rich and poor sit closer"),
    "population": ("more souls on the books", "fewer souls on the books"),
    "population_growth": ("cradles outpace graves", "graves outpace cradles"),
    "national_debt": ("the debt swells", "the debt eases"),
    "tax_rate": ("the collector takes more", "the collector takes less"),
    "tax_revenue": ("the treasury fills", "the treasury leaks"),
    "international_approval": ("abroad, a nod", "abroad, a cold shoulder"),
    "budget_education": ("schools get a thicker envelope", "schools get a thinner envelope"),
    "budget_defense": ("the barracks get paid", "the barracks wait"),
    "budget_healthcare": ("wards get funded", "wards wait"),
    "budget_welfare": ("the dole holds", "the dole frays"),
    "budget_environment": ("green desks get money", "green desks get cut"),
    "budget_infrastructure": ("roads get a crew", "potholes wait"),
}


def narrate(effects: Dict[str, float], blurb: str | None = None) -> List[str]:
    ranked = sorted(
        ((k, v) for k, v in (effects or {}).items() if k != "timezone_count" and abs(float(v or 0)) >= 0.4),
        key=lambda kv: -abs(float(kv[1])),
    )
    lines: List[str] = []
    if blurb:
        lines.append(blurb.strip())
    for key, val in ranked[:6]:
        pair = PHRASES.get(key)
        if not pair:
            continue
        up, down = pair
        lines.append(up if float(val) > 0 else down)
    if len(lines) == (1 if blurb else 0):
        lines.append("The decision stands. The rest of the country will feel it in time.")
    return lines
