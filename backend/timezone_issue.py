"""Structured timezone-count issue. Nations may only keep 1..geo_max contiguous zones."""

from typing import Optional
from models import Issue, IssueChoice


def build_timezone_issue(nation_id: str, name: str, geo_max: int, current: Optional[int]) -> Issue:
    geo_max = max(2, min(24, int(geo_max)))
    current = geo_max if current is None else max(1, min(geo_max, int(current)))
    options = []
    options.append(geo_max)
    half = max(1, (geo_max + 1) // 2)
    if half not in options:
        options.append(half)
    if 2 < geo_max and 2 not in options:
        options.append(2)
    if 1 not in options:
        options.append(1)
    # keep current as first if it's a valid distinct option
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
        if n == 1:
            return "The whole country shares one clock. Simple, but the sun disagrees at the edges."
        if n == geo_max:
            return "Every longitude you occupy keeps its own hour. Accurate, fiddly."
        return f"{n} contiguous official zones. No islands of time; no extra hours beyond your land."

    choices = []
    for n in ordered:
        effects = {
            "timezone_count": float(n),
            "happiness": 4 if n == 1 else (2 if n < geo_max else 1),
            "gdp": 3 if n < geo_max else 0,
            "corruption": 2 if n == geo_max else -1,
        }
        choices.append(IssueChoice(text=label(n), effects=effects, description=desc(n)))

    return Issue(
        nation_id=nation_id,
        kind="timezone",
        title="The Clockwork of the Realm",
        description=(
            f"{name} naturally spans {geo_max} contiguous timezones — that is the maximum you can have. "
            f"You may keep fewer, but they must stay one connected strip of hours. "
            f"You cannot add zones you do not actually border, and you cannot leave a timezone island."
        ),
        choices=choices,
    )
