"""Short nation name: place-name only. Wheels supply Republic / Kingdom / etc."""

from __future__ import annotations

import re

_PHRASES = (
    "united states",
    "united kingdom",
    "people's republic",
    "peoples republic",
    "democratic republic",
    "federal republic",
    "islamic republic",
    "soviet union",
    "states of",
    "republic of",
    "kingdom of",
    "empire of",
    "federation of",
    "confederation of",
    "confederacy of",
    "commonwealth of",
    "union of",
    "dominion of",
    "nation of",
    "state of",
)

_WORDS = {
    "republic",
    "kingdom",
    "empire",
    "federation",
    "confederacy",
    "confederation",
    "commonwealth",
    "dominion",
    "principality",
    "duchy",
    "sultanate",
    "emirate",
    "caliphate",
    "theocracy",
    "democracy",
    "autocracy",
    "oligarchy",
    "dictatorship",
    "junta",
    "union",
    "states",
    "united",
    "federal",
    "federacy",
    "imperial",
}


def short_name_error(raw: str) -> str | None:
    name = re.sub(r"\s+", " ", (raw or "").strip())
    if len(name) < 2:
        return "Give your nation a short name (at least 2 letters)."
    if len(name) > 32:
        return "Keep the short name under 32 characters."
    lower = name.lower()
    if lower.startswith("the "):
        return "Drop the leading “The”. Wheels already add the full title."
    for p in _PHRASES:
        if p in lower:
            return (
                "Don’t put a government title in the short name. "
                "Use a place name like Sigracia, not “Republic of…”."
            )
    tokens = re.split(r"[^a-z0-9']+", lower)
    for w in tokens:
        if w in _WORDS:
            return f"Don’t include “{w}” — that’s a government title. The wheels add it."
    return None
