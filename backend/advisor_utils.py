"""
Advisor generation and management utilities.
"""
import random
import json
from pathlib import Path
from models import Advisor

# Load advisor names from config file
ADVISOR_NAMES_FILE = Path(__file__).parent / "advisor_names.json"

def load_advisor_names() -> dict:
    """Load advisor names configuration from JSON file."""
    try:
        with open(ADVISOR_NAMES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Filter out any keys starting with underscore (like _readme, _template)
            return {k: v for k, v in data.items() if not k.startswith('_')}
    except Exception as e:
        print(f"Error loading advisor_names.json: {e}")
        return {}

def get_race_names(race_id: str) -> tuple[list[str], list[str]]:
    """
    Get first and last names for a specific race.
    Falls back to 'human' names if race not found.
    
    Returns:
        Tuple of (first_names, last_names)
    """
    names_config = load_advisor_names()
    
    # Normalize race_id to lowercase
    race_key = race_id.lower() if race_id else "human"
    
    # Try to get race-specific names
    if race_key in names_config:
        race_names = names_config[race_key]
        return (
            race_names.get("first_names", FALLBACK_FIRST_NAMES),
            race_names.get("last_names", FALLBACK_LAST_NAMES)
        )
    
    # Fall back to human names if race not found
    if "human" in names_config:
        human_names = names_config["human"]
        return (
            human_names.get("first_names", FALLBACK_FIRST_NAMES),
            human_names.get("last_names", FALLBACK_LAST_NAMES)
        )
    
    # Ultimate fallback
    return (FALLBACK_FIRST_NAMES, FALLBACK_LAST_NAMES)

# Fallback name components if JSON file is missing or empty
FALLBACK_FIRST_NAMES = [
    "Alexander", "Marcus", "Isabella", "Catherine", "William", "Elizabeth",
    "Viktor", "Sophia", "Theodore", "Helena", "Magnus", "Anastasia",
    "Friedrich", "Octavia", "Dmitri", "Victoria", "Augustus", "Natalia"
]

FALLBACK_LAST_NAMES = [
    "von Strauss", "Blackwood", "Ashford", "Volkova", "Sterling", "Ravencroft",
    "Montague", "Drakos", "Blackwell", "Volkov", "Ashworth", "Konstantin"
]

# Advisor templates by slot (slot, title_base, stat_boost, special_effect)
ADVISOR_TEMPLATES = [
    {
        "slot": 1,
        "title_base": "First Minister",
        "titles": {
            "Democracy": "Prime Minister",
            "Monarchy": "Lord Chancellor",
            "Theocracy": "High Pontiff",
            "Dictatorship": "First Commissar",
            "Corporate": "CEO"
        },
        "stat_boost": "+10% GDP growth",
        "traits": ["Ambitious", "Loyal", "Corrupt", "Idealist", "Pragmatic"],
        "special_effect": "Emergency Tax Increase: Can trigger +25% tax revenue for 5 turns"
    },
    {
        "slot": 2,
        "title_base": "Treasurer",
        "titles": {
            "Democracy": "Finance Minister",
            "Monarchy": "Master of Coin",
            "Theocracy": "Divine Bursar",
            "Dictatorship": "Economic Director",
            "Corporate": "CFO"
        },
        "stat_boost": "Reduces corruption & debt interest",
        "traits": ["Greedy", "Frugal", "Honest", "Shrewd", "Wasteful"],
        "special_effect": "Golden Age: +30% GDP for 10 turns"
    },
    {
        "slot": 3,
        "title_base": "Marshal",
        "titles": {
            "Democracy": "Defense Minister",
            "Monarchy": "Lord Marshal",
            "Theocracy": "Templar Grandmaster",
            "Dictatorship": "Red Army Commander",
            "Corporate": "Chief Security Officer"
        },
        "stat_boost": "+Military strength",
        "traits": ["Aggressive", "Cautious", "Brilliant", "Drunkard", "Veteran"],
        "special_effect": "Military Rush: Free tech advancement OR +50% defensive bonus"
    },
    {
        "slot": 4,
        "title_base": "Minister of Culture",
        "titles": {
            "Democracy": "Culture Minister",
            "Monarchy": "Royal Chamberlain",
            "Theocracy": "High Priest",
            "Dictatorship": "Propaganda Minister",
            "Corporate": "Brand Director"
        },
        "stat_boost": "+Happiness & stability",
        "traits": ["Zealous", "Tolerant", "Atheist", "Charismatic", "Dull"],
        "special_effect": "Cultural Renaissance: +20 happiness for 15 turns"
    },
    {
        "slot": 5,
        "title_base": "Spymaster",
        "titles": {
            "Democracy": "Intelligence Director",
            "Monarchy": "Master of Whispers",
            "Theocracy": "Inquisitor General",
            "Dictatorship": "NKVD Chief",
            "Corporate": "Compliance Director"
        },
        "stat_boost": "+Counter-espionage, -rebellion",
        "traits": ["Paranoid", "Ruthless", "Incompetent", "Cunning", "Lazy"],
        "special_effect": "Shadow Operations: Can sabotage rival nation once per era"
    },
    {
        "slot": 6,
        "title_base": "Chief Builder",
        "titles": {
            "Democracy": "Infrastructure Minister",
            "Monarchy": "Royal Engineer",
            "Theocracy": "Divine Architect",
            "Dictatorship": "Construction Commissar",
            "Corporate": "Operations Director"
        },
        "stat_boost": "Faster improvements & wonders",
        "traits": ["Visionary", "Lazy", "Efficient", "Wasteful", "Genius"],
        "special_effect": "Grand Projects: 50% cost reduction on national wonders"
    },
    {
        "slot": 7,
        "title_base": "Grand Diplomat",
        "titles": {
            "Democracy": "Foreign Secretary",
            "Monarchy": "Ambassador-General",
            "Theocracy": "Papal Legate",
            "Dictatorship": "People's Diplomat",
            "Corporate": "External Affairs VP"
        },
        "stat_boost": "+Relations with neighbors",
        "traits": ["Charismatic", "Hawk", "Isolationist", "Smooth", "Abrasive"],
        "special_effect": "Diplomatic Coup: Force peace treaty OR secret alliance"
    },
    {
        "slot": 8,
        "title_base": "Royal Scientist",
        "titles": {
            "Democracy": "Science Minister",
            "Monarchy": "Court Inventor",
            "Theocracy": "Magister of the Academy",
            "Dictatorship": "Chief Scientist",
            "Corporate": "R&D Director"
        },
        "stat_boost": "+Research speed",
        "traits": ["Genius", "Mad", "Conservative", "Innovative", "Eccentric"],
        "special_effect": "Eureka Moment: Free random tech advancement every 20 turns"
    }
]


def generate_advisors(government_type: str, race: str = "human") -> list[Advisor]:
    """
    Generate 8 advisors for a new nation based on government type and race.
    
    Args:
        government_type: The type of government (Democracy, Monarchy, etc.)
        race: The race of the nation (human, zythera, etc.) - determines name pool
    
    Returns:
        List of 8 Advisor objects
    """
    advisors = []
    
    # Get race-specific names
    first_names, last_names = get_race_names(race)
    
    for template in ADVISOR_TEMPLATES:
        # Get appropriate title for government type
        title = template["titles"].get(government_type, template["title_base"])
        
        # Generate random name from race-specific pool
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # Random approval (starting range based on slot importance)
        if template["slot"] <= 2:
            approval = random.randint(45, 85)
        elif template["slot"] <= 4:
            approval = random.randint(50, 90)
        else:
            approval = random.randint(40, 80)
        
        # Random ability (how good they are at their job - visible to player)
        ability = random.randint(30, 95)
        
        # Random trustworthiness (hidden - affects betrayal chance)
        trustworthiness = random.randint(30, 90)
        
        # Create advisor
        advisor = Advisor(
            slot=template["slot"],
            title=title,
            name=name,
            approval=approval,
            ability=ability,
            trustworthiness=trustworthiness,
            last_task_sent=None
        )
        
        advisors.append(advisor)
    
    return advisors


def regenerate_advisor_names(advisors: list[dict], race: str = "human") -> list[dict]:
    """
    Regenerate names for existing advisors based on race.
    Preserves all other advisor properties (ability, approval, etc.)
    
    Args:
        advisors: List of advisor dictionaries
        race: The race to generate names for
    
    Returns:
        Updated list of advisor dictionaries with new names
    """
    first_names, last_names = get_race_names(race)
    
    for advisor in advisors:
        advisor["name"] = f"{random.choice(first_names)} {random.choice(last_names)}"
    
    return advisors


def update_advisor_approval(advisors: list[Advisor], slot: int, change: int) -> list[Advisor]:
    """
    Update an advisor's approval rating and check if special becomes active/inactive.
    
    Args:
        advisors: List of current advisors
        slot: Slot number (1-8) of advisor to update
        change: Amount to change approval by (can be negative)
    
    Returns:
        Updated list of advisors
    """
    for advisor in advisors:
        if advisor.slot == slot:
            advisor.approval = max(0, min(100, advisor.approval + change))
            advisor.special_active = advisor.approval >= 70
            break
    
    return advisors
