"""
Race configuration service for SovereignHex.
Loads races from races.json and handles server-specific race filtering.
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Optional

# Load races from config file
RACES_FILE = Path(__file__).parent / "races.json"

def load_races_config() -> Dict:
    """Load the races configuration file."""
    try:
        with open(RACES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading races.json: {e}")
        return {"races": []}

def get_all_races() -> List[Dict]:
    """Get all races from config (regardless of enabled status)."""
    config = load_races_config()
    return config.get("races", [])

def get_enabled_races() -> List[Dict]:
    """
    Get races that are enabled for this server.
    Checks ENABLED_RACES env var first, then falls back to races.json enabled field.
    """
    all_races = get_all_races()
    
    # Check for environment variable override
    enabled_env = os.environ.get("ENABLED_RACES", "").strip()
    
    if enabled_env:
        # Use env var to filter races
        enabled_ids = [r.strip().lower() for r in enabled_env.split(",") if r.strip()]
        return [r for r in all_races if r.get("id", "").lower() in enabled_ids]
    else:
        # Use enabled field from config
        return [r for r in all_races if r.get("enabled", True)]

def get_race_by_id(race_id: str) -> Optional[Dict]:
    """Get a specific race by ID."""
    for race in get_all_races():
        if race.get("id", "").lower() == race_id.lower():
            return race
    return None

def get_race_ai_description(race_id: str) -> str:
    """Get the AI description for a race (used in prompts)."""
    race = get_race_by_id(race_id)
    if race:
        return race.get("ai_description", race.get("description", ""))
    return ""

def get_race_display_info(race_id: str) -> Dict:
    """Get display information for a race."""
    race = get_race_by_id(race_id)
    if race:
        return {
            "id": race.get("id"),
            "name": race.get("name"),
            "plural": race.get("plural", race.get("name")),
            "adjective": race.get("adjective", race.get("name")),
            "description": race.get("description", ""),
        }
    return {
        "id": "unknown",
        "name": "Unknown",
        "plural": "Unknown",
        "adjective": "Unknown", 
        "description": "An unknown species."
    }

def is_race_enabled(race_id: str) -> bool:
    """Check if a race is enabled on this server."""
    enabled_races = get_enabled_races()
    return any(r.get("id", "").lower() == race_id.lower() for r in enabled_races)

def get_races_for_api() -> List[Dict]:
    """Get race data formatted for the API response."""
    races = get_enabled_races()
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "plural": r.get("plural", r.get("name")),
            "adjective": r.get("adjective", r.get("name")),
            "description": r.get("description", ""),
            "lore": r.get("lore", ""),
            "color": r.get("color", "#3B82F6"),
            "color_light": r.get("color_light", "#60A5FA"),
            "color_dark": r.get("color_dark", "#1E40AF"),
        }
        for r in races
    ]

def get_race_color(race_id: str) -> Dict[str, str]:
    """Get color information for a race."""
    race = get_race_by_id(race_id)
    if race:
        return {
            "color": race.get("color", "#3B82F6"),
            "color_light": race.get("color_light", "#60A5FA"),
            "color_dark": race.get("color_dark", "#1E40AF"),
        }
    # Default to human blue
    return {
        "color": "#3B82F6",
        "color_light": "#60A5FA",
        "color_dark": "#1E40AF",
    }
