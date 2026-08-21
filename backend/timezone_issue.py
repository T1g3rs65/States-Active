"""Structured timezone-count issue. Nations may only keep 1..geo_max contiguous zones."""

from typing import Optional
from models import Issue, IssueChoice
from timezone_effects import timezone_deltas


def build_timezone_issue(nation_id: str, name: str, geo_max: int, current: Optional[int]) -> Issue:
    geo_max = max(2, min(24, int(geo_max)))
    current = geo_max if current is None else max(1, min(geo_max, int(current)))
    half = max(1, (geo_max + 1) // 2)
    ordered = []
    for v in [current, geo_max, half, 2, 1]:
        if 1 <= v <= geo_max and v not in ordered:
            ordered.append(v)
        if len(ordered) >= 4:
            break

    def label(n: int) -> str:
        if n == 1:
            return "One national time"
        if n == geo_max:
            return f"Keep all {n} geographic timezones"
        return f"Consolidate to {n} official timezones"

    def desc(n: int) -> str:
        d = timezone_deltas(geo_max, n, daily=False)
        hap = d.get("happiness", 0)
        gdp = d.get("gdp", 0)
        bits = []
        if hap:
            bits.append(f"mood {hap:+.0f}")
        if gdp:
            bits.append(f"GDP {gdp:+.0f}")
        extra = (", ".join(bits) + ". ") if bits else ""
        if n == 1:
            return extra + "One clock: cheap to run, harsh on the rim."
        if n == geo_max:
            return extra + "Noon is noon everywhere. Offices don't share a hour."
        return extra + "Contiguous official hours only. No islands, no extra zones."

    choices = []
    for n in ordered:
        effects = timezone_deltas(geo_max, n, daily=False)
        effects["timezone_count"] = float(n)
        choices.append(IssueChoice(text=label(n), effects=effects, description=desc(n)))

    return Issue(
        nation_id=nation_id,
        kind="timezone",
        title="The Clockwork of the Realm",
        description=(
            f"{name} naturally spans {geo_max} contiguous timezones — that is the maximum you can have. "
            f"More clocks: happier coasts, fiddlier markets. Fewer clocks: one schedule, grouchy edges. "
            f"You cannot add hours you do not border, and you cannot leave a timezone island."
        ),
        choices=choices,
    )
