"""Binary statutes stamped by issue answers. Not the AI law blurb list."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Tuple

# id, label, words that turn ON, words that turn OFF
CATALOG: List[Tuple[str, str, List[str], List[str]]] = [
    ("death_penalty", "Death penalty", ["death penalty", "capital punishment", "hanging", "firing squad"], ["abolish", "ban capital", "end the death", "no executions"]),
    ("cannabis", "Recreational cannabis", ["legalize cannabis", "legalise cannabis", "legalize marijuana", "decriminal"], ["ban cannabis", "ban marijuana", "criminalize cannabis"]),
    ("same_sex_marriage", "Same-sex marriage", ["same-sex", "gay marriage", "marriage equality"], ["traditional marriage only", "ban gay marriage", "one man and one woman"]),
    ("abortion", "Legal abortion", ["legal abortion", "right to choose", "clinic access"], ["ban abortion", "pro-life ban", "outlaw abortion"]),
    ("conscription", "Conscription", ["conscription", "the draft", "mandatory service", "call up"], ["end the draft", "abolish conscription", "all-volunteer"]),
    ("nuclear_power", "Nuclear power", ["build reactors", "nuclear expansion", "more nuclear"], ["ban nuclear", "phase out nuclear", "shut the reactors"]),
    ("universal_healthcare", "Universal healthcare", ["universal healthcare", "free healthcare", "national health"], ["privatize health", "private insurance only"]),
    ("free_tuition", "Free university", ["free tuition", "free university", "abolish fees"], ["tuition fees", "charge students"]),
    ("ubi", "Basic income", ["universal basic income", "ubi", "citizen's dividend"], ["scrap ubi", "end basic income"]),
    ("press_censorship", "Press censorship", ["censor the press", "state newspaper", "license journalists"], ["free press", "uncensor", "repeal censorship"]),
    ("surveillance", "Mass surveillance", ["mass surveillance", "cameras on every", "monitor citizens"], ["ban surveillance", "end the cameras", "privacy law"]),
    ("minimum_wage", "Minimum wage", ["raise the minimum wage", "living wage"], ["abolish the minimum wage", "no wage floor"]),
    ("open_borders", "Open borders", ["open the border", "open borders", "welcome refugees"], ["close the border", "seal the border", "end asylum"]),
]


def _negates(text: str, offs: List[str]) -> bool:
    return any(w in text for w in offs)


def detect_flags(issue_title: str, choice_text: str, choice_desc: str = "") -> List[Dict]:
    blob = f"{issue_title} {choice_text} {choice_desc}".lower()
    choice = f"{choice_text} {choice_desc}".lower()
    out: List[Dict] = []
    for fid, label, ons, offs in CATALOG:
        if not fid or not label:
            continue
        hit = any(w in blob for w in ons)
        if not hit:
            continue
        on = True
        if offs and _negates(choice, offs):
            on = False
        elif any(w in choice for w in ("ban", "abolish", "outlaw", "scrap", "end the", "phase out", "close the")) and not any(
            w in choice for w in ("legalize", "legalise", "establish", "introduce", "expand")
        ):
            # Generic ban language against this topic
            on = False
        out.append({"id": fid, "label": label, "on": on})
    return out


def apply_flags(existing: Optional[dict], detected: List[Dict], issue_title: str) -> dict:
    store = dict(existing or {})
    now = datetime.utcnow().isoformat() + "Z"
    for d in detected:
        store[d["id"]] = {
            "id": d["id"],
            "label": d["label"],
            "on": bool(d["on"]),
            "updated_at": now,
            "source": issue_title[:80],
        }
    return store


def public_list(store: Optional[dict]) -> List[dict]:
    rows = list((store or {}).values())
    rows.sort(key=lambda r: (not r.get("on", True), r.get("label") or ""))
    return rows
