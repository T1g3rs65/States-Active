"""
Unique advisor daily effects + public serialization.

Each slot is a different job. Ticks only run once per UTC day when the
player actually loads their nation (AFK nations do not cook).
"""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
import random
from typing import Any, Optional

ROLE = {
    1: {
        "id": "minister",
        "verb": "governs",
        "task_hint": "Set a 3-day national priority: economy, stability, or war prep.",
        "today": "Steers the cabinet. Tiny GDP growth; a bit of happiness if the books aren't on fire.",
    },
    2: {
        "id": "treasurer",
        "verb": "counts coin",
        "task_hint": "Reallocate one budget slice or hunt waste in the ledgers.",
        "today": "Fights corruption and nicks at the debt. Useless if they're crooked.",
    },
    3: {
        "id": "marshal",
        "verb": "drills the army",
        "task_hint": "Order drills, fortify, or mobilize. Declare war from this desk.",
        "today": "Daily military readiness. War bonus still uses ability+approval (uncapped at 20).",
    },
    4: {
        "id": "culture",
        "verb": "shapes the mood",
        "task_hint": "Stage a festival, patronage, or a propaganda push.",
        "today": "Happiness up, political apathy down. Scandal-prone if untrustworthy.",
    },
    5: {
        "id": "spy",
        "verb": "watches",
        "task_hint": "Intel on a named rival, or investigate a cabinet member's loyalty.",
        "today": "Crime down, law up. Can snapshot another advisor's trust (that number goes stale).",
    },
    6: {
        "id": "builder",
        "verb": "builds",
        "task_hint": "Push infrastructure, or develop a resource you actually own.",
        "today": "Infrastructure / footprint. Weak if you own nothing worth building on.",
    },
    7: {
        "id": "diplomat",
        "verb": "talks",
        "task_hint": "Send a note, propose a NAP, or mediate a named neighbor.",
        "today": "International approval. Opens pacts from this desk.",
    },
    8: {
        "id": "scientist",
        "verb": "researches",
        "task_hint": "Focus research: military, civic, or industry for a week.",
        "today": "Science and universities. Mad ones pollute.",
    },
}

TRUST_STALE_AFTER_DAYS = 7


def _m(ability: int, approval: int) -> float:
    a = max(0, min(100, ability)) / 100.0
    p = max(0, min(100, approval)) / 100.0
    return a * (0.5 + 0.5 * p)


def _clamp_stat(stats: dict, key: str, delta: float, lo: float = 0.0, hi: float = 100.0) -> float:
    cur = float(stats.get(key, 50) or 0)
    nxt = max(lo, min(hi, cur + delta))
    applied = nxt - cur
    stats[key] = nxt
    return applied


def apply_daily_ticks(nation: dict, now: Optional[datetime] = None) -> bool:
    """Mutate nation in place. Return True if a tick was applied (caller should save)."""
    now = now or datetime.utcnow()
    today = now.date().isoformat()
    if nation.get("last_advisor_tick") == today:
        return False

    stats = nation.get("stats") or {}
    advisors = nation.get("advisors") or []
    if not advisors:
        from timezone_effects import apply_timezone_tick
        apply_timezone_tick(nation)
        nation["last_advisor_tick"] = today
        return True

    for adv in advisors:
        slot = int(adv.get("slot") or 0)
        ability = int(adv.get("ability") or 50)
        approval = int(adv.get("approval") or 50)
        trust = int(adv.get("trustworthiness") or 50)
        m = _m(ability, approval)
        betrayed = False
        if trust < 40 and random.random() < (40 - trust) / 200.0:
            betrayed = True
        sign = -1.0 if betrayed else 1.0
        line = ROLE.get(slot, {}).get("today", "")

        if slot == 1:
            g = _clamp_stat(stats, "economy_growth", sign * 0.15 * m)
            h = 0.0
            if float(stats.get("national_debt", 40)) < 70:
                h = _clamp_stat(stats, "happiness", sign * 0.2 * m)
            line = f"GDP growth {g:+.2f}, mood {h:+.2f}" + (" — skimming the till" if betrayed else "")
        elif slot == 2:
            c = _clamp_stat(stats, "corruption", sign * -0.25 * m)
            d = _clamp_stat(stats, "national_debt", sign * -0.12 * m)
            line = f"Corruption {c:+.2f}, debt {d:+.2f}" + (" — books don't add up" if betrayed else "")
        elif slot == 3:
            mil = _clamp_stat(stats, "military_strength", sign * 0.2 * m)
            line = f"Readiness {mil:+.2f}" + (" — parade army, not a real one" if betrayed else "")
        elif slot == 4:
            h = _clamp_stat(stats, "happiness", sign * 0.3 * m)
            a = _clamp_stat(stats, "political_apathy", sign * -0.15 * m)
            line = f"Happiness {h:+.2f}, apathy {a:+.2f}" + (" — scandal in the papers" if betrayed else "")
        elif slot == 5:
            cr = _clamp_stat(stats, "crime_rate", sign * -0.2 * m)
            le = _clamp_stat(stats, "law_enforcement", sign * 0.15 * m)
            line = f"Crime {cr:+.2f}, law {le:+.2f}" + (" — watching you, not them" if betrayed else "")
        elif slot == 6:
            infra = float(stats.get("budget_infrastructure", 10) or 0)
            g = _clamp_stat(stats, "gdp", sign * 0.08 * m * (0.4 + infra / 50.0))
            p = _clamp_stat(stats, "pollution", sign * -0.08 * m)
            line = f"Projects {g:+.2f} GDP, pollution {p:+.2f}" + (" — cost overrun" if betrayed else "")
        elif slot == 7:
            ia = _clamp_stat(stats, "international_approval", sign * 0.2 * m)
            line = f"Abroad {ia:+.2f}" + (" — leaked a cable" if betrayed else "")
        elif slot == 8:
            sci = _clamp_stat(stats, "scientific_advancement", sign * 0.25 * m)
            uni = _clamp_stat(stats, "university_attendance", sign * 0.1 * m)
            extra = ""
            if betrayed:
                _clamp_stat(stats, "pollution", 0.4)
                extra = " — lab accident"
            line = f"Science {sci:+.2f}, campuses {uni:+.2f}{extra}"

        adv["last_effect"] = line
        adv["role_id"] = ROLE.get(slot, {}).get("id")
        adv["role_blurb"] = ROLE.get(slot, {}).get("today")
        adv["task_hint"] = ROLE.get(slot, {}).get("task_hint")

    nation["stats"] = stats
    nation["advisors"] = advisors
    from timezone_effects import apply_timezone_tick
    apply_timezone_tick(nation)
    nation["last_advisor_tick"] = today
    return True


def publicize_advisors(advisors: list) -> list:
    """Strip live trust. Keep snapshot fields for the UI."""
    out = []
    now = datetime.utcnow()
    for raw in advisors or []:
        adv = deepcopy(raw) if isinstance(raw, dict) else dict(raw)
        slot = int(adv.get("slot") or 0)
        adv.pop("trustworthiness", None)
        meta = ROLE.get(slot, {})
        adv.setdefault("role_id", meta.get("id"))
        adv.setdefault("role_blurb", meta.get("today"))
        adv.setdefault("task_hint", meta.get("task_hint"))
        known_at = adv.get("trust_known_at")
        if known_at:
            if isinstance(known_at, datetime):
                age = (now - known_at).days
                adv["trust_known_at"] = known_at.isoformat()
            else:
                try:
                    parsed = datetime.fromisoformat(str(known_at).replace("Z", ""))
                    age = (now - parsed).days
                except Exception:
                    age = 0
            adv["trust_is_stale"] = age >= TRUST_STALE_AFTER_DAYS
            adv["trust_age_days"] = age
        else:
            adv["trust_known"] = None
            adv["trust_is_stale"] = False
            adv["trust_age_days"] = None
        out.append(adv)
    return out


def reveal_trust(advisors: list, target_slot: int, now: Optional[datetime] = None) -> Optional[int]:
    now = now or datetime.utcnow()
    value = None
    for adv in advisors:
        if int(adv.get("slot") or 0) != target_slot:
            continue
        value = int(adv.get("trustworthiness") or 50)
        adv["trust_known"] = value
        adv["trust_known_at"] = now
        break
    return value
