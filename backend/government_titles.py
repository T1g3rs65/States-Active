"""Leader, body, and advisor titles from Wheel 2 subtype.

Leader is head of state/government on the nation page.
Slot 1 is never the same job as the leader (no double Prime Minister).
"""
from __future__ import annotations

from typing import Any, Dict, Tuple, Union

Title = Union[str, Tuple[str, str]]

from human_names import FEMALE_FIRST_LOWER as FEMALE_FIRST


def leader_is_female(name: str) -> bool:
    if not name:
        return False
    first = name.split()[0].lower()
    if first in FEMALE_FIRST:
        return True
    return first.endswith(("a", "ie", "ine", "ella", "ette"))


def pick(title: Title, female: bool) -> str:
    if isinstance(title, tuple):
        return title[1] if female else title[0]
    return title


# slot 1..8
PACKS: Dict[str, Dict[str, Any]] = {
    "presidential": {
        "leader": "President",
        "body": "Cabinet",
        "portrait": "president",
        "slots": {
            1: "Chief of Staff",
            2: "Treasury Secretary",
            3: "Defense Secretary",
            4: "Culture Secretary",
            5: "Intelligence Director",
            6: "Interior Secretary",
            7: "Secretary of State",
            8: "Science Secretary",
        },
    },
    "parliamentary": {
        "leader": "Prime Minister",
        "body": "Cabinet",
        "portrait": "prime_minister",
        "slots": {
            1: "Deputy Prime Minister",
            2: "Chancellor of the Exchequer",
            3: "Defence Secretary",
            4: "Culture Secretary",
            5: "Security Service Director",
            6: "Works Secretary",
            7: "Foreign Secretary",
            8: "Science Secretary",
        },
    },
    "assembly": {
        "leader": "Speaker of the Assembly",
        "body": "Assembly",
        "portrait": "president",
        "slots": {
            1: "First Delegate",
            2: "Purse-Keeper",
            3: "Militia Captain",
            4: "Festival Warden",
            5: "Watch-Keeper",
            6: "Commons Builder",
            7: "Envoy",
            8: "Natural Philosopher",
        },
    },
    "coalition": {
        "leader": "President",
        "body": "Grand Coalition Cabinet",
        "portrait": "president",
        "slots": {
            1: "Chief of Staff",
            2: "Treasury Secretary",
            3: "Defense Secretary",
            4: "Culture Secretary",
            5: "Intelligence Director",
            6: "Interior Secretary",
            7: "Secretary of State",
            8: "Science Secretary",
        },
    },
    "politburo": {
        "leader": "General Secretary",
        "body": "Politburo",
        "portrait": "chairman",
        "slots": {
            1: "First Secretary",
            2: "People's Commissar of Finance",
            3: "Defense Commissar",
            4: "Agitprop Chief",
            5: "State Security Chief",
            6: "Construction Commissar",
            7: "Foreign Commissar",
            8: "Academy Director",
        },
    },
    "junta": {
        "leader": ("Chairman of the Junta", "Chairwoman of the Junta"),
        "body": "High Command",
        "portrait": "military",
        "slots": {
            1: "Chief of Staff",
            2: "Quartermaster-General",
            3: "Chief of the Army",
            4: "Morale Officer",
            5: "Military Intelligence",
            6: "Corps of Engineers",
            7: "Foreign Attaché",
            8: "Ordnance Scientist",
        },
    },
    "board": {
        "leader": ("Chairman of the Board", "Chairwoman of the Board"),
        "body": "Board of Directors",
        "portrait": "corporate",
        "slots": {
            1: "Chief of Staff",
            2: "CFO",
            3: "Chief Security Officer",
            4: "Brand Director",
            5: "Compliance Director",
            6: "COO",
            7: "External Affairs",
            8: "R&D Director",
        },
    },
    "privy": {
        "leader": ("King", "Queen"),
        "body": "Privy Council",
        "portrait": "monarch",
        "slots": {
            1: "Lord Chancellor",
            2: "Master of Coin",
            3: "Lord Marshal",
            4: "Lord Chamberlain",
            5: "Master of Whispers",
            6: "Royal Engineer",
            7: "Ambassador-General",
            8: "Court Inventor",
        },
    },
    "imperial": {
        "leader": ("Emperor", "Empress"),
        "body": "Imperial Court",
        "portrait": "emperor",
        "slots": {
            1: "Lord Chancellor",
            2: "Master of Coin",
            3: "Lord Marshal",
            4: "Lord Chamberlain",
            5: "Master of Whispers",
            6: "Royal Engineer",
            7: "Ambassador-General",
            8: "Court Inventor",
        },
    },
    "aristocracy": {
        "leader": "First Peer",
        "body": "Privy Council",
        "portrait": "monarch",
        "slots": {
            1: "Lord Chancellor",
            2: "Master of Coin",
            3: "Lord Marshal",
            4: "Lord Chamberlain",
            5: "Master of Whispers",
            6: "Royal Engineer",
            7: "Ambassador-General",
            8: "Court Inventor",
        },
    },
    "synod": {
        "leader": ("Patriarch", "Matriarch"),
        "body": "Holy Synod",
        "portrait": "theocrat",
        "slots": {
            1: "Cardinal-Secretary",
            2: "Divine Bursar",
            3: "Templar Grandmaster",
            4: "High Preacher",
            5: "Inquisitor General",
            6: "Divine Architect",
            7: "Papal Legate",
            8: "Magister of the Academy",
        },
    },
    "elders": {
        "leader": "Elder Speaker",
        "body": "Council of Elders",
        "portrait": "chairman",
        "slots": {
            1: "First Elder",
            2: "Purse Elder",
            3: "War Elder",
            4: "Lorekeeper",
            5: "Watch Elder",
            6: "Stone Elder",
            7: "Envoy Elder",
            8: "Sage",
        },
    },
    "syndicate": {
        "leader": "General Secretary",
        "body": "Executive Committee",
        "portrait": "chairman",
        "slots": {
            1: "First Secretary",
            2: "Treasurer",
            3: "Defense Steward",
            4: "Culture Steward",
            5: "Integrity Officer",
            6: "Works Steward",
            7: "International Secretary",
            8: "Research Steward",
        },
    },
    "commission": {
        "leader": ("Don", "Godmother"),
        "body": "Commission",
        "portrait": "dictator",
        "slots": {
            1: "Consigliere",
            2: "Bookkeeper",
            3: "Capo of Arms",
            4: "Public Face",
            5: "Consigliere of Silence",
            6: "Builder",
            7: "Outside Man",
            8: "Chemist",
        },
    },
    "inner": {
        "leader": "Supreme Leader",
        "body": "Inner Circle",
        "portrait": "dictator",
        "slots": {
            1: "First Minister",
            2: "Economic Director",
            3: "Army Commander",
            4: "Propaganda Minister",
            5: "Secret Police Chief",
            6: "Construction Commissar",
            7: "People's Diplomat",
            8: "Chief Scientist",
        },
    },
    "curia": {
        "leader": ("High Priest", "High Priestess"),
        "body": "Curia",
        "portrait": "theocrat",
        "slots": {
            1: "Grand Confessor",
            2: "Divine Bursar",
            3: "Templar Grandmaster",
            4: "High Preacher",
            5: "Inquisitor General",
            6: "Divine Architect",
            7: "Apostolic Legate",
            8: "Magister",
        },
    },
    "consulate": {
        "leader": "Co-Consul",
        "body": "Consulate",
        "portrait": "president",
        "slots": {
            1: "Chancellor",
            2: "Treasurer",
            3: "Marshal",
            4: "Chamberlain",
            5: "Spymaster",
            6: "Master of Works",
            7: "Envoy",
            8: "Court Scholar",
        },
    },
    "nsc": {
        "leader": "President",
        "body": "National Security Council",
        "portrait": "military",
        "slots": {
            1: "Chief of Staff",
            2: "Finance Minister",
            3: "Defense Minister",
            4: "Culture Minister",
            5: "Intelligence Director",
            6: "Infrastructure Minister",
            7: "Foreign Minister",
            8: "Science Minister",
        },
    },
    "circle": {
        "leader": "Spokesperson",
        "body": "Coordinating Circle",
        "portrait": "president",
        "slots": {
            1: "First Delegate",
            2: "Purse-Keeper",
            3: "Militia Captain",
            4: "Story-Keeper",
            5: "Watch",
            6: "Commons Builder",
            7: "Envoy",
            8: "Tinker",
        },
    },
    "mutual": {
        "leader": "Facilitator",
        "body": "Circle",
        "portrait": "president",
        "slots": {
            1: "First Delegate",
            2: "Purse-Keeper",
            3: "Militia Captain",
            4: "Story-Keeper",
            5: "Watch",
            6: "Commons Builder",
            7: "Envoy",
            8: "Tinker",
        },
    },
    "workers": {
        "leader": "Delegate",
        "body": "Workers' Council",
        "portrait": "chairman",
        "slots": {
            1: "First Delegate",
            2: "Purse-Keeper",
            3: "Militia Captain",
            4: "Story-Keeper",
            5: "Watch",
            6: "Commons Builder",
            7: "Envoy",
            8: "Tinker",
        },
    },
    "ancap": {
        "leader": "Chief Arbiter",
        "body": "Board of Charters",
        "portrait": "corporate",
        "slots": {
            1: "Managing Partner",
            2: "Comptroller",
            3: "Security Contractor",
            4: "Publicist",
            5: "Risk Officer",
            6: "Operations",
            7: "Negotiator",
            8: "Research Lead",
        },
    },
    "tribal": {
        "leader": "Clan Speaker",
        "body": "Elder Circle",
        "portrait": "chairman",
        "slots": {
            1: "First Elder",
            2: "Purse Elder",
            3: "War Elder",
            4: "Lorekeeper",
            5: "Watch Elder",
            6: "Stone Elder",
            7: "Envoy Elder",
            8: "Sage",
        },
    },
    "warlord": {
        "leader": "Warlord",
        "body": "War Council",
        "portrait": "military",
        "slots": {
            1: "Second",
            2: "Paymaster",
            3: "Marshal",
            4: "Herald",
            5: "Scoutmaster",
            6: "Sappers",
            7: "Fixer",
            8: "Armorer",
        },
    },
    "hive": {
        "leader": "Queen",
        "body": "Queen's Chamber",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_council": {
        "leader": "Queen",
        "body": "Hive Council",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_caste": {
        "leader": "Queen",
        "body": "Caste Council",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_sacred": {
        "leader": "Queen",
        "body": "Sacred Brood",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_elder": {
        "leader": "Queen",
        "body": "Elder Brood",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_inner": {
        "leader": "Queen",
        "body": "Inner Brood",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "hive_divine": {
        "leader": "Queen",
        "body": "Divine Hive",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
    "swarm": {
        "leader": "Queen",
        "body": "Swarm",
        "portrait": "queen",
        "slots": {
            1: "First Consort-Minister",
            2: "Hive Treasurer",
            3: "Brood Marshal",
            4: "Brood-Singer",
            5: "Whisper-Keeper",
            6: "Hivewright",
            7: "Swarm-Envoy",
            8: "Brood-Sage",
        },
    },
}

SUBTYPE_PACK = {
    "Representative Democracy": "presidential",
    "Parliamentary Democracy": "parliamentary",
    "Presidential Democracy": "presidential",
    "Democratic Republic": "presidential",
    "Direct Democracy": "assembly",
    "Consociational Democracy": "coalition",
    "Deliberative Democracy": "assembly",
    "One-Party Elite Rule": "politburo",
    "Military Junta": "junta",
    "Plutocracy": "board",
    "Aristocracy": "aristocracy",
    "Theocratic Council": "synod",
    "Gerontocracy": "elders",
    "Syndicate / Labor Oligarchy": "syndicate",
    "Mafiocracy / Criminal Oligarchy": "commission",
    "Dictatorship": "inner",
    "Absolute Monarchy": "privy",
    "Tyranny / Personalist Rule": "inner",
    "Absolute Theocracy": "curia",
    "Electoral Autocracy": "presidential",
    "Diarchy / Dual Rule": "consulate",
    "Competitive Authoritarian": "presidential",
    "Illiberal Democracy": "parliamentary",
    "Military-Managed Democracy": "nsc",
    "Anarcho-Communist Commune": "circle",
    "Warlord / Failed State": "warlord",
    "Anarcho-Capitalist / Private-Law": "ancap",
    "Mutual-Aid Network": "mutual",
    "Tribal / Clan Anarchy": "tribal",
    "Worker-Syndicate Free Territory": "workers",
    "Hive Council / One-Party Elite Rule": "hive_council",
    "Caste Oligarchy": "hive_caste",
    "Absolute Monarchy / Queen-Rule": "hive",
    "Hive Collapse / Swarm Anarchy": "swarm",
}

ZYTHERA_OVERRIDE = {
    "Theocratic Council": "hive_sacred",
    "Gerontocracy": "hive_elder",
    "Tyranny / Personalist Rule": "hive_inner",
    "Absolute Theocracy": "hive_divine",
}


def _is_imperial(territorial: str) -> bool:
    t = (territorial or "").lower()
    return "imperial" in t or "hegemon" in t


def pack_id_for(subtype: str, territorial: str = "", race: str = "human") -> str:
    race_l = (race or "human").lower()
    sub = subtype or ""
    if race_l == "zythera":
        if sub in ZYTHERA_OVERRIDE:
            return ZYTHERA_OVERRIDE[sub]
        if sub in SUBTYPE_PACK and SUBTYPE_PACK[sub].startswith("hive"):
            pid = SUBTYPE_PACK[sub]
        elif sub in SUBTYPE_PACK:
            # Human pack names don't fit a hive; default chamber unless mapped.
            pid = SUBTYPE_PACK.get(sub, "hive")
            if pid not in ("hive", "hive_council", "hive_caste", "hive_sacred", "hive_elder", "hive_inner", "hive_divine", "swarm"):
                pid = "hive"
        else:
            pid = "hive"
        return pid
    pid = SUBTYPE_PACK.get(sub, "presidential")
    if pid == "privy" and _is_imperial(territorial):
        return "imperial"
    return pid


def resolve_pack(subtype: str, territorial: str = "", race: str = "human") -> Dict[str, Any]:
    return PACKS[pack_id_for(subtype, territorial, race)]


def leader_title(subtype: str, territorial: str = "", race: str = "human", leader_name: str = "") -> str:
    pack = resolve_pack(subtype, territorial, race)
    if (race or "").lower() == "zythera":
        return "Queen"
    return pick(pack["leader"], leader_is_female(leader_name))


def body_name(subtype: str, territorial: str = "", race: str = "human") -> str:
    return resolve_pack(subtype, territorial, race)["body"]


def portrait_kind(subtype: str, territorial: str = "", race: str = "human") -> str:
    if (race or "").lower() == "zythera":
        return "queen"
    return resolve_pack(subtype, territorial, race)["portrait"]


def advisor_title(slot: int, subtype: str, territorial: str = "", race: str = "human") -> str:
    pack = resolve_pack(subtype, territorial, race)
    return pack["slots"].get(int(slot) or 0, "Advisor")


def apply_titles(nation: Dict[str, Any]) -> Dict[str, Any]:
    """Stamp live titles onto a nation dict (advisors + leader_title)."""
    subtype = nation.get("government_subtype") or ""
    territorial = nation.get("territorial_structure") or ""
    race = nation.get("race") or "human"
    leader_name = nation.get("leader_name") or ""
    nation["leader_title"] = leader_title(subtype, territorial, race, leader_name)
    nation["advisor_body"] = body_name(subtype, territorial, race)
    advisors = nation.get("advisors") or []
    for adv in advisors:
        slot = adv.get("slot") if isinstance(adv, dict) else getattr(adv, "slot", 0)
        title = advisor_title(int(slot or 0), subtype, territorial, race)
        if isinstance(adv, dict):
            adv["title"] = title
        else:
            adv.title = title
    return nation
