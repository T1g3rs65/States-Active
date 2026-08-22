from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import json
import math
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional

# Import models and services
from models import (
    Nation, NationStats, Issue, IssueChoice, Decision, CreateNationRequest, 
    SubmitDecisionRequest, RankingEntry, StatsSnapshot, UpdateFlagRequest,
    GameServer, ServerRegistrationRequest, ServerHeartbeatRequest, 
    ServerInfoResponse, ServerListResponse, ServerVisibility,
    NationExportData, MigrationRequest, ImportNationRequest, Policy, Advisor,
    InternationalVote, VoteSponsor, VoteRecord, CastVoteRequest, ChainEvent, VoteType,
    AllianceRequest, Alliance, SendAllianceRequest, RespondAllianceRequest, AllianceStatus,
    War, WarEvent, DeclareWarRequest, SurrenderRequest, CasusBelli,
    FactionChatMessage, SendFactionMessageRequest
)
from quiz import calculate_starting_stats, get_quiz_questions
from stats_config import classify_government, get_government_description
from ai_service import AIService
from economy_utils import calculate_realistic_gdp, format_gdp_display
from budget_utils import normalize_budget
from advisor_utils import generate_advisors, regenerate_advisor_names
from terrain_utils import find_land_position, is_land_tile, validate_capital_site, extra_city_count, _wrap_dx, _MAP_COLS
from advisor_effects import apply_daily_ticks, publicize_advisors, reveal_trust, ROLE
from race_service import get_races_for_api, get_race_ai_description, is_race_enabled, get_race_display_info
from grok_client import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection.
# - If MONGO_URL is set, use real MongoDB (production path).
# - Otherwise fall back to an in-memory mock (mongomock-motor) for LAN/dev
#   demos where MongoDB isn't installed. Same API, no code changes below.
mongo_url = os.environ.get('MONGO_URL')
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
else:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
db = client[os.environ.get('DB_NAME', 'states')]

# Initialize AI service (routes through OpenClaw gateway)
XAI_API_KEY = os.environ.get('OPENCLAW_GATEWAY_TOKEN') or os.environ.get('XAI_API_KEY')
ai_service = AIService(XAI_API_KEY)

# Create the main app
app = FastAPI(title="SovereignHex API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Mount static files for portraits
app.mount("/portraits", StaticFiles(directory=str(ROOT_DIR / "static" / "portraits")), name="portraits")

# Mount generated portraits from frontend assets.
# Docker uses /app/frontend/...; local/LAN falls back to a writable local dir.
_generated_dir = os.environ.get("GENERATED_PORTRAITS_DIR")
if not _generated_dir:
    _docker_dir = Path("/app/frontend/assets/portraits/generated")
    _local_dir = ROOT_DIR / "static" / "generated_portraits"
    try:
        _docker_dir.mkdir(parents=True, exist_ok=True)
        _generated_dir = str(_docker_dir)
    except OSError:
        _generated_dir = str(_local_dir)
GENERATED_PORTRAITS_DIR = Path(_generated_dir)
GENERATED_PORTRAITS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/generated-portraits", StaticFiles(directory=str(GENERATED_PORTRAITS_DIR)), name="generated_portraits")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Leader Name Generation ==============
import random

# Name pools for leader generation
HUMAN_MALE_FIRST_NAMES = ["James", "William", "Alexander", "Theodore", "Charles", "Edward", "George", "Richard", "Thomas", "Benjamin", "Frederick", "Arthur", "Henry", "Robert", "Victor", "Marcus", "Sebastian", "Nicholas", "Jonathan", "Maximilian"]
HUMAN_FEMALE_FIRST_NAMES = ["Elizabeth", "Victoria", "Catherine", "Margaret", "Eleanor", "Isabella", "Charlotte", "Alexandra", "Sophia", "Helena", "Anastasia", "Caroline", "Beatrice", "Josephine", "Valentina", "Evangeline", "Genevieve", "Arabella", "Penelope", "Cordelia"]
HUMAN_LAST_NAMES = ["Windsor", "Blackwood", "Sterling", "Ashford", "Thornton", "Hartwell", "Whitmore", "Crawford", "Pemberton", "Fairfax", "Aldridge", "Beaumont", "Carrington", "Davenport", "Everett", "Fitzgerald", "Grayson", "Hamilton", "Kensington", "Lancaster"]

ZYTHERA_QUEEN_NAMES = ["Xyris", "Zylara", "Chrysalia", "Nyxara", "Aurelia", "Velyra", "Seraphyx", "Lunaris", "Crystallis", "Azuryx", "Celestrix", "Aethyra", "Prismara", "Opalyx", "Iridessa", "Luminia", "Staryx", "Nebulara", "Galaxia", "Cosmara"]

def generate_leader_name(race: str, government_type: str) -> str:
    """Generate a leader name based on race and government type."""
    if race and race.lower() == 'zythera':
        # Zythera always have Queens with elegant alien names
        return f"Queen {random.choice(ZYTHERA_QUEEN_NAMES)}"
    
    # For humans, determine if leader should be male or female (50/50)
    is_female = random.random() > 0.5
    
    # Monarchies get royal titles
    gov_lower = government_type.lower() if government_type else ''
    if 'monarchy' in gov_lower or 'empire' in gov_lower or 'father knows' in gov_lower:
        first_name = random.choice(HUMAN_FEMALE_FIRST_NAMES if is_female else HUMAN_MALE_FIRST_NAMES)
        numeral = random.choice(["", " II", " III", " IV", " V"])
        return first_name + numeral
    
    # Everyone else gets first + last name
    first_name = random.choice(HUMAN_FEMALE_FIRST_NAMES if is_female else HUMAN_MALE_FIRST_NAMES)
    last_name = random.choice(HUMAN_LAST_NAMES)
    return f"{first_name} {last_name}"

# ============== Static Pages ==============

@app.get("/portrait-preview")
async def portrait_preview():
    """Serve the portrait preview page"""
    return FileResponse(str(ROOT_DIR / "static" / "portrait_preview.html"))

# ============== Quiz Endpoints ==============

@api_router.get("/quiz/questions")
async def get_quiz():
    """Get all quiz questions."""
    return {"questions": get_quiz_questions()}

# ============== Races Endpoints ==============

@api_router.get("/races")
async def get_races():
    """Get all enabled races for this server."""
    races = get_races_for_api()
    return {
        "success": True,
        "races": races
    }

# ============== Nation Endpoints ==============

@api_router.post("/nations", response_model=dict)
async def create_nation(request: CreateNationRequest):
    """Create a new nation based on quiz results."""
    try:
        # Validate race
        race_id = request.race.lower() if request.race else "human"
        if not is_race_enabled(race_id):
            raise HTTPException(status_code=400, detail=f"Race '{race_id}' is not enabled on this server")
        
        race_info = get_race_display_info(race_id)
        
        # Calculate starting stats from quiz
        stats = calculate_starting_stats(request.quiz_result.answers)
        
        # Classify government type (race-aware for Zythera)
        gov_type = classify_government(
            stats.civil_rights,
            stats.gdp,
            stats.political_freedom,
            stats.environment,
            stats.military_strength,
            stats.scientific_advancement,
            stats.crime_rate,
            race=race_id
        )
        
        # Assign unique territory position on map (ENSURE NO OVERLAP AND ON LAND)
        # Get world seed - check if joining a specific world
        world_seed = 123456  # Default seed
        if request.world_id:
            try:
                world = await db.worlds.find_one({"_id": ObjectId(request.world_id)})
                if world:
                    world_seed = int(world.get("seed") or world.get("map_seed") or 123456)
            except Exception as e:
                logger.error(f"Error fetching world seed: {e}")
        
        # Get existing nations' positions from the same world to avoid conflicts
        world_query = {"world_id": request.world_id} if request.world_id else {}
        existing_nations = await db.nations.find(
            world_query,
            {"territory_center_col": 1, "territory_center_row": 1, "stats.population": 1}
        ).to_list(length=None)

        others = []
        existing_positions = set()
        for n in existing_nations:
            col = n.get("territory_center_col", 100)
            row = n.get("territory_center_row", 100)
            pop = (n.get("stats") or {}).get("population", 2.5)
            existing_positions.add((col, row))
            others.append((col, row, pop))

        if request.capital_col is not None and request.capital_row is not None:
            err, territory_col, territory_row = validate_capital_site(
                request.capital_col, request.capital_row, world_seed, others
            )
            if err:
                raise HTTPException(status_code=400, detail=err)
        else:
            territory_col, territory_row = find_land_position(
                existing_positions=existing_positions,
                seed=world_seed,
                min_distance=25
            )
        
        logger.info(f"Found valid LAND position ({territory_col}, {territory_row}) for new {race_info['name']} nation '{request.quiz_result.nation_name}' in world seed {world_seed}")
        
        # Normalize budget to 100%
        stats_dict = stats.dict()
        stats_dict = normalize_budget(stats_dict)
        stats = NationStats(**stats_dict)
        
        # Generate 8 advisors based on government type and race
        try:
            advisors = generate_advisors(gov_type.value, race_id)  # Pass government type and race
            logger.info(f"Generated {len(advisors)} advisors for {race_id} nation with government type: {gov_type}")
            logger.info(f"First advisor: {advisors[0].dict() if advisors else 'None'}")
        except Exception as e:
            logger.error(f"Failed to generate advisors: {e}")
            advisors = []
        
        # Create nation
        nation = Nation(
            user_id=request.user_id,
            name=request.quiz_result.nation_name,
            race=race_id,
            motto=request.quiz_result.motto,
            flag_base64=request.quiz_result.flag_base64,
            currency=request.quiz_result.currency or "Credits",
            national_animal=request.quiz_result.national_animal or "Eagle",
            government_type=gov_type,
            stats=stats,
            stats_history=[StatsSnapshot(stats=stats)],
            advisors=advisors,
            territory_center_col=territory_col,
            territory_center_row=territory_row,
            world_id=request.world_id,  # Assign to world if provided
        )
        logger.info(f"Nation object created - race: {race_id}, advisors count: {len(nation.advisors)}, world_id: {request.world_id}")
        
        # Generate initial description
        try:
            description = await ai_service.generate_nation_description(nation)
            nation.description = description
        except Exception as e:
            logger.error(f"Failed to generate description: {e}")
            nation.description = get_government_description(gov_type)
        
        # Save to database
        nation_dict = nation.dict()
        logger.info(f"Nation dict before save - advisors count: {len(nation_dict.get('advisors', []))}")
        result = await db.nations.insert_one(nation_dict)
        nation_dict["id"] = str(result.inserted_id)
        nation_dict["_id"] = str(result.inserted_id)
        logger.info(f"Nation saved with ID: {result.inserted_id}")
        
        # Update world's nation count if nation is in a world
        if request.world_id:
            await db.worlds.update_one(
                {"_id": ObjectId(request.world_id)},
                {
                    "$inc": {"nation_count": 1},
                    "$set": {"last_activity": datetime.utcnow()}
                }
            )
        
        return {"success": True, "nation": nation_dict}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}")
async def get_nation(nation_id: str):
    """Get nation by ID."""
    from bson import ObjectId
    try:
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")

        if apply_daily_ticks(nation):
            await db.nations.update_one(
                {"_id": nation["_id"]},
                {"$set": {
                    "stats": nation.get("stats"),
                    "advisors": nation.get("advisors"),
                    "last_advisor_tick": nation.get("last_advisor_tick"),
                }},
            )
        
        nation["id"] = str(nation["_id"])
        nation["_id"] = str(nation["_id"])  # Convert ObjectId to string for JSON serialization
        nation["advisors"] = publicize_advisors(nation.get("advisors") or [])
        
        # Always recalculate government type based on current stats
        # This ensures government type stays in sync as stats change from decisions
        race = nation.get("race", "human")
        current_gov = nation.get("government_type", "")
        stats = nation.get("stats", {})
        
        new_gov_type = classify_government(
            stats.get("civil_rights", 50),
            stats.get("gdp", 50),
            stats.get("political_freedom", 50),
            stats.get("environment", 50),
            stats.get("military_strength", 50),
            stats.get("scientific_advancement", 50),
            stats.get("crime_rate", 5),
            race=race
        )
        
        # Update if government type changed
        if current_gov != new_gov_type.value:
            nation["government_type"] = new_gov_type.value
            # Save the new government type to database
            await db.nations.update_one(
                {"_id": ObjectId(nation_id)},
                {"$set": {"government_type": new_gov_type.value}}
            )
            logger.info(f"Government type updated for nation {nation_id}: '{current_gov}' -> '{new_gov_type.value}'")
        
        # Generate leader name if it doesn't exist
        if not nation.get("leader_name"):
            leader_name = generate_leader_name(nation.get("race"), nation.get("government_type", ""))
            nation["leader_name"] = leader_name
            # Save it to the database
            await db.nations.update_one(
                {"_id": ObjectId(nation_id)},
                {"$set": {"leader_name": leader_name}}
            )
        
        # Calculate realistic GDP values
        population = nation["stats"]["population"]
        gdp_stat = nation["stats"]["gdp"]
        currency = nation.get("currency", "Dollar")
        
        gdp_value = calculate_realistic_gdp(population, gdp_stat)
        nation["gdp_value"] = gdp_value
        nation["gdp_display"] = format_gdp_display(gdp_value, currency)
        
        return {"success": True, "nation": nation}
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is (like 404)
    except Exception as e:
        logger.error(f"Error fetching nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/user/{user_id}")
async def get_user_nation(user_id: str):
    """Get nation by user ID."""
    try:
        nation = await db.nations.find_one({"user_id": user_id})
        if not nation:
            return {"success": True, "nation": None}

        if apply_daily_ticks(nation):
            await db.nations.update_one(
                {"_id": nation["_id"]},
                {"$set": {
                    "stats": nation.get("stats"),
                    "advisors": nation.get("advisors"),
                    "last_advisor_tick": nation.get("last_advisor_tick"),
                }},
            )
        
        nation["id"] = str(nation["_id"])
        nation["_id"] = str(nation["_id"])  # Convert ObjectId to string for JSON serialization
        nation["advisors"] = publicize_advisors(nation.get("advisors") or [])
        
        # Calculate realistic GDP values
        population = nation["stats"]["population"]
        gdp_stat = nation["stats"]["gdp"]
        currency = nation.get("currency", "Dollar")
        
        gdp_value = calculate_realistic_gdp(population, gdp_stat)
        nation["gdp_value"] = gdp_value
        nation["gdp_display"] = format_gdp_display(gdp_value, currency)
        
        return {"success": True, "nation": nation}
    except Exception as e:
        logger.error(f"Error fetching user nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/nations/{nation_id}/description")
async def regenerate_description(nation_id: str):
    """Regenerate nation description based on current stats. Descriptions update weekly on a staggered schedule."""
    from bson import ObjectId
    
    REFRESH_INTERVAL_DAYS = 7  # Descriptions refresh once per week
    TOTAL_NATION_SLOTS = 100   # Spread nations across the week
    
    try:
        nation_data = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation_data:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        now = datetime.utcnow()
        
        # Calculate this nation's refresh slot based on nation_id hash
        # This distributes nations evenly across the week
        nation_id_hash = hash(nation_id) % TOTAL_NATION_SLOTS
        hours_per_slot = (REFRESH_INTERVAL_DAYS * 24) / TOTAL_NATION_SLOTS  # ~1.68 hours per slot
        slot_offset_hours = nation_id_hash * hours_per_slot
        
        # Check if we should regenerate based on last update
        last_description_update = nation_data.get("last_description_update")
        should_regenerate = False
        
        if last_description_update:
            # Regenerate if 7+ days have passed since last update
            time_since_update = (now - last_description_update).total_seconds()
            if time_since_update >= (REFRESH_INTERVAL_DAYS * 24 * 3600):
                should_regenerate = True
        else:
            # Never generated before, do it now
            should_regenerate = True
        
        description = nation_data.get("description", "")
        
        if should_regenerate:
            # Convert _id to id string before creating Nation object
            nation_data["id"] = str(nation_data["_id"])
            nation = Nation(**nation_data)
            description = await ai_service.generate_nation_description(nation)
            
            await db.nations.update_one(
                {"_id": ObjectId(nation_id)},
                {"$set": {
                    "description": description,
                    "last_description_update": now
                }}
            )
            last_description_update = now
        
        # Calculate timer display - time until next refresh
        if last_description_update:
            next_refresh_time = last_description_update + timedelta(days=REFRESH_INTERVAL_DAYS)
            seconds_remaining = (next_refresh_time - now).total_seconds()
        else:
            # Fallback - 7 days from now
            seconds_remaining = REFRESH_INTERVAL_DAYS * 24 * 3600
        
        # Cap at 7 days maximum
        max_seconds = REFRESH_INTERVAL_DAYS * 24 * 3600
        if seconds_remaining > max_seconds:
            seconds_remaining = max_seconds
        
        if seconds_remaining <= 0:
            timer_display = "Refreshing..."
        else:
            days = int(seconds_remaining // (24 * 3600))
            hours = int((seconds_remaining % (24 * 3600)) // 3600)
            
            if days > 0:
                timer_display = f"{days}d {hours}h"
            else:
                minutes = int((seconds_remaining % 3600) // 60)
                timer_display = f"{hours}h {minutes}m"
        
        return {
            "success": True, 
            "description": description,
            "timer_display": timer_display,
            "just_refreshed": should_regenerate
        }
    except Exception as e:
        logger.error(f"Error regenerating description: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/nations/{nation_id}/flag")
async def update_flag(nation_id: str, request: dict):
    """Update nation's flag."""
    from bson import ObjectId
    try:
        await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {"$set": {"flag_base64": request.get("flag_base64")}}
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating flag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/nations/{nation_id}")
async def delete_nation(nation_id: str):
    """Permanently delete a nation and all its associated data."""
    from bson import ObjectId
    try:
        # Delete the nation
        result = await db.nations.delete_one({"_id": ObjectId(nation_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Delete all issues associated with this nation
        await db.issues.delete_many({"nation_id": nation_id})
        
        logger.info(f"Nation {nation_id} permanently deleted")
        
        return {"success": True, "message": "Nation permanently deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/nations/{nation_id}/customization")
async def update_customization(nation_id: str, request: dict):
    """Update nation's customization (currency, national animal)."""
    from bson import ObjectId
    try:
        update_fields = {}
        if "currency" in request:
            update_fields["currency"] = request["currency"]
        if "national_animal" in request:
            update_fields["national_animal"] = request["national_animal"]
        
        if update_fields:
            await db.nations.update_one(
                {"_id": ObjectId(nation_id)},
                {"$set": update_fields}
            )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating customization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/territory-stats")
async def get_territory_stats(nation_id: str):
    """Get territory statistics for a nation (placeholder for frontend calculation)."""
    # This is just a placeholder - frontend will calculate from map data
    return {
        "success": True,
        "message": "Calculate territory stats on frontend from world map"
    }

@api_router.post("/nations/{nation_id}/timezone-geo")
async def set_timezone_geo(nation_id: str, body: dict):
    from bson import ObjectId
    raw_bands = body.get("bands") or []
    bands = [int(b) % 24 for b in raw_bands]
    geo_max = max(1, min(24, int(body.get("geo_max") or 1)))
    await db.nations.update_one(
        {"_id": ObjectId(nation_id)},
        {"$set": {"timezone_geo_max": geo_max, "timezone_bands": bands}}
    )
    return {"success": True, "geo_max": geo_max, "bands": bands}

@api_router.post("/nations/{nation_id}/cities")
async def add_city(nation_id: str, body: dict):
    from bson import ObjectId
    nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
    if not nation:
        raise HTTPException(status_code=404, detail="Nation not found")
    col = int(body.get("col") or -1)
    row = int(body.get("row") or -1)
    if col < 0 or row < 0:
        raise HTTPException(status_code=400, detail="Need a map tile.")
    world_seed = 123456
    try:
        wid = nation.get("world_id")
        if wid:
            world = await db.worlds.find_one({"_id": ObjectId(wid)})
            if world and world.get("map_seed") is not None:
                world_seed = int(world["map_seed"])
    except Exception:
        pass
    if not is_land_tile(col, row, world_seed):
        raise HTTPException(status_code=400, detail="Cities must sit on land.")
    cap_col = int(nation.get("territory_center_col") or 0)
    cap_row = int(nation.get("territory_center_row") or 0)
    if math.hypot(_wrap_dx(col, cap_col), row - cap_row) < 8:
        raise HTTPException(status_code=400, detail="Too close to the capital.")
    cities = list(nation.get("cities") or [])
    pop = (nation.get("stats") or {}).get("population") or 0
    max_n = extra_city_count(pop)
    replace = bool(body.get("replace"))
    if replace:
        cities = []
    if len(cities) >= max_n:
        raise HTTPException(status_code=400, detail="No city slots left. Grow first.")
    for c in cities:
        if math.hypot(_wrap_dx(col, int(c.get("col", 0))), row - int(c.get("row", 0))) < 12:
            raise HTTPException(status_code=400, detail="Too close to another city.")
    cities.append({"col": int(col) % _MAP_COLS, "row": int(row)})
    await db.nations.update_one({"_id": ObjectId(nation_id)}, {"$set": {"cities": cities}})
    return {"success": True, "cities": cities, "slots": max_n}

@api_router.put("/nations/{nation_id}/cities")
async def set_cities(nation_id: str, body: dict):
    """NPC / seed helper. Clamps to slot cap."""
    from bson import ObjectId
    nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
    if not nation:
        raise HTTPException(status_code=404, detail="Nation not found")
    pop = (nation.get("stats") or {}).get("population") or 0
    max_n = extra_city_count(pop)
    raw = body.get("cities") or []
    cities = [{"col": int(c["col"]) % _MAP_COLS, "row": int(c["row"])} for c in raw][:max_n]
    await db.nations.update_one({"_id": ObjectId(nation_id)}, {"$set": {"cities": cities}})
    return {"success": True, "cities": cities, "slots": max_n}

# ============== Issues Endpoints ==============

@api_router.get("/nations/{nation_id}/issues")
async def get_daily_issues(nation_id: str, force_generate: bool = False):
    """Get or generate issues for a nation. Issues accumulate - 1 every 8 hours, max 3 pending."""
    from bson import ObjectId
    
    ISSUE_INTERVAL_HOURS = 8  # One issue every 8 hours = 3 per day
    MAX_PENDING_ISSUES = 3    # Cap on pending issues
    
    try:
        # Get nation
        nation_data = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation_data:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Convert _id to id string before creating Nation object
        nation_data["id"] = str(nation_data["_id"])
        nation = Nation(**nation_data)
        
        # Get current unresolved issues
        issues_cursor = db.issues.find({
            "nation_id": nation_id,
            "resolved": False
        })
        current_issues = await issues_cursor.to_list(length=10)
        
        # Format existing issues
        for issue in current_issues:
            issue["id"] = str(issue["_id"])
            issue["_id"] = str(issue["_id"])

        geo_max = int(nation_data.get("timezone_geo_max") or 1)
        already_chose = nation_data.get("timezone_count") is not None
        if already_chose:
            leftover = [i for i in current_issues if i.get("kind") == "timezone"]
            for i in leftover:
                await db.issues.update_one(
                    {"_id": ObjectId(i["id"])},
                    {"$set": {"resolved": True, "resolved_at": datetime.utcnow()}},
                )
            current_issues = [i for i in current_issues if i.get("kind") != "timezone"]
        has_tz = any(i.get("kind") == "timezone" for i in current_issues)
        if geo_max >= 2 and not has_tz and not already_chose:
            from timezone_issue import build_timezone_issue
            tz_issue = build_timezone_issue(
                nation_id,
                nation_data.get("name", "Your nation"),
                geo_max,
                nation_data.get("timezone_count"),
            )
            tz_doc = tz_issue.dict()
            tz_ins = await db.issues.insert_one(tz_doc)
            tz_doc["id"] = str(tz_ins.inserted_id)
            tz_doc["_id"] = str(tz_ins.inserted_id)
            current_issues.append(tz_doc)

        
        now = datetime.utcnow()
        generated_now = False
        
        # Calculate how many issues should be generated
        current_count = len(current_issues)
        available_slots = MAX_PENDING_ISSUES - current_count
        
        if available_slots > 0:
            last_issue_time = nation_data.get("last_issue_generated_at")
            
            issues_to_generate = 0
            
            if last_issue_time:
                hours_since_last = (now - last_issue_time).total_seconds() / 3600
                # Calculate how many 8-hour periods have passed
                periods_passed = int(hours_since_last / ISSUE_INTERVAL_HOURS)
                if periods_passed > 0:
                    # Generate up to the number of periods passed, but cap at available slots
                    issues_to_generate = min(periods_passed, available_slots)
            else:
                # No timestamp - this is a new nation, generate 1 issue to start
                issues_to_generate = 1
            
            if issues_to_generate > 0:
                logger.info(f"Generating {issues_to_generate} issues for nation {nation_id} (available slots: {available_slots})")
                
                # Generate issues
                new_issues = await ai_service.generate_issues(nation, count=issues_to_generate)
                
                for issue in new_issues:
                    issue_dict = issue.dict()
                    result = await db.issues.insert_one(issue_dict)
                    issue.id = str(result.inserted_id)
                    issue_dict["id"] = str(result.inserted_id)
                    issue_dict["_id"] = str(result.inserted_id)
                    current_issues.append(issue_dict)
                
                # Update timestamp to now
                await db.nations.update_one(
                    {"_id": ObjectId(nation_id)},
                    {"$set": {"last_issue_generated_at": now}}
                )
                generated_now = True
        
        # Calculate timer display for frontend
        at_cap = len(current_issues) >= MAX_PENDING_ISSUES
        
        if at_cap:
            timer_display = "Resolve an issue first"
            seconds_remaining = None
        elif generated_now:
            # Just generated, next in 8 hours
            seconds_remaining = ISSUE_INTERVAL_HOURS * 3600
            hours = int(seconds_remaining // 3600)
            minutes = int((seconds_remaining % 3600) // 60)
            timer_display = f"{hours}h {minutes}m"
        else:
            last_gen = nation_data.get("last_issue_generated_at")
            if last_gen:
                next_issue_at = last_gen + timedelta(hours=ISSUE_INTERVAL_HOURS)
                seconds_remaining = (next_issue_at - now).total_seconds()
                
                # Cap at 8 hours max
                max_seconds = ISSUE_INTERVAL_HOURS * 3600
                if seconds_remaining > max_seconds:
                    seconds_remaining = max_seconds
                
                if seconds_remaining <= 0:
                    timer_display = "Available now!"
                    seconds_remaining = 0
                else:
                    hours = int(seconds_remaining // 3600)
                    minutes = int((seconds_remaining % 3600) // 60)
                    if hours > 0:
                        timer_display = f"{hours}h {minutes}m"
                    else:
                        seconds = int(seconds_remaining % 60)
                        timer_display = f"{minutes}m {seconds}s"
            else:
                # No last time, next is 8 hours
                seconds_remaining = ISSUE_INTERVAL_HOURS * 3600
                timer_display = f"{ISSUE_INTERVAL_HOURS}h 0m"
        
        return {
            "success": True, 
            "issues": current_issues,
            "timer_display": timer_display,
            "seconds_remaining": seconds_remaining,
            "at_cap": at_cap,
            "max_issues": MAX_PENDING_ISSUES
        }
    
    except Exception as e:
        logger.error(f"Error getting issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/nations/{nation_id}/decisions")
async def submit_decision(request: SubmitDecisionRequest):
    """Submit a decision for an issue and apply stat changes."""
    from bson import ObjectId
    from policy_service import detect_policy
    from models import Policy, DecisionFeedItem
    
    try:
        # Get issue
        issue_data = await db.issues.find_one({"_id": ObjectId(request.issue_id)})
        if not issue_data:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        issue = Issue(**issue_data)
        
        if issue.resolved:
            raise HTTPException(status_code=400, detail="Issue already resolved")
        
        if request.choice_index >= len(issue.choices):
            raise HTTPException(status_code=400, detail="Invalid choice index")
        
        # Get nation
        nation_data = await db.nations.find_one({"_id": ObjectId(request.nation_id)})
        if not nation_data:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Apply stat changes
        choice = issue.choices[request.choice_index]
        current_stats = nation_data["stats"]
        tz_count = choice.effects.get("timezone_count")
        for stat_name, change in choice.effects.items():
            if stat_name == "timezone_count":
                continue
            if stat_name in current_stats:
                current_stats[stat_name] = max(0, min(100, current_stats[stat_name] + change))
        
        # Normalize budget to ensure it sums to 100%
        current_stats = normalize_budget(current_stats)
        
        # Recalculate government type based on new stats (race-aware for Zythera)
        new_gov_type = classify_government(
            current_stats.get("civil_rights", 50),
            current_stats.get("gdp", 50),
            current_stats.get("political_freedom", 50),
            current_stats.get("environment", 50),
            current_stats.get("military_strength", 50),
            current_stats.get("scientific_advancement", 50),
            current_stats.get("crime_rate", 5),
            race=nation_data.get("race", "human")
        )
        
        # Save stats snapshot
        snapshot = {
            "timestamp": datetime.utcnow(),
            "stats": current_stats
        }
        
        # Check if this decision creates a policy
        policy_created = None
        law_description = None
        is_timezone = (getattr(issue, "kind", None) == "timezone") or "clockwork of the realm" in (issue.title or "").lower()
        category = None if is_timezone else detect_policy(issue.title, choice.text, choice.effects)
        
        if category:
            logger.info(f"Policy detected for category: {category}")
            
            # Generate AI law name and description with FULL context
            try:
                from image_service import generate_policy_law
                law_name, law_description = await generate_policy_law(
                    category=category,
                    nation_name=nation_data["name"],
                    issue_title=issue.title,
                    issue_description=issue.description,
                    choice_text=choice.text,
                    stat_effects=choice.effects
                )
            except Exception as e:
                logger.error(f"Error generating law: {e}")
                law_name = f"{category.replace('_', ' ').title()} Act"
                law_description = f"{nation_data['name']} has enacted a new policy affecting {category.replace('_', ' ')}."
            
            # Create policy with AI-generated name and description
            policy = Policy(
                name=law_name,
                category=category,
                short_description=law_description[:100],  # Short version for list
                news_snippet=law_description,
                issue_id=request.issue_id
            )
            
            # Add policy to nation
            await db.nations.update_one(
                {"_id": ObjectId(request.nation_id)},
                {"$push": {"policies": policy.dict()}}
            )
            
            policy_created = law_name
            logger.info(f"Policy created: {law_name}")
        
        # Update nation with new stats AND government type
        nation_set = {
            "stats": current_stats,
            "government_type": new_gov_type.value
        }
        if tz_count is not None:
            geo_max = int(nation_data.get("timezone_geo_max") or 1)
            nation_set["timezone_count"] = max(1, min(geo_max, int(tz_count)))
        await db.nations.update_one(
            {"_id": ObjectId(request.nation_id)},
            {
                "$set": nation_set,
                "$push": {"stats_history": snapshot},
                "$inc": {"total_decisions": 1}
            }
        )
        
        # Mark issue as resolved
        await db.issues.update_one(
            {"_id": ObjectId(request.issue_id)},
            {
                "$set": {
                    "resolved": True,
                    "resolved_at": datetime.utcnow(),
                    "chosen_index": request.choice_index
                }
            }
        )
        
        # Create decision record
        decision = Decision(
            nation_id=request.nation_id,
            issue_id=request.issue_id,
            choice_index=request.choice_index,
            stat_changes=choice.effects
        )
        
        await db.decisions.insert_one(decision.dict())
        
        # Add to global decision feed (only significant changes)
        significant_changes = {} if is_timezone else {k: v for k, v in choice.effects.items() if abs(v) >= 5 and k != "timezone_count"}
        if (significant_changes or policy_created) and not is_timezone:
            # Random chance for ANY decision to become international news (12% chance)
            # This makes the game more unpredictable - any decision could become a world event!
            import random
            is_international = random.random() < 0.12  # 12% chance
            
            feed_item = DecisionFeedItem(
                nation_id=request.nation_id,
                nation_name=nation_data["name"],
                race=nation_data.get("race", "human"),
                government_type=nation_data["government_type"],
                issue_title=issue.title,
                choice_text=choice.text,
                policy_created=policy_created,
                policy_description=law_description if policy_created else None,
                stat_changes=significant_changes,
                world_id=nation_data.get("world_id"),  # Include world_id for filtering
                civil_rights=current_stats.get("civil_rights", 50),
                gdp=current_stats.get("gdp", 50),
                political_freedom=current_stats.get("political_freedom", 50),
                is_international=is_international
            )
            feed_result = await db.decision_feed.insert_one(feed_item.dict())
            
            # If this decision was selected for international attention, create a vote!
            international_vote_id = None
            if is_international:
                decision_summary = f"{nation_data['name']} decided: {choice.text[:100]}..." if len(choice.text) > 100 else f"{nation_data['name']} decided: {choice.text}"
                
                now = datetime.utcnow()
                vote_data = {
                    "decision_id": str(feed_result.inserted_id),
                    "decision_summary": decision_summary,
                    "source_nation_id": request.nation_id,
                    "source_nation_name": nation_data["name"],
                    "source_nation_flag": nation_data.get("flag_base64"),
                    "issue_title": issue.title,
                    "choice_text": choice.text,
                    "praise_sponsor": None,
                    "condemn_sponsor": None,
                    "praise_count": 0,
                    "condemn_count": 0,
                    "neutral_count": 0,
                    "votes": [],
                    "created_at": now,
                    "ends_at": now + timedelta(hours=24),
                    "is_active": True,
                    "outcome": None,
                    "outcome_processed": False,
                    "world_id": nation_data.get("world_id")  # World-specific voting
                }
                
                vote_result = await db.international_votes.insert_one(vote_data)
                international_vote_id = str(vote_result.inserted_id)
                logger.info(f"International vote created for decision by {nation_data['name']}: {issue.title}")
                
                # Chain events - 8% chance for decisions with major stat impacts to affect other nations
                # This creates ripple effects where your big decisions can create issues for neighbors
                max_change = max(abs(v) for v in choice.effects.values()) if choice.effects else 0
                if max_change >= 8 and random.random() < 0.08:  # Only for impactful decisions
                    other_nations = await db.nations.find(
                        {"_id": {"$ne": ObjectId(request.nation_id)}}
                    ).limit(3).to_list(length=3)
                    
                    if other_nations:
                        affected_ids = [str(n["_id"]) for n in other_nations]
                        
                        # Generate a chain effect description based on the decision
                        chain_descriptions = [
                            f"A neighboring nation's policy shift affects your economy",
                            f"International ripple effects from {nation_data['name']}'s decision",
                            f"Regional instability following {nation_data['name']}'s choices",
                            f"Your trade partners react to {nation_data['name']}'s new direction",
                            f"Diplomatic tensions arise from {nation_data['name']}'s recent decision"
                        ]
                        
                        chain_effect = random.choice(chain_descriptions)
                        
                        await db.chain_events.insert_one({
                            "source_decision_id": str(feed_result.inserted_id),
                            "source_nation_id": request.nation_id,
                            "source_nation_name": nation_data["name"],
                            "trigger_action": choice.text[:100],
                            "affected_nation_ids": affected_ids,
                            "issue_template": chain_effect,
                            "issue_context": f"{nation_data['name']} made a significant decision that affects your nation. Original decision: {choice.text}",
                            "created_at": datetime.utcnow(),
                            "processed": False
                        })
                        
                        # Create pending issues for affected nations
                        for affected_nation_id in affected_ids:
                            await db.pending_chain_issues.insert_one({
                                "nation_id": affected_nation_id,
                                "source_nation_name": nation_data["name"],
                                "trigger_action": choice.text[:100],
                                "issue_template": chain_effect,
                                "issue_context": f"{nation_data['name']} made a decision that affects your nation: {choice.text[:150]}. How does your nation respond?",
                                "created_at": datetime.utcnow(),
                                "processed": False
                            })
                        
                        logger.info(f"Chain event triggered by {nation_data['name']}, affecting {len(affected_ids)} nations")
        
        # Check faction ideology compliance after decision
        from alliance_service import AllianceService
        alliance_service = AllianceService(db)
        
        compliance_check = await alliance_service.check_and_enforce_ideology_compliance(
            nation_id=request.nation_id,
            nation_stats=current_stats,
            nation_race=nation_data.get("race", "human")
        )
        
        is_compliant, warning_msg, grace_info = compliance_check
        
        # Check for vassal auto-promotion (if in faction)
        vassal_promoted = False
        try:
            nation_alliance = await alliance_service.get_nation_alliance(request.nation_id)
            if nation_alliance:
                # Check all vassals for promotion
                for vassal in nation_alliance.get("vassals", []):
                    if vassal["nation_id"] == request.nation_id:
                        # This nation is a vassal, check for promotion
                        promoted = await alliance_service.try_promote_vassal(
                            str(nation_alliance["_id"]), 
                            vassal
                        )
                        if promoted:
                            vassal_promoted = True
                            logger.info(f"Auto-promoted vassal {nation_data['name']} to member")
                        break
        except Exception as e:
            logger.error(f"Error checking vassal promotion: {e}")
        
        return {
            "success": True,
            "stat_changes": choice.effects,
            "new_stats": current_stats,
            "policy_created": policy_created,
            "international_vote_id": international_vote_id if 'international_vote_id' in dir() else None,
            "is_international": is_international if 'is_international' in dir() else False,
            "faction_warning": warning_msg,  # Null if compliant or not in faction
            "grace_period_info": grace_info,  # Info about grace period status
            "vassal_promoted": vassal_promoted  # True if promoted to full member
        }
    
    except Exception as e:
        logger.error(f"Error submitting decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Rankings Endpoints ==============

@api_router.get("/rankings/{stat_name}")
async def get_rankings(stat_name: str, limit: int = 100, world_id: str = None):
    """Get top nations for a specific stat, filtered by world."""
    try:
        # Build sort query
        sort_field = f"stats.{stat_name}"
        sort_direction = -1  # Descending by default
        
        # Filter by world_id if provided
        query = {}
        if world_id:
            query["world_id"] = world_id
        
        # Get all nations sorted by stat
        nations_cursor = db.nations.find(query).sort(sort_field, sort_direction).limit(limit)
        nations = await nations_cursor.to_list(length=limit)
        
        # Get all faction memberships for these nations
        nation_ids = [str(n["_id"]) for n in nations]
        faction_memberships = {}
        
        # Query factions to find memberships
        factions_cursor = db.multi_alliances.find({"is_active": True})
        factions = await factions_cursor.to_list(length=None)
        for faction in factions:
            for member in faction.get("members", []):
                if member.get("nation_id") in nation_ids:
                    faction_memberships[member["nation_id"]] = {
                        "faction_id": str(faction["_id"]),
                        "faction_tag": faction.get("tag"),
                        "faction_name": faction.get("name"),
                        "faction_color": faction.get("color", "#8B5CF6")
                    }
        
        # Build ranking entries
        rankings = []
        for rank, nation in enumerate(nations, 1):
            stat_value = nation["stats"][stat_name]
            nation_id = str(nation["_id"])
            
            # For GDP, calculate realistic value
            if stat_name == "gdp":
                population = nation["stats"]["population"]
                gdp_stat = nation["stats"]["gdp"]
                currency = nation.get("currency", "Dollar")
                stat_value = calculate_realistic_gdp(population, gdp_stat)
                # Store as display string for frontend
                stat_value_display = format_gdp_display(stat_value, currency)
            else:
                stat_value_display = None
            
            # Get faction info if member
            faction_info = faction_memberships.get(nation_id, {})
            
            rankings.append({
                "nation_id": nation_id,
                "nation_name": nation["name"],
                "race": nation.get("race", "human"),
                "flag_base64": nation.get("flag_base64"),
                "government_type": nation["government_type"],
                "stat_value": stat_value,
                "stat_value_display": stat_value_display,
                "rank": rank,
                # Faction membership
                "faction_id": faction_info.get("faction_id"),
                "faction_tag": faction_info.get("faction_tag"),
                "faction_name": faction_info.get("faction_name"),
                "faction_color": faction_info.get("faction_color"),
                # Include stats needed for political theme calculation (deprecated - using race colors now)
                "civil_rights": nation["stats"]["civil_rights"],
                "gdp": nation["stats"]["gdp"],
                "political_freedom": nation["stats"]["political_freedom"]
            })
        
        return {"success": True, "rankings": rankings, "stat_name": stat_name}
    
    except Exception as e:
        logger.error(f"Error fetching rankings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/rankings/extremes/{category}")
async def get_extreme_rankings(category: str, world_id: str = None):
    """Get 'most extreme' nations for various categories, filtered by world."""
    try:
        # Define extreme categories
        extreme_queries = {
            "highest_taxes": ("stats.tax_rate", -1),
            "lowest_crime": ("stats.crime_rate", 1),
            "happiest": ("stats.happiness", -1),
            "most_free": ("stats.civil_rights", -1),
            "most_oppressive": ("stats.civil_rights", 1),
            "richest": ("stats.gdp", -1),
            "poorest": ("stats.gdp", 1),
            "greenest": ("stats.environment", -1),
            "most_militarized": ("stats.military_strength", -1),
        }
        
        if category not in extreme_queries:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        field, direction = extreme_queries[category]
        
        # Filter by world_id if provided
        query = {}
        if world_id:
            query["world_id"] = world_id
        
        nations_cursor = db.nations.find(query).sort(field, direction).limit(50)
        nations = await nations_cursor.to_list(length=50)
        
        rankings = []
        for rank, nation in enumerate(nations, 1):
            stat_name = field.split(".")[1]
            stat_value = nation["stats"][stat_name]
            
            # For GDP extreme rankings (richest/poorest), calculate realistic value
            if stat_name == "gdp":
                population = nation["stats"]["population"]
                gdp_stat = nation["stats"]["gdp"]
                currency = nation.get("currency", "Dollar")
                stat_value = calculate_realistic_gdp(population, gdp_stat)
                stat_value_display = format_gdp_display(stat_value, currency)
            else:
                stat_value_display = None
            
            rankings.append({
                "nation_id": str(nation["_id"]),
                "nation_name": nation["name"],
                "race": nation.get("race", "human"),
                "flag_base64": nation.get("flag_base64"),
                "government_type": nation["government_type"],
                "stat_value": stat_value,
                "stat_value_display": stat_value_display,
                "rank": rank,
                # Include stats needed for political theme calculation (deprecated - using race colors now)
                "civil_rights": nation["stats"]["civil_rights"],
                "gdp": nation["stats"]["gdp"],
                "political_freedom": nation["stats"]["political_freedom"]
            })
        
        return {"success": True, "rankings": rankings, "category": category}
    
    except Exception as e:
        logger.error(f"Error fetching extreme rankings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Stats History Endpoint ==============

@api_router.get("/nations/{nation_id}/history/{stat_name}")
async def get_stat_history(nation_id: str, stat_name: str, days: int = 90):
    """Get historical data for a specific stat."""
    from bson import ObjectId
    try:
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Get stats history
        history = nation.get("stats_history", [])
        
        # Filter by days if needed
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        filtered_history = []
        
        for h in history:
            if h["timestamp"] >= cutoff_date:
                value = h["stats"].get(stat_name, 0)
                
                # For GDP, calculate realistic value
                if stat_name == "gdp":
                    population = h["stats"].get("population", 2.5)
                    gdp_stat = h["stats"].get("gdp", 20)
                    value = calculate_realistic_gdp(population, gdp_stat)
                
                filtered_history.append({
                    "timestamp": h["timestamp"],
                    "value": value
                })
        
        return {
            "success": True,
            "stat_name": stat_name,
            "history": filtered_history
        }
    
    except Exception as e:
        logger.error(f"Error fetching stat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Test Endpoint ==============

@api_router.get("/")
async def root():
    return {"message": "SovereignHex API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@api_router.get("/test")
async def test():
    return {"message": "API is working!"}

@api_router.post("/admin/normalize-all-budgets")
async def normalize_all_budgets():
    """Admin endpoint to normalize budgets for all existing nations."""
    try:
        nations = await db.nations.find({}).to_list(length=None)
        updated_count = 0
        
        for nation in nations:
            stats = nation.get("stats", {})
            normalized_stats = normalize_budget(stats)
            
            await db.nations.update_one(
                {"_id": nation["_id"]},
                {"$set": {"stats": normalized_stats}}
            )
            updated_count += 1
        
        return {
            "success": True,
            "message": f"Normalized budgets for {updated_count} nations"
        }
    except Exception as e:
        logger.error(f"Error normalizing budgets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/generate-advisors")
async def generate_advisors_for_existing():
    """Admin endpoint to generate advisors for all existing nations that don't have them."""
    try:
        nations = await db.nations.find({}).to_list(length=None)
        updated_count = 0
        
        for nation in nations:
            # Check if nation already has advisors
            if not nation.get("advisors") or len(nation.get("advisors", [])) == 0:
                # Generate advisors based on government type and race
                race = nation.get("race", "human")
                advisors = generate_advisors(nation.get("government_type", "Democracy"), race)
                
                # Convert advisors to dict format for MongoDB
                advisors_dict = [advisor.dict() for advisor in advisors]
                
                await db.nations.update_one(
                    {"_id": nation["_id"]},
                    {"$set": {"advisors": advisors_dict}}
                )
                updated_count += 1
        
        return {
            "success": True,
            "message": f"Generated advisors for {updated_count} nations"
        }
    except Exception as e:
        logger.error(f"Error generating advisors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/reset-advisor-names")
async def reset_advisor_names():
    """Admin endpoint to reset all advisor names based on nation race."""
    try:
        nations = await db.nations.find({}).to_list(length=None)
        updated_count = 0
        details = []
        
        for nation in nations:
            advisors = nation.get("advisors", [])
            if advisors:
                race = nation.get("race", "human")
                
                # Use the regenerate function to update names while preserving other data
                updated_advisors = regenerate_advisor_names(advisors, race)
                
                await db.nations.update_one(
                    {"_id": nation["_id"]},
                    {"$set": {"advisors": updated_advisors}}
                )
                updated_count += 1
                details.append({
                    "nation": nation.get("name"),
                    "race": race,
                    "advisors_updated": len(updated_advisors)
                })
        
        return {
            "success": True,
            "message": f"Reset advisor names for {updated_count} nations based on their race",
            "details": details
        }
    except Exception as e:
        logger.error(f"Error resetting advisor names: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/reset-advisor-limits")
async def reset_advisor_limits():
    """Admin endpoint to reset all advisor daily task limits."""
    try:
        nations = await db.nations.find({}).to_list(length=None)
        updated_count = 0
        
        for nation in nations:
            advisors = nation.get("advisors", [])
            if advisors:
                # Reset last_task_sent for all advisors
                for advisor in advisors:
                    advisor["last_task_sent"] = None
                
                await db.nations.update_one(
                    {"_id": nation["_id"]},
                    {"$set": {"advisors": advisors}}
                )
                updated_count += 1
        
        return {
            "success": True,
            "message": f"Reset advisor limits for {updated_count} nations"
        }
    except Exception as e:
        logger.error(f"Error resetting advisor limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/nations/{nation_id}/advisor-task")
async def send_advisor_task(nation_id: str, request: dict):
    """Send a task to an advisor and generate an AI issue based on it."""
    from bson import ObjectId
    from datetime import datetime
    
    try:
        advisor_slot = request.get("advisor_slot")
        task_description = request.get("task_description")
        
        if not advisor_slot or not task_description:
            raise HTTPException(status_code=400, detail="Missing advisor_slot or task_description")
        
        # Get nation
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Find the advisor
        advisors = nation.get("advisors", [])
        advisor = None
        advisor_index = None
        for idx, adv in enumerate(advisors):
            if adv.get("slot") == advisor_slot:
                advisor = adv
                advisor_index = idx
                break
        
        if not advisor:
            raise HTTPException(status_code=404, detail="Advisor not found")
        
        # Check daily limit - only one task per day
        now = datetime.utcnow()
        today = now.date()
        for adv in advisors:
            if adv.get("last_task_sent"):
                last_task_date = adv["last_task_sent"].date() if isinstance(adv["last_task_sent"], datetime) else datetime.fromisoformat(str(adv["last_task_sent"])).date()
                if last_task_date == today:
                    raise HTTPException(status_code=400, detail="Daily task limit reached")
        
        # Update advisor's last_task_sent
        advisors[advisor_index]["last_task_sent"] = now
        
        # Generate AI issue based on task
        # Use the existing ai_service instance instead of creating a new one
        
        # Generate AI issue based on the advisor task
        # Build detailed prompt for AI
        prompt = f"""Generate a political issue for {nation['name']} based on this advisor task:

**TASK GIVEN TO ADVISOR:**
"{task_description}"

**ADVISOR DETAILS:**
- Role: {advisor['title']} (slot {advisor.get('slot')}: {ROLE.get(int(advisor.get('slot') or 0), {}).get('id', 'advisor')})
- Unique job: {ROLE.get(int(advisor.get('slot') or 0), {}).get('task_hint', '')}
- Name: {advisor['name']}
- Ability Level: {advisor['ability']}/100
- Approval Rating: {advisor['approval']}%
Stay in this advisor's lane. Do not write a generic "the cabinet did a thing" issue.

**OUTCOME BASED ON ABILITY:**
{"The advisor has executed this task competently and reports back with findings." if advisor['ability'] >= 70 else "The advisor has encountered complications while attempting this task." if advisor['ability'] >= 40 else "The advisor has struggled significantly with this task and things have gone wrong."}

**NATION CONTEXT:**
- Government: {nation['government_type']}
- Population: {nation['stats']['population']}k
- GDP: {nation['stats']['gdp']}/100
- Happiness: {nation['stats']['happiness']}/100

**VALID STAT NAMES (use ONLY these in effects):**
gdp, economy_growth, unemployment, inflation, civil_rights, freedom_speech, freedom_press, freedom_assembly, freedom_religion, political_freedom, voting_rights, corruption, political_apathy, happiness, life_expectancy, obesity_rate, environment, pollution, biodiversity, eco_footprint, healthcare_quality, literacy_rate, university_attendance, scientific_advancement, crime_rate, law_enforcement, military_strength, income_equality, gini_coefficient, population, population_growth, budget_education, budget_defense, budget_healthcare, budget_welfare, budget_environment, budget_infrastructure, budget_other, national_debt, tax_rate, international_approval

Generate an issue in JSON format:
{{
  "title": "Brief title about the task outcome",
  "description": "What happened when the advisor attempted the task (100-200 words)",
  "choices": [
    {{
      "text": "Action option 1",
      "effects": {{
        "stat_name": change_amount,
        // Use 3-5 valid stat names with realistic changes (-10 to 10)
        // IMPORTANT: Use plain numbers like 5 or -3, NOT +5 or +3
      }},
      "description": "What happens if this choice is made"
    }},
    // 2-3 choices total
  ]
}}

IMPORTANT: Use ONLY the valid stat names listed above. Do not invent new stat names."""

        # Use AI to generate the issue
        session_id = f"advisor_task_{nation_id}_{advisor['slot']}"
        system_msg = "You are an AI that generates political issues for a nation simulation game. Generate issues in JSON format with: title, description, and 2-3 choices (each with text, effects dict, and description)."
        
        chat = LlmChat(
            api_key=ai_service.api_key,
            session_id=session_id,
            system_message=system_msg
        )
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        # Extract JSON from markdown code blocks if present
        response_text = response
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        # Clean up the JSON by removing + signs from numbers
        import re
        response_text = re.sub(r':\s*\+(\d+)', r': \1', response_text)
        
        issue_data = json.loads(response_text.strip())
        
        # Create issue with [Advisor Report] prefix
        issue = Issue(
            nation_id=nation_id,
            title=f"[Advisor Report] {issue_data['title']}",
            description=issue_data['description'],
            choices=[
                IssueChoice(
                    text=choice['text'],
                    effects=choice['effects'],
                    description=choice.get('description', '')
                ) for choice in issue_data['choices']
            ],
            category='advisor_task',
            importance='medium'
        )
        
        # Save issue to database
        issue_dict = issue.dict()
        issue_dict["created_at"] = datetime.utcnow()
        result = await db.issues.insert_one(issue_dict)
        
        # Update nation with new advisor data
        await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {"$set": {"advisors": advisors}}
        )
        
        logger.info(f"Advisor task created issue for nation {nation_id}: {issue.title}")
        
        return {
            "success": True,
            "message": "Task sent successfully! Check the Issues tab.",
            "issue_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending advisor task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Policy Endpoints ==============

@api_router.get("/nations/{nation_id}/policies")
async def get_nation_policies(nation_id: str):
    """Get all policies for a nation."""
    from bson import ObjectId
    try:
        nation_data = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation_data:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        policies = nation_data.get("policies", [])
        return {"success": True, "policies": policies}
    except Exception as e:
        logger.error(f"Error fetching policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/nations/{nation_id}/territories")
async def update_territory_counts(nation_id: str, request: dict):
    """Update territory counts by biome type for a nation (called from world map)."""
    from bson import ObjectId
    
    try:
        territory_counts = request.get("territory_counts", {})
        total_territories = request.get("total_territories", 0)
        resource_counts = request.get("resource_counts", {})
        
        if not territory_counts:
            raise HTTPException(status_code=400, detail="Missing territory_counts")
        
        # Update nation with territory and resource data
        result = await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {
                "$set": {
                    "territory_counts": territory_counts,
                    "total_territories": total_territories,
                    "resource_counts": resource_counts
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        logger.info(f"Updated territory counts for nation {nation_id}: {total_territories} total tiles, {len(resource_counts)} resource types")
        
        return {
            "success": True,
            "message": f"Territory counts updated: {total_territories} total tiles",
            "territory_counts": territory_counts,
            "total_territories": total_territories,
            "resource_counts": resource_counts
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating territory counts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/territories")
async def get_territory_counts(nation_id: str):
    """Get territory counts by biome type for a nation."""
    from bson import ObjectId
    
    try:
        nation_data = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation_data:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        return {
            "success": True,
            "territory_counts": nation_data.get("territory_counts", {}),
            "total_territories": nation_data.get("total_territories", 0),
            "resource_counts": nation_data.get("resource_counts", {})
        }
    except Exception as e:
        logger.error(f"Error fetching territory counts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Resource value multipliers (must match frontend)
RESOURCE_VALUES = {
    'fish': 1, 'timber': 1, 'wheat': 1, 'cattle': 1, 'rice': 1,
    'salt': 1, 'stone': 1, 'coal': 1, 'iron': 1, 'copper': 1,
    'olive_oil': 2, 'wine': 2.5, 'cotton': 2, 'wool': 2, 'seafood': 2,
    'hardwood': 2.5, 'rubber': 3, 'geothermal': 3, 'solar': 2.5, 'tourism': 3,
    'oil': 5, 'natural_gas': 4.5, 'gold': 6, 'diamonds': 7, 'silver': 5,
    'uranium': 8, 'rare_earth': 9, 'lithium': 8, 'sulfur': 4, 'amber': 5,
    'truffles': 6, 'saffron': 10, 'pearls': 7, 'ivory': 6, 'spices': 7, 'turquoise': 5
}

@api_router.get("/industry/leaderboard")
async def get_industry_leaderboard(world_id: str = None):
    """Get industry leaderboard - nations ranked by total resource value, filtered by world."""
    try:
        # Build query - filter by world_id if provided
        query = {"resource_counts": {"$exists": True, "$ne": {}}}
        if world_id:
            query["world_id"] = world_id
        
        # Get all nations with resource data
        cursor = db.nations.find(
            query,
            {"name": 1, "resource_counts": 1, "total_territories": 1}
        )
        nations = await cursor.to_list(length=100)
        
        leaderboard = []
        for nation in nations:
            resource_counts = nation.get("resource_counts", {})
            total_value = 0
            resource_tiles = 0
            
            for resource_id, count in resource_counts.items():
                value_multiplier = RESOURCE_VALUES.get(resource_id, 1)
                total_value += count * value_multiplier
                resource_tiles += count
            
            leaderboard.append({
                "nation_id": str(nation["_id"]),
                "nation_name": nation.get("name", "Unknown"),
                "total_value": total_value,
                "resource_tiles": resource_tiles,
                "unique_resources": len(resource_counts),
                "total_territories": nation.get("total_territories", 0)
            })
        
        # Sort by total value descending
        leaderboard.sort(key=lambda x: x["total_value"], reverse=True)
        
        return {
            "success": True,
            "leaderboard": leaderboard[:50]  # Top 50
        }
    except Exception as e:
        logger.error(f"Error fetching industry leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/nations/{nation_id}/advisor-probe")
async def probe_advisor_trust(nation_id: str, request: dict):
    """Spymaster spends today's task to snapshot another advisor's trust. Number goes stale."""
    from bson import ObjectId

    target_slot = request.get("target_slot")
    if not target_slot:
        raise HTTPException(status_code=400, detail="Missing target_slot")
    nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
    if not nation:
        raise HTTPException(status_code=404, detail="Nation not found")
    advisors = nation.get("advisors") or []
    spy = next((a for a in advisors if int(a.get("slot") or 0) == 5), None)
    if not spy:
        raise HTTPException(status_code=400, detail="No spymaster")
    now = datetime.utcnow()
    today = now.date()
    for adv in advisors:
        if adv.get("last_task_sent"):
            last = adv["last_task_sent"]
            last_date = last.date() if isinstance(last, datetime) else datetime.fromisoformat(str(last)).date()
            if last_date == today:
                raise HTTPException(status_code=400, detail="Daily task limit reached")
    if int(target_slot) == 5:
        raise HTTPException(status_code=400, detail="Cannot probe yourself")
    value = reveal_trust(advisors, int(target_slot), now)
    if value is None:
        raise HTTPException(status_code=404, detail="Target advisor not found")
    spy["last_task_sent"] = now
    await db.nations.update_one(
        {"_id": nation["_id"]},
        {"$set": {"advisors": advisors}},
    )
    nation["advisors"] = publicize_advisors(advisors)
    target = next((a for a in nation["advisors"] if int(a.get("slot") or 0) == int(target_slot)), None)
    return {
        "success": True,
        "trust_known": value,
        "target": target,
        "advisors": nation["advisors"],
        "note": "This is today's reading. It will go stale in a week unless you spy again.",
    }


@api_router.post("/nations/{nation_id}/advisor-reform")
async def send_advisor_reform(nation_id: str, request: dict):
    """Send a reform task to an advisor to modify an existing policy."""
    from bson import ObjectId
    from datetime import datetime
    
    try:
        advisor_slot = request.get("advisor_slot")
        policy_name = request.get("policy_name")
        reform_instructions = request.get("reform_instructions", "")
        
        if not advisor_slot or not policy_name:
            raise HTTPException(status_code=400, detail="Missing advisor_slot or policy_name")
        
        if not reform_instructions or not reform_instructions.strip():
            raise HTTPException(status_code=400, detail="Reform instructions are required. Please describe how you want the policy changed.")
        
        # Get nation
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Check GLOBAL 7-day cooldown for reforms (nation-wide, not per advisor)
        now = datetime.utcnow()
        last_nation_reform = nation.get("last_reform_sent")
        if last_nation_reform:
            if isinstance(last_nation_reform, str):
                last_nation_reform = datetime.fromisoformat(last_nation_reform)
            days_since = (now - last_nation_reform).days
            if days_since < 7:
                raise HTTPException(status_code=400, detail=f"Nation reform cooldown active. {7 - days_since} days remaining before another policy can be reformed.")
        
        # Find the advisor
        advisors = nation.get("advisors", [])
        advisor = None
        advisor_index = None
        for idx, adv in enumerate(advisors):
            if adv.get("slot") == advisor_slot:
                advisor = adv
                advisor_index = idx
                break
        
        if not advisor:
            raise HTTPException(status_code=404, detail="Advisor not found")
        
        # Find the policy to reform
        policies = nation.get("policies", [])
        target_policy = None
        policy_index = None
        for idx, policy in enumerate(policies):
            if policy.get("name") == policy_name:
                target_policy = policy
                policy_index = idx
                break
        
        if not target_policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Determine reform outcome based on advisor ability
        ability = advisor.get("ability", 50)
        
        # Higher ability = better reform, lower ability = might make things worse
        if ability >= 80:
            outcome_type = "excellent"
            outcome_desc = "The advisor has brilliantly reformed the policy, implementing the leader's vision effectively."
            effects_guidance = "mostly positive effects (+5 to +15)"
        elif ability >= 60:
            outcome_type = "good"
            outcome_desc = "The advisor has successfully reformed the policy according to the leader's instructions."
            effects_guidance = "generally positive effects (+3 to +10)"
        elif ability >= 40:
            outcome_type = "mixed"
            outcome_desc = "The advisor attempted the reform but the results are mixed - some aspects improved, others worsened."
            effects_guidance = "balanced positive and negative effects (-5 to +5)"
        else:
            outcome_type = "poor"
            outcome_desc = "The advisor has bungled the reform, misinterpreting the leader's instructions and making things worse."
            effects_guidance = "mostly negative effects (-10 to -3)"
        
        # Count how many times this policy has been reformed
        reform_count = target_policy.get("reform_count", 0) + 1
        
        # Generate AI reform using LlmChat - PRIORITIZE reform instructions and original law
        prompt = f"""You are reforming an existing law for {nation['name']}. 

**CRITICAL: THE LEADER'S REFORM INSTRUCTIONS ARE THE PRIMARY DRIVER OF THIS CHANGE.**

=== ORIGINAL LAW (MUST BE TRANSFORMED) ===
Law Name: {target_policy['name']}
Category: {target_policy.get('category', 'General')}
Full Description: {target_policy.get('news_snippet', target_policy.get('short_description', 'An existing policy.'))}

=== LEADER'S REFORM INSTRUCTIONS (FOLLOW THESE CLOSELY) ===
"{reform_instructions}"

The reform MUST directly address what the leader asked for. The new law should be a clear evolution of the original based on these specific instructions.

=== ADVISOR EXECUTING THE REFORM ===
- Name: {advisor['name']} ({advisor['title']})
- Ability: {advisor['ability']}/100 - {outcome_type.upper()} expected outcome
- {outcome_desc}

=== NATION CONTEXT ===
Government: {nation['government_type']} | Population: {nation['stats']['population']}k | GDP: {nation['stats']['gdp']}/100

=== GENERATE REFORMED LAW ===
Create a JSON response:
{{
  "new_name": "[Reformed] Original Law Name - Amended" (MUST start with [Reformed] to show it's been changed),
  "new_description": "Detailed description (80-150 words) explaining how the law changed based on the leader's instructions. Reference the original law and what's different now.",
  "stat_effects": {{
    "stat_name": change_amount
  }},
  "reform_summary": "One sentence explaining what the leader wanted and what changed"
}}

EFFECTS GUIDANCE: {effects_guidance} - effects should reflect both the leader's intentions AND the advisor's ability to execute them.

VALID STAT NAMES: gdp, economy_growth, unemployment, inflation, civil_rights, freedom_speech, freedom_press, freedom_assembly, freedom_religion, political_freedom, voting_rights, corruption, political_apathy, happiness, life_expectancy, obesity_rate, environment, pollution, biodiversity, eco_footprint, healthcare_quality, literacy_rate, university_attendance, scientific_advancement, crime_rate, law_enforcement, military_strength, income_equality, gini_coefficient, population, population_growth, budget_education, budget_defense, budget_healthcare, budget_welfare, budget_environment, budget_infrastructure, budget_other, national_debt, tax_rate, international_approval

IMPORTANT: 
- new_name MUST start with "[Reformed]" 
- Use plain numbers (5 or -3), not +5
- Include 3-6 stat effects that make sense for the reform"""

        session_id = f"advisor_reform_{nation_id}_{advisor['slot']}"
        system_msg = "You are an AI that generates policy reforms for a nation simulation game. Generate reforms in JSON format with: new_name, new_description, stat_effects dict, and reform_summary."
        
        chat = LlmChat(
            api_key=ai_service.api_key,
            session_id=session_id,
            system_message=system_msg
        )
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        response_text = response
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        # Clean up JSON
        import re
        response_text = re.sub(r':\s*\+(\d+)', r': \1', response_text)
        
        reform_data = json.loads(response_text.strip())
        
        # Ensure the new name starts with [Reformed] if AI didn't add it
        new_name = reform_data.get("new_name", target_policy["name"])
        if not new_name.startswith("[Reformed]"):
            # Strip any existing [Reformed] tags and add fresh one
            clean_name = new_name.replace("[Reformed]", "").strip()
            new_name = f"[Reformed] {clean_name}"
        
        # Update the policy with new details
        policies[policy_index]["name"] = new_name
        policies[policy_index]["news_snippet"] = reform_data.get("new_description", target_policy.get("news_snippet", ""))
        policies[policy_index]["short_description"] = reform_data.get("new_description", "")[:100]
        policies[policy_index]["last_reformed"] = now.isoformat()
        policies[policy_index]["reformed_by"] = advisor["name"]
        policies[policy_index]["reform_count"] = reform_count
        
        # Apply stat effects to nation
        current_stats = nation["stats"]
        stat_effects = reform_data.get("stat_effects", {})
        
        for stat_name, change in stat_effects.items():
            if stat_name in current_stats:
                current_stats[stat_name] = max(0, min(100, current_stats[stat_name] + change))
        
        # Normalize budget
        current_stats = normalize_budget(current_stats)
        
        # Save stats snapshot
        snapshot = {
            "timestamp": now,
            "stats": current_stats
        }
        
        # Update nation in database - set nation-level last_reform_sent for global cooldown
        await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {
                "$set": {
                    "policies": policies,
                    "stats": current_stats,
                    "last_reform_sent": now  # Global cooldown at nation level
                },
                "$push": {"stats_history": snapshot}
            }
        )
        
        logger.info(f"Policy reformed by advisor for nation {nation_id}: {target_policy['name']} -> {new_name}")
        
        return {
            "success": True,
            "message": f"Policy reformed! {reform_data.get('reform_summary', 'Changes applied.')}",
            "old_policy_name": target_policy["name"],
            "new_policy_name": new_name,
            "reform_summary": reform_data.get("reform_summary"),
            "stat_effects": stat_effects,
            "outcome_type": outcome_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reforming policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Multiplayer Server Endpoints ==============

import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == hashed

@api_router.post("/servers/register")
async def register_server(request: ServerRegistrationRequest):
    """Register a new game server with the master server."""
    try:
        # Check if server with this URL already exists
        existing = await db.servers.find_one({"host_url": request.host_url})
        if existing:
            # Update existing registration
            update_data = {
                "name": request.name,
                "description": request.description,
                "world_seed": request.world_seed,
                "max_players": request.max_players,
                "visibility": request.visibility,
                "admin_token": request.admin_token,
                "allow_migration": request.allow_migration,
                "is_online": True,
                "last_heartbeat": datetime.utcnow(),
                "version": request.version
            }
            if request.password:
                update_data["password_hash"] = hash_password(request.password)
            
            await db.servers.update_one(
                {"_id": existing["_id"]},
                {"$set": update_data}
            )
            server_id = str(existing["_id"])
            logger.info(f"Server re-registered: {request.name} at {request.host_url}")
        else:
            # Create new server registration
            server_data = {
                "name": request.name,
                "description": request.description,
                "world_seed": request.world_seed,
                "max_players": request.max_players,
                "visibility": request.visibility,
                "host_url": request.host_url,
                "admin_token": request.admin_token,
                "password_hash": hash_password(request.password) if request.password else None,
                "allow_migration": request.allow_migration,
                "is_online": True,
                "player_count": 0,
                "last_heartbeat": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "version": request.version
            }
            result = await db.servers.insert_one(server_data)
            server_id = str(result.inserted_id)
            logger.info(f"New server registered: {request.name} at {request.host_url}")
        
        return {
            "success": True,
            "server_id": server_id,
            "message": f"Server '{request.name}' registered successfully"
        }
    except Exception as e:
        logger.error(f"Error registering server: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/servers/{server_id}/heartbeat")
async def server_heartbeat(server_id: str, request: ServerHeartbeatRequest):
    """Update server status (heartbeat to keep registration alive)."""
    from bson import ObjectId
    
    try:
        server = await db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        # Verify admin token
        if server.get("admin_token") != request.admin_token:
            raise HTTPException(status_code=403, detail="Invalid admin token")
        
        await db.servers.update_one(
            {"_id": ObjectId(server_id)},
            {"$set": {
                "player_count": request.player_count,
                "is_online": request.is_online,
                "last_heartbeat": datetime.utcnow()
            }}
        )
        
        return {"success": True, "message": "Heartbeat received"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/servers/{server_id}/unregister")
async def unregister_server(server_id: str, admin_token: str):
    """Remove a server from the registry."""
    from bson import ObjectId
    
    try:
        server = await db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        # Verify admin token
        if server.get("admin_token") != admin_token:
            raise HTTPException(status_code=403, detail="Invalid admin token")
        
        await db.servers.delete_one({"_id": ObjectId(server_id)})
        logger.info(f"Server unregistered: {server.get('name')}")
        
        return {"success": True, "message": "Server unregistered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unregistering server: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/servers")
async def list_servers(include_offline: bool = False):
    """List all public servers."""
    try:
        # Mark servers as offline if no heartbeat in 5 minutes
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
        await db.servers.update_many(
            {"last_heartbeat": {"$lt": five_minutes_ago}},
            {"$set": {"is_online": False}}
        )
        
        # Build query
        query = {"visibility": "public"}
        if not include_offline:
            query["is_online"] = True
        
        servers = await db.servers.find(query).to_list(length=100)
        
        server_list = []
        for server in servers:
            server_list.append({
                "id": str(server["_id"]),
                "name": server.get("name", "Unknown Server"),
                "description": server.get("description", ""),
                "world_seed": server.get("world_seed", 123456),
                "max_players": server.get("max_players", 50),
                "player_count": server.get("player_count", 0),
                "visibility": server.get("visibility", "public"),
                "is_online": server.get("is_online", False),
                "is_password_protected": server.get("password_hash") is not None,
                "allow_migration": server.get("allow_migration", True),
                "version": server.get("version", "1.0.0"),
                "created_at": server.get("created_at", datetime.utcnow()),
                "host_url": server.get("host_url", "")
            })
        
        return {
            "success": True,
            "servers": server_list,
            "total": len(server_list)
        }
    except Exception as e:
        logger.error(f"Error listing servers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/servers/{server_id}")
async def get_server_info(server_id: str):
    """Get detailed info about a specific server."""
    from bson import ObjectId
    
    try:
        server = await db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        return {
            "success": True,
            "server": {
                "id": str(server["_id"]),
                "name": server.get("name", "Unknown Server"),
                "description": server.get("description", ""),
                "world_seed": server.get("world_seed", 123456),
                "max_players": server.get("max_players", 50),
                "player_count": server.get("player_count", 0),
                "visibility": server.get("visibility", "public"),
                "is_online": server.get("is_online", False),
                "is_password_protected": server.get("password_hash") is not None,
                "version": server.get("version", "1.0.0"),
                "created_at": server.get("created_at", datetime.utcnow()),
                "host_url": server.get("host_url", "")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting server info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/servers/{server_id}/verify-password")
async def verify_server_password(server_id: str, password: str):
    """Verify password for a password-protected server."""
    from bson import ObjectId
    
    try:
        server = await db.servers.find_one({"_id": ObjectId(server_id)})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        password_hash = server.get("password_hash")
        if not password_hash:
            return {"success": True, "message": "Server is not password protected"}
        
        if verify_password(password, password_hash):
            return {"success": True, "message": "Password correct"}
        else:
            raise HTTPException(status_code=403, detail="Incorrect password")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint for self-hosted servers to report their own info
@api_router.get("/server/info")
async def get_local_server_info():
    """Get info about this server (for self-hosted instances)."""
    # Read server config from environment
    server_name = os.environ.get("SERVER_NAME", "SovereignHex Server")
    server_description = os.environ.get("SERVER_DESCRIPTION", "A nation simulation game server")
    world_seed = int(os.environ.get("WORLD_SEED", "123456"))
    max_players = int(os.environ.get("MAX_PLAYERS", "50"))
    visibility = os.environ.get("SERVER_VISIBILITY", "public")
    version = os.environ.get("SERVER_VERSION", "1.0.0")
    
    # Get player count
    player_count = await db.nations.count_documents({})
    
    return {
        "success": True,
        "server": {
            "name": server_name,
            "description": server_description,
            "world_seed": world_seed,
            "max_players": max_players,
            "player_count": player_count,
            "visibility": visibility,
            "version": version,
            "is_online": True
        }
    }

@api_router.get("/server/players")
async def get_server_players():
    """Get list of players on this server."""
    try:
        nations = await db.nations.find(
            {},
            {"name": 1, "government_type": 1, "flag_base64": 1, "stats.population": 1, "created_at": 1}
        ).to_list(length=100)
        
        players = []
        for nation in nations:
            players.append({
                "id": str(nation["_id"]),
                "name": nation.get("name", "Unknown"),
                "government_type": nation.get("government_type", "Unknown"),
                "flag_base64": nation.get("flag_base64"),
                "population": nation.get("stats", {}).get("population", 0),
                "joined_at": nation.get("created_at", datetime.utcnow())
            })
        
        return {
            "success": True,
            "players": players,
            "total": len(players)
        }
    except Exception as e:
        logger.error(f"Error getting players: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Nation Migration Endpoints ==============

@api_router.get("/nations/{nation_id}/export")
async def export_nation(nation_id: str):
    """Export a nation's data for migration to another server."""
    from bson import ObjectId
    
    try:
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Get server URL for source tracking
        server_url = os.environ.get("SERVER_HOST_URL", "")
        
        # Build export data
        export_data = {
            "name": nation.get("name", ""),
            "government_type": nation.get("government_type", ""),
            "motto": nation.get("motto"),
            "description": nation.get("description", ""),
            "currency": nation.get("currency", "Dollar"),
            "national_animal": nation.get("national_animal", "Eagle"),
            "flag_base64": nation.get("flag_base64"),
            "stats": nation.get("stats", {}),
            "policies": nation.get("policies", []),
            "advisors": nation.get("advisors", []),
            "total_decisions": nation.get("total_decisions", 0),
            "created_at": nation.get("created_at", datetime.utcnow()).isoformat(),
            "exported_at": datetime.utcnow().isoformat(),
            "source_server": server_url
        }
        
        return {
            "success": True,
            "nation_data": export_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/nations/import")
async def import_nation(request: ImportNationRequest):
    """Import a nation from another server (migration)."""
    from bson import ObjectId
    
    try:
        # Check if server allows migration
        allow_migration = os.environ.get("ALLOW_MIGRATION", "true").lower() == "true"
        if not allow_migration:
            raise HTTPException(status_code=403, detail="This server does not accept nation migrations")
        
        # Check if user already has a nation on this server
        existing = await db.nations.find_one({"user_id": request.user_id})
        if existing:
            raise HTTPException(status_code=400, detail="You already have a nation on this server. Delete it first to migrate.")
        
        nation_data = request.nation_data
        
        # Assign new territory position (on LAND only)
        existing_nations = await db.nations.find(
            {}, 
            {"territory_center_col": 1, "territory_center_row": 1}
        ).to_list(length=None)
        
        existing_positions = set()
        for n in existing_nations:
            col = n.get("territory_center_col", 100)
            row = n.get("territory_center_row", 100)
            existing_positions.add((col, row))
        
        # Get world seed from environment
        world_seed = int(os.environ.get("WORLD_SEED", "123456"))
        
        # Find valid land position using terrain utilities
        territory_col, territory_row = find_land_position(
            existing_positions=existing_positions,
            seed=world_seed,
            min_distance=25
        )
        
        logger.info(f"Found valid LAND position ({territory_col}, {territory_row}) for migrating nation '{nation_data.name}'")
        
        # Parse stats - handle both dict and object
        stats = nation_data.stats
        if hasattr(stats, 'dict'):
            stats = stats.dict()
        elif not isinstance(stats, dict):
            stats = dict(stats)
        
        # Create the imported nation
        new_nation = {
            "user_id": request.user_id,
            "name": nation_data.name,
            "government_type": nation_data.government_type,
            "motto": nation_data.motto,
            "description": nation_data.description + f" [Migrated from {request.source_server_url}]",
            "currency": nation_data.currency,
            "national_animal": nation_data.national_animal,
            "flag_base64": nation_data.flag_base64,
            "stats": stats,
            "policies": [p.dict() if hasattr(p, 'dict') else p for p in nation_data.policies],
            "advisors": [a.dict() if hasattr(a, 'dict') else a for a in nation_data.advisors],
            "total_decisions": nation_data.total_decisions,
            "territory_center_col": territory_col,
            "territory_center_row": territory_row,
            "territory_counts": {},
            "total_territories": 0,
            "created_at": datetime.utcnow(),
            "migrated_at": datetime.utcnow(),
            "migrated_from": request.source_server_url,
            "original_created_at": nation_data.created_at
        }
        
        result = await db.nations.insert_one(new_nation)
        new_nation["_id"] = result.inserted_id
        new_nation["id"] = str(result.inserted_id)
        
        logger.info(f"Nation '{nation_data.name}' migrated from {request.source_server_url}")
        
        return {
            "success": True,
            "message": f"Nation '{nation_data.name}' migrated successfully!",
            "nation_id": str(result.inserted_id),
            "territory_position": {"col": territory_col, "row": territory_row}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/server/migration-status")
async def get_migration_status():
    """Check if this server accepts migrations."""
    allow_migration = os.environ.get("ALLOW_MIGRATION", "true").lower() == "true"
    return {
        "success": True,
        "allow_migration": allow_migration
    }

# ============== Admin/Fix Endpoints ==============

@api_router.post("/admin/fix-overlapping-positions")
async def fix_overlapping_positions():
    """Fix nations that have overlapping territory positions."""
    import math
    import random
    from bson import ObjectId
    
    MIN_DISTANCE = 25
    MAP_COLS = 505
    MAP_ROWS = 284

    def wrap_dx(a: int, b: int) -> float:
        d = (a - b) % MAP_COLS
        if d > MAP_COLS / 2:
            d -= MAP_COLS
        return d
    
    try:
        # Get all nations with positions
        nations = await db.nations.find(
            {}, 
            {"_id": 1, "name": 1, "territory_center_col": 1, "territory_center_row": 1}
        ).to_list(length=None)
        
        if not nations:
            return {"success": True, "message": "No nations found", "fixed": 0}
        
        # Build list of fixed positions
        fixed_positions = []
        fixes_made = []
        
        def is_valid_position(col: int, row: int, exclude_nation_id=None) -> bool:
            if not (8 < row < MAP_ROWS - 8):
                return False
            col = col % MAP_COLS
            for pos in fixed_positions:
                if exclude_nation_id and pos["nation_id"] == exclude_nation_id:
                    continue
                dx = wrap_dx(col, pos["col"])
                distance = math.sqrt(dx**2 + (row - pos["row"])**2)
                if distance < MIN_DISTANCE:
                    return False
            return True
        
        for nation in nations:
            nation_id = str(nation["_id"])
            name = nation.get("name", "Unknown")
            col = nation.get("territory_center_col", 100)
            row = nation.get("territory_center_row", 100)
            
            # Check if current position is valid
            if is_valid_position(col, row, nation_id):
                fixed_positions.append({"nation_id": nation_id, "col": col, "row": row})
            else:
                # Find new valid position
                found = False
                for attempt in range(200):
                    angle = attempt * 2.4 + random.uniform(-0.5, 0.5)
                    radius = 20 + (attempt * 2) + random.uniform(-3, 3)
                    new_col = int(MAP_COLS / 2 + radius * math.cos(angle)) % MAP_COLS
                    new_row = int(MAP_ROWS / 2 + radius * math.sin(angle))
                    
                    if is_valid_position(new_col, new_row):
                        # Update in database
                        await db.nations.update_one(
                            {"_id": ObjectId(nation_id)},
                            {"$set": {
                                "territory_center_col": new_col,
                                "territory_center_row": new_row
                            }}
                        )
                        fixed_positions.append({"nation_id": nation_id, "col": new_col, "row": new_row})
                        fixes_made.append({
                            "name": name,
                            "old_pos": (col, row),
                            "new_pos": (new_col, new_row)
                        })
                        logger.info(f"Fixed position for {name}: ({col}, {row}) -> ({new_col}, {new_row})")
                        found = True
                        break
                
                if not found:
                    logger.warning(f"Could not find valid position for {name}")
                    fixed_positions.append({"nation_id": nation_id, "col": col, "row": row})
        
        return {
            "success": True,
            "message": f"Fixed {len(fixes_made)} overlapping positions",
            "fixed": len(fixes_made),
            "details": fixes_made
        }
        
    except Exception as e:
        logger.error(f"Error fixing positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Global Decision Feed Endpoints ==============

@api_router.get("/feed/decisions")
async def get_decision_feed(limit: int = 50, skip: int = 0, world_id: str = None):
    """Get recent decisions from nations in a specific world."""
    try:
        # Build query - filter by world_id if provided
        query = {}
        if world_id:
            query["world_id"] = world_id
        
        # Get recent decisions, sorted by timestamp
        cursor = db.decision_feed.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        feed_items = await cursor.to_list(length=limit)
        
        # Get all nation IDs from feed items
        nation_ids = [item.get("nation_id") for item in feed_items if item.get("nation_id")]
        
        # Get faction memberships for these nations
        faction_memberships = {}
        factions_cursor = db.multi_alliances.find({"is_active": True})
        factions = await factions_cursor.to_list(length=None)
        for faction in factions:
            for member in faction.get("members", []):
                if member.get("nation_id") in nation_ids:
                    faction_memberships[member["nation_id"]] = {
                        "faction_id": str(faction["_id"]),
                        "faction_tag": faction.get("tag"),
                        "faction_name": faction.get("name"),
                        "faction_color": faction.get("color", "#8B5CF6")
                    }
        
        # Convert ObjectId to string and add faction info
        for item in feed_items:
            if "_id" in item:
                item["id"] = str(item["_id"])
                del item["_id"]
            
            # Add faction info if member
            nation_id = item.get("nation_id")
            if nation_id and nation_id in faction_memberships:
                faction_info = faction_memberships[nation_id]
                item["faction_id"] = faction_info["faction_id"]
                item["faction_tag"] = faction_info["faction_tag"]
                item["faction_name"] = faction_info["faction_name"]
                item["faction_color"] = faction_info["faction_color"]
            else:
                item["faction_id"] = None
                item["faction_tag"] = None
                item["faction_name"] = None
                item["faction_color"] = None
        
        return {"success": True, "feed": feed_items, "count": len(feed_items)}
    except Exception as e:
        logger.error(f"Error fetching decision feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== International Voting System ==============

@api_router.get("/votes/active")
async def get_active_votes(world_id: str = None):
    """Get all active international votes, filtered by world."""
    try:
        # Check for expired votes and mark them
        now = datetime.utcnow()
        await db.international_votes.update_many(
            {"is_active": True, "ends_at": {"$lt": now}},
            {"$set": {"is_active": False}}
        )
        
        # Build query
        query = {"is_active": True}
        if world_id:
            query["world_id"] = world_id
        
        # Get active votes
        votes = await db.international_votes.find(query).sort("ends_at", 1).to_list(length=50)
        
        for vote in votes:
            vote["id"] = str(vote["_id"])
            del vote["_id"]
            # Calculate time remaining
            ends_at = vote.get("ends_at")
            if ends_at:
                remaining = (ends_at - now).total_seconds()
                vote["time_remaining_seconds"] = max(0, remaining)
                vote["time_remaining_hours"] = max(0, remaining / 3600)
        
        return {"success": True, "votes": votes, "count": len(votes)}
    except Exception as e:
        logger.error(f"Error fetching active votes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/votes/ended")
async def get_ended_votes(limit: int = 20, world_id: str = None):
    """Get recently ended votes, filtered by world."""
    try:
        query = {"is_active": False}
        if world_id:
            query["world_id"] = world_id
        
        votes = await db.international_votes.find(query).sort("ends_at", -1).limit(limit).to_list(length=limit)
        
        for vote in votes:
            vote["id"] = str(vote["_id"])
            del vote["_id"]
        
        return {"success": True, "votes": votes, "count": len(votes)}
    except Exception as e:
        logger.error(f"Error fetching ended votes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/votes/{vote_id}")
async def get_vote_details(vote_id: str):
    """Get details of a specific vote."""
    from bson import ObjectId
    
    try:
        vote = await db.international_votes.find_one({"_id": ObjectId(vote_id)})
        if not vote:
            raise HTTPException(status_code=404, detail="Vote not found")
        
        vote["id"] = str(vote["_id"])
        del vote["_id"]
        
        # Calculate time remaining if active
        if vote.get("is_active"):
            now = datetime.utcnow()
            ends_at = vote.get("ends_at")
            if ends_at:
                remaining = (ends_at - now).total_seconds()
                vote["time_remaining_seconds"] = max(0, remaining)
                vote["time_remaining_hours"] = max(0, remaining / 3600)
        
        return {"success": True, "vote": vote}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/votes/{vote_id}/cast")
async def cast_vote(vote_id: str, request: CastVoteRequest):
    """Cast a vote on an international issue."""
    from bson import ObjectId
    
    try:
        vote = await db.international_votes.find_one({"_id": ObjectId(vote_id)})
        if not vote:
            raise HTTPException(status_code=404, detail="Vote not found")
        
        if not vote.get("is_active"):
            raise HTTPException(status_code=400, detail="This vote has ended")
        
        # Check if this nation already voted
        existing_votes = vote.get("votes", [])
        for v in existing_votes:
            if v.get("nation_id") == request.nation_id:
                raise HTTPException(status_code=400, detail="You have already voted")
        
        # Can't vote on your own decision
        if vote.get("source_nation_id") == request.nation_id:
            raise HTTPException(status_code=400, detail="You cannot vote on your own decision")
        
        vote_type = request.vote_type.lower()
        if vote_type not in ["praise", "condemn", "neutral"]:
            raise HTTPException(status_code=400, detail="Invalid vote type")
        
        # Condemn restrictions - cannot condemn allies or faction members
        if vote_type == "condemn":
            target_nation_id = vote.get("source_nation_id")
            
            # Check non-aggression pact
            existing_pact = await db.alliances.find_one({
                "is_active": True,
                "$or": [
                    {"nation1_id": request.nation_id, "nation2_id": target_nation_id},
                    {"nation1_id": target_nation_id, "nation2_id": request.nation_id}
                ]
            })
            if existing_pact:
                raise HTTPException(status_code=400, detail="Cannot condemn a nation you have a Non-Aggression Pact with!")
            
            # Check faction membership
            voter_faction = await db.multi_alliances.find_one({
                "$or": [
                    {"members.nation_id": request.nation_id},
                    {"vassals.nation_id": request.nation_id}
                ],
                "is_active": True
            })
            if voter_faction:
                # Check if target is in the same faction
                target_in_faction = any(
                    m.get("nation_id") == target_nation_id 
                    for m in voter_faction.get("members", []) + voter_faction.get("vassals", [])
                )
                if target_in_faction:
                    raise HTTPException(status_code=400, detail="Cannot condemn a faction member!")
        
        update_ops = {
            "$push": {
                "votes": {
                    "nation_id": request.nation_id,
                    "nation_name": request.nation_name,
                    "vote_type": vote_type,
                    "voted_at": datetime.utcnow()
                }
            }
        }
        
        # Increment the appropriate counter
        if vote_type == "praise":
            update_ops["$inc"] = {"praise_count": 1}
            # Check if this is the first praise (becomes sponsor)
            if not vote.get("praise_sponsor") and request.sponsor_statement:
                update_ops["$set"] = {
                    "praise_sponsor": {
                        "nation_id": request.nation_id,
                        "nation_name": request.nation_name,
                        "statement": request.sponsor_statement,
                        "sponsored_at": datetime.utcnow()
                    }
                }
        elif vote_type == "condemn":
            update_ops["$inc"] = {"condemn_count": 1}
            # Check if this is the first condemn (becomes sponsor)
            if not vote.get("condemn_sponsor") and request.sponsor_statement:
                update_ops["$set"] = {
                    "condemn_sponsor": {
                        "nation_id": request.nation_id,
                        "nation_name": request.nation_name,
                        "statement": request.sponsor_statement,
                        "sponsored_at": datetime.utcnow()
                    }
                }
        else:  # neutral
            update_ops["$inc"] = {"neutral_count": 1}
        
        await db.international_votes.update_one({"_id": ObjectId(vote_id)}, update_ops)
        
        # Determine if this nation became a sponsor
        is_sponsor = False
        if vote_type == "praise" and not vote.get("praise_sponsor") and request.sponsor_statement:
            is_sponsor = True
        elif vote_type == "condemn" and not vote.get("condemn_sponsor") and request.sponsor_statement:
            is_sponsor = True
        
        logger.info(f"Vote cast: {request.nation_name} voted {vote_type} on vote {vote_id}")
        
        return {
            "success": True,
            "message": f"Vote cast successfully",
            "is_sponsor": is_sponsor,
            "vote_type": vote_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error casting vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/votes/create")
async def create_international_vote(
    decision_id: str,
    decision_summary: str,
    source_nation_id: str,
    source_nation_name: str,
    source_nation_flag: Optional[str] = None
):
    """Create a new international vote (called when a decision has international impact)."""
    try:
        now = datetime.utcnow()
        vote_data = {
            "decision_id": decision_id,
            "decision_summary": decision_summary,
            "source_nation_id": source_nation_id,
            "source_nation_name": source_nation_name,
            "source_nation_flag": source_nation_flag,
            "praise_sponsor": None,
            "condemn_sponsor": None,
            "praise_count": 0,
            "condemn_count": 0,
            "neutral_count": 0,
            "votes": [],
            "created_at": now,
            "ends_at": now + timedelta(hours=24),
            "is_active": True,
            "outcome": None,
            "outcome_processed": False
        }
        
        result = await db.international_votes.insert_one(vote_data)
        vote_id = str(result.inserted_id)
        
        logger.info(f"International vote created: {vote_id} for decision by {source_nation_name}")
        
        return {
            "success": True,
            "vote_id": vote_id,
            "ends_at": vote_data["ends_at"].isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/votes/process-ended")
async def process_ended_votes():
    """Process ended votes and generate resulting issues (call this periodically)."""
    from bson import ObjectId
    
    try:
        # Find ended votes that haven't been processed
        now = datetime.utcnow()
        ended_votes = await db.international_votes.find({
            "is_active": False,
            "outcome_processed": False,
            "ends_at": {"$lt": now}
        }).to_list(length=50)
        
        processed_count = 0
        
        for vote in ended_votes:
            vote_id = str(vote["_id"])
            praise = vote.get("praise_count", 0)
            condemn = vote.get("condemn_count", 0)
            neutral = vote.get("neutral_count", 0)
            
            # Determine outcome
            if praise > condemn:
                outcome = "praised"
            elif condemn > praise:
                outcome = "condemned"
            else:
                outcome = "neutral"
            
            # Update vote with outcome
            await db.international_votes.update_one(
                {"_id": vote["_id"]},
                {"$set": {"outcome": outcome, "outcome_processed": True}}
            )
            
            # Generate a special issue for the source nation based on outcome
            source_nation_id = vote.get("source_nation_id")
            decision_summary = vote.get("decision_summary", "your recent decision")
            
            # Get sponsor statements
            praise_statement = ""
            condemn_statement = ""
            if vote.get("praise_sponsor"):
                praise_statement = vote["praise_sponsor"].get("statement", "")
            if vote.get("condemn_sponsor"):
                condemn_statement = vote["condemn_sponsor"].get("statement", "")
            
            # Create the international response issue
            issue_context = f"""
The international community has voted on your decision: "{decision_summary}"

Results: {praise} nations praised, {condemn} nations condemned, {neutral} stayed neutral.
Outcome: The world has {outcome} your actions.

{"Praise sponsor said: " + praise_statement if praise_statement else ""}
{"Condemn sponsor said: " + condemn_statement if condemn_statement else ""}

Generate an issue about how your nation responds to this international reaction.
"""
            
            # Store the pending international issue
            await db.pending_international_issues.insert_one({
                "nation_id": source_nation_id,
                "vote_id": vote_id,
                "outcome": outcome,
                "praise_count": praise,
                "condemn_count": condemn,
                "neutral_count": neutral,
                "decision_summary": decision_summary,
                "praise_statement": praise_statement,
                "condemn_statement": condemn_statement,
                "issue_context": issue_context,
                "created_at": now,
                "processed": False
            })
            
            processed_count += 1
            logger.info(f"Processed ended vote {vote_id}: outcome={outcome}")
        
        return {
            "success": True,
            "processed_count": processed_count
        }
    except Exception as e:
        logger.error(f"Error processing ended votes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/pending-international-issues")
async def get_pending_international_issues(nation_id: str):
    """Get pending international issues for a nation."""
    try:
        issues = await db.pending_international_issues.find({
            "nation_id": nation_id,
            "processed": False
        }).to_list(length=10)
        
        for issue in issues:
            issue["id"] = str(issue["_id"])
            del issue["_id"]
        
        return {"success": True, "pending_issues": issues, "count": len(issues)}
    except Exception as e:
        logger.error(f"Error fetching pending issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Chain Events System ==============

@api_router.post("/chain-events/trigger")
async def trigger_chain_event(
    source_decision_id: str,
    source_nation_id: str,
    source_nation_name: str,
    trigger_action: str,
    issue_template: str,
    issue_context: str,
    affected_nation_ids: Optional[List[str]] = None
):
    """Trigger a chain event that creates issues for other nations."""
    from bson import ObjectId
    
    try:
        # If no specific nations, affect neighbors or random nations
        if not affected_nation_ids:
            # Get some random other nations
            other_nations = await db.nations.find(
                {"_id": {"$ne": ObjectId(source_nation_id)}}
            ).limit(5).to_list(length=5)
            affected_nation_ids = [str(n["_id"]) for n in other_nations]
        
        # Create chain event
        chain_event = {
            "source_decision_id": source_decision_id,
            "source_nation_id": source_nation_id,
            "source_nation_name": source_nation_name,
            "trigger_action": trigger_action,
            "affected_nation_ids": affected_nation_ids,
            "issue_template": issue_template,
            "issue_context": issue_context,
            "created_at": datetime.utcnow(),
            "processed": False
        }
        
        result = await db.chain_events.insert_one(chain_event)
        
        # Create pending chain issues for affected nations
        for nation_id in affected_nation_ids:
            await db.pending_chain_issues.insert_one({
                "nation_id": nation_id,
                "chain_event_id": str(result.inserted_id),
                "source_nation_name": source_nation_name,
                "trigger_action": trigger_action,
                "issue_template": issue_template,
                "issue_context": issue_context,
                "created_at": datetime.utcnow(),
                "processed": False
            })
        
        logger.info(f"Chain event triggered: {trigger_action} by {source_nation_name}, affecting {len(affected_nation_ids)} nations")
        
        return {
            "success": True,
            "chain_event_id": str(result.inserted_id),
            "affected_count": len(affected_nation_ids)
        }
    except Exception as e:
        logger.error(f"Error triggering chain event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/pending-chain-issues")
async def get_pending_chain_issues(nation_id: str):
    """Get pending chain issues for a nation (issues caused by other nations' decisions)."""
    try:
        issues = await db.pending_chain_issues.find({
            "nation_id": nation_id,
            "processed": False
        }).to_list(length=10)
        
        for issue in issues:
            issue["id"] = str(issue["_id"])
            del issue["_id"]
        
        return {"success": True, "pending_chain_issues": issues, "count": len(issues)}
    except Exception as e:
        logger.error(f"Error fetching chain issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Alliance System ==============

@api_router.post("/alliances/request")
async def send_alliance_request(request: SendAllianceRequest):
    """Send an alliance request to another nation."""
    from bson import ObjectId
    
    MAX_ALLIANCES = 3  # Maximum number of 1v1 alliances per nation
    
    try:
        # Check if target nation exists
        target_nation = await db.nations.find_one({"_id": ObjectId(request.to_nation_id)})
        if not target_nation:
            raise HTTPException(status_code=404, detail="Target nation not found")
        
        # Can't ally with yourself
        if request.from_nation_id == request.to_nation_id:
            raise HTTPException(status_code=400, detail="Cannot send alliance request to yourself")
        
        # Check sender's alliance count
        sender_alliance_count = await db.alliances.count_documents({
            "is_active": True,
            "$or": [
                {"nation1_id": request.from_nation_id},
                {"nation2_id": request.from_nation_id}
            ]
        })
        if sender_alliance_count >= MAX_ALLIANCES:
            raise HTTPException(status_code=400, detail=f"You have reached the maximum of {MAX_ALLIANCES} alliances. Break an existing alliance first.")
        
        # Check target's alliance count
        target_alliance_count = await db.alliances.count_documents({
            "is_active": True,
            "$or": [
                {"nation1_id": request.to_nation_id},
                {"nation2_id": request.to_nation_id}
            ]
        })
        if target_alliance_count >= MAX_ALLIANCES:
            raise HTTPException(status_code=400, detail=f"Target nation has reached the maximum of {MAX_ALLIANCES} alliances")
        
        # Check if already allied
        existing_alliance = await db.alliances.find_one({
            "is_active": True,
            "$or": [
                {"nation1_id": request.from_nation_id, "nation2_id": request.to_nation_id},
                {"nation1_id": request.to_nation_id, "nation2_id": request.from_nation_id}
            ]
        })
        if existing_alliance:
            raise HTTPException(status_code=400, detail="You are already allied with this nation")
        
        # Check if pending request already exists
        existing_request = await db.alliance_requests.find_one({
            "status": "pending",
            "$or": [
                {"from_nation_id": request.from_nation_id, "to_nation_id": request.to_nation_id},
                {"from_nation_id": request.to_nation_id, "to_nation_id": request.from_nation_id}
            ]
        })
        if existing_request:
            raise HTTPException(status_code=400, detail="A pending alliance request already exists between these nations")
        
        # Create the request
        alliance_request = {
            "from_nation_id": request.from_nation_id,
            "from_nation_name": request.from_nation_name,
            "from_nation_flag": request.from_nation_flag,
            "to_nation_id": request.to_nation_id,
            "to_nation_name": target_nation.get("name", "Unknown"),
            "message": request.message,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "responded_at": None
        }
        
        result = await db.alliance_requests.insert_one(alliance_request)
        logger.info(f"Alliance request sent: {request.from_nation_name} -> {target_nation.get('name')}")
        
        return {
            "success": True,
            "request_id": str(result.inserted_id),
            "message": f"Alliance request sent to {target_nation.get('name')}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending alliance request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/alliances/respond")
async def respond_to_alliance(request: RespondAllianceRequest):
    """Accept or reject an alliance request."""
    from bson import ObjectId
    
    MAX_ALLIANCES = 3  # Maximum number of 1v1 alliances per nation
    
    try:
        alliance_request = await db.alliance_requests.find_one({"_id": ObjectId(request.request_id)})
        if not alliance_request:
            raise HTTPException(status_code=404, detail="Alliance request not found")
        
        if alliance_request.get("status") != "pending":
            raise HTTPException(status_code=400, detail="This request has already been responded to")
        
        now = datetime.utcnow()
        
        # Get the responder's nation name for the notification
        responder_nation = await db.nations.find_one({"_id": ObjectId(alliance_request["to_nation_id"])})
        responder_name = responder_nation["name"] if responder_nation else "Unknown"
        
        if request.accept:
            # Check both nations' alliance counts before accepting
            from_nation_id = alliance_request["from_nation_id"]
            to_nation_id = alliance_request["to_nation_id"]
            
            from_alliance_count = await db.alliances.count_documents({
                "is_active": True,
                "$or": [
                    {"nation1_id": from_nation_id},
                    {"nation2_id": from_nation_id}
                ]
            })
            if from_alliance_count >= MAX_ALLIANCES:
                raise HTTPException(status_code=400, detail=f"The requesting nation has reached the maximum of {MAX_ALLIANCES} alliances")
            
            to_alliance_count = await db.alliances.count_documents({
                "is_active": True,
                "$or": [
                    {"nation1_id": to_nation_id},
                    {"nation2_id": to_nation_id}
                ]
            })
            if to_alliance_count >= MAX_ALLIANCES:
                raise HTTPException(status_code=400, detail=f"You have reached the maximum of {MAX_ALLIANCES} alliances. Break an existing alliance first.")
            
            # Create the alliance
            # Get world_id from one of the nations
            from_nation = await db.nations.find_one({"_id": ObjectId(alliance_request["from_nation_id"])})
            world_id = from_nation.get("world_id") if from_nation else None
            
            alliance = {
                "nation1_id": alliance_request["from_nation_id"],
                "nation1_name": alliance_request["from_nation_name"],
                "nation2_id": alliance_request["to_nation_id"],
                "nation2_name": alliance_request["to_nation_name"],
                "formed_at": now,
                "is_active": True,
                "world_id": world_id  # Include world_id for filtering
            }
            await db.alliances.insert_one(alliance)
            
            # Update request status
            await db.alliance_requests.update_one(
                {"_id": ObjectId(request.request_id)},
                {"$set": {"status": "accepted", "responded_at": now}}
            )
            
            # Create notification for the requester
            notification = {
                "nation_id": alliance_request["from_nation_id"],
                "notification_type": "pact_accepted",
                "title": "Pact Accepted!",
                "message": f"{responder_name} has accepted your Non-Aggression Pact request!",
                "related_nation_id": alliance_request["to_nation_id"],
                "related_nation_name": responder_name,
                "is_read": False,
                "created_at": now
            }
            await db.notifications.insert_one(notification)
            
            logger.info(f"Alliance formed: {alliance_request['from_nation_name']} & {alliance_request['to_nation_name']}")
            
            return {
                "success": True,
                "message": f"Alliance formed with {alliance_request['from_nation_name']}!"
            }
        else:
            # Reject the request
            await db.alliance_requests.update_one(
                {"_id": ObjectId(request.request_id)},
                {"$set": {"status": "rejected", "responded_at": now}}
            )
            
            # Create notification for the requester
            notification = {
                "nation_id": alliance_request["from_nation_id"],
                "notification_type": "pact_declined",
                "title": "Pact Declined",
                "message": f"{responder_name} has declined your Non-Aggression Pact request.",
                "related_nation_id": alliance_request["to_nation_id"],
                "related_nation_name": responder_name,
                "is_read": False,
                "created_at": now
            }
            await db.notifications.insert_one(notification)
            
            return {
                "success": True,
                "message": "Alliance request rejected"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error responding to alliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/alliances")
async def get_nation_alliances(nation_id: str):
    """Get all active alliances for a nation."""
    try:
        alliances = await db.alliances.find({
            "is_active": True,
            "$or": [
                {"nation1_id": nation_id},
                {"nation2_id": nation_id}
            ]
        }).to_list(length=50)
        
        # Get ally info for each alliance
        allies = []
        for alliance in alliances:
            # Determine which nation is the ally
            if alliance["nation1_id"] == nation_id:
                ally_id = alliance["nation2_id"]
                ally_name = alliance["nation2_name"]
            else:
                ally_id = alliance["nation1_id"]
                ally_name = alliance["nation1_name"]
            
            allies.append({
                "alliance_id": str(alliance["_id"]),
                "ally_id": ally_id,
                "ally_name": ally_name,
                "formed_at": alliance.get("formed_at", datetime.utcnow())
            })
        
        return {
            "success": True,
            "allies": allies,
            "count": len(allies)
        }
    except Exception as e:
        logger.error(f"Error fetching alliances: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/alliance-requests")
async def get_alliance_requests(nation_id: str):
    """Get pending alliance requests for a nation."""
    try:
        # Incoming requests
        incoming = await db.alliance_requests.find({
            "to_nation_id": nation_id,
            "status": "pending"
        }).to_list(length=20)
        
        # Outgoing requests
        outgoing = await db.alliance_requests.find({
            "from_nation_id": nation_id,
            "status": "pending"
        }).to_list(length=20)
        
        for req in incoming + outgoing:
            req["id"] = str(req["_id"])
            del req["_id"]
        
        return {
            "success": True,
            "incoming": incoming,
            "outgoing": outgoing
        }
    except Exception as e:
        logger.error(f"Error fetching alliance requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/alliances/{alliance_id}")
async def break_alliance(alliance_id: str, nation_id: str):
    """Break an existing alliance."""
    from bson import ObjectId
    
    try:
        alliance = await db.alliances.find_one({"_id": ObjectId(alliance_id)})
        if not alliance:
            raise HTTPException(status_code=404, detail="Alliance not found")
        
        # Verify the nation is part of this alliance
        if nation_id not in [alliance["nation1_id"], alliance["nation2_id"]]:
            raise HTTPException(status_code=403, detail="You are not part of this alliance")
        
        await db.alliances.update_one(
            {"_id": ObjectId(alliance_id)},
            {"$set": {"is_active": False, "broken_at": datetime.utcnow(), "broken_by": nation_id}}
        )
        
        logger.info(f"Alliance broken by {nation_id}")
        
        return {"success": True, "message": "Alliance has been broken"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error breaking alliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nations/{nation_id}/is-ally/{other_nation_id}")
async def check_if_allied(nation_id: str, other_nation_id: str):
    """Check if two nations are allied."""
    try:
        alliance = await db.alliances.find_one({
            "is_active": True,
            "$or": [
                {"nation1_id": nation_id, "nation2_id": other_nation_id},
                {"nation1_id": other_nation_id, "nation2_id": nation_id}
            ]
        })
        
        return {
            "success": True,
            "is_allied": alliance is not None
        }
    except Exception as e:
        logger.error(f"Error checking alliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Multi-Nation Alliance System ==============

from alliance_service import AllianceService
from models import (
    CreateAllianceRequest, InviteToAllianceRequest, RespondToAllianceInviteRequest,
    RequestToJoinAllianceRequest, HandleJoinRequestRequest, LeaveAllianceRequest,
    KickFromAllianceRequest, PromoteMemberRequest, AllianceRole, EditAllianceSettingsRequest
)

# Initialize alliance service
alliance_service = AllianceService(db)

@api_router.post("/multi-alliances/create")
async def create_multi_alliance(request: CreateAllianceRequest):
    """Create a new multi-nation alliance."""
    success, message, alliance = await alliance_service.create_alliance(
        founder_nation_id=request.founder_nation_id,
        founder_nation_name=request.founder_nation_name,
        founder_nation_flag=request.founder_nation_flag,
        founder_race=request.founder_race,
        name=request.name,
        tag=request.tag,
        description=request.description,
        motto=request.motto,
        color=request.color,
        is_public=request.is_public,
        requires_approval=request.requires_approval
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message, "alliance": alliance}

@api_router.get("/multi-alliances/browse")
async def browse_alliances(limit: int = 50, world_id: str = None):
    """Get list of public alliances, filtered by world."""
    alliances = await alliance_service.get_public_alliances(limit, world_id)
    return {"success": True, "alliances": alliances, "count": len(alliances)}

@api_router.get("/multi-alliances/{alliance_id}")
async def get_alliance_details(alliance_id: str):
    """Get detailed information about an alliance."""
    alliance = await alliance_service.get_alliance(alliance_id)
    if not alliance:
        raise HTTPException(status_code=404, detail="Alliance not found")
    
    # Get pending join requests if user is a manager
    join_requests = await alliance_service.get_alliance_join_requests(alliance_id)
    alliance["pending_requests"] = join_requests
    
    return {"success": True, "alliance": alliance}

@api_router.get("/multi-alliances/nation/{nation_id}")
async def get_nation_multi_alliance(nation_id: str):
    """Get the multi-alliance a nation belongs to."""
    alliance = await alliance_service.get_nation_alliance(nation_id)
    return {"success": True, "alliance": alliance}

@api_router.post("/multi-alliances/invite")
async def invite_to_alliance(request: InviteToAllianceRequest):
    """Invite a nation to join an alliance."""
    # Get inviter info
    from bson import ObjectId
    inviter = await db.nations.find_one({"_id": ObjectId(request.inviter_nation_id)})
    if not inviter:
        raise HTTPException(status_code=404, detail="Inviter nation not found")
    
    # Get target info
    target = await db.nations.find_one({"_id": ObjectId(request.to_nation_id)})
    if not target:
        raise HTTPException(status_code=404, detail="Target nation not found")
    
    success, message = await alliance_service.invite_to_alliance(
        alliance_id=request.alliance_id,
        inviter_nation_id=request.inviter_nation_id,
        inviter_nation_name=inviter["name"],
        to_nation_id=request.to_nation_id,
        to_nation_name=target["name"],
        message=request.message
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.get("/multi-alliances/invites/{nation_id}")
async def get_alliance_invites(nation_id: str):
    """Get pending alliance invites for a nation."""
    invites = await alliance_service.get_nation_invites(nation_id)
    return {"success": True, "invites": invites, "count": len(invites)}

@api_router.post("/multi-alliances/invites/respond")
async def respond_to_alliance_invite(request: RespondToAllianceInviteRequest):
    """Accept or decline an alliance invitation."""
    from bson import ObjectId
    
    # Get invite to find nation ID
    invite = await db.alliance_invites.find_one({"_id": ObjectId(request.invite_id)})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    # Get nation info
    nation = await db.nations.find_one({"_id": ObjectId(invite["to_nation_id"])})
    if not nation:
        raise HTTPException(status_code=404, detail="Nation not found")
    
    success, message = await alliance_service.respond_to_invite(
        invite_id=request.invite_id,
        nation_id=invite["to_nation_id"],
        nation_name=nation["name"],
        nation_flag=nation.get("flag_base64"),
        race=nation.get("race", "human"),
        accept=request.accept
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/join")
async def request_to_join_alliance(request: RequestToJoinAllianceRequest):
    """Request to join an alliance."""
    success, message = await alliance_service.request_to_join(
        alliance_id=request.alliance_id,
        nation_id=request.nation_id,
        nation_name=request.nation_name,
        nation_flag=request.nation_flag,
        message=request.message
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/join-requests/handle")
async def handle_join_request(request: HandleJoinRequestRequest):
    """Accept or reject a join request. Can specify join_as_role ('member' or 'vassal')."""
    success, message = await alliance_service.handle_join_request(
        request_id=request.request_id,
        handler_nation_id=request.handler_nation_id,
        accept=request.accept,
        join_as_role=request.join_as_role
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/leave")
async def leave_alliance(request: LeaveAllianceRequest):
    """Leave an alliance."""
    from bson import ObjectId
    nation = await db.nations.find_one({"_id": ObjectId(request.nation_id)})
    if not nation:
        raise HTTPException(status_code=404, detail="Nation not found")
    
    success, message = await alliance_service.leave_alliance(
        alliance_id=request.alliance_id,
        nation_id=request.nation_id,
        nation_name=nation["name"]
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/kick")
async def kick_from_alliance(request: KickFromAllianceRequest):
    """Kick a member from the alliance."""
    from bson import ObjectId
    target = await db.nations.find_one({"_id": ObjectId(request.target_nation_id)})
    if not target:
        raise HTTPException(status_code=404, detail="Target nation not found")
    
    success, message = await alliance_service.kick_member(
        alliance_id=request.alliance_id,
        kicker_nation_id=request.kicker_nation_id,
        target_nation_id=request.target_nation_id,
        target_nation_name=target["name"],
        reason=request.reason
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/promote")
async def promote_member(request: PromoteMemberRequest):
    """Promote or demote a member's role."""
    success, message = await alliance_service.promote_member(
        alliance_id=request.alliance_id,
        promoter_nation_id=request.promoter_nation_id,
        target_nation_id=request.target_nation_id,
        new_role=request.new_role
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

@api_router.post("/multi-alliances/edit")
async def edit_alliance_settings(request: EditAllianceSettingsRequest):
    """Edit faction settings (founder/leader only)."""
    updates = {
        "name": request.name,
        "description": request.description,
        "motto": request.motto,
        "color": request.color,
        "is_public": request.is_public,
        "requires_approval": request.requires_approval,
        "min_reputation": request.min_reputation,
        "min_population": request.min_population,
        "max_members": request.max_members,
        "allowed_races": request.allowed_races,
        "allowed_ideologies": request.allowed_ideologies,
    }
    
    # Remove None values
    updates = {k: v for k, v in updates.items() if v is not None}
    
    success, message, alliance = await alliance_service.edit_alliance_settings(
        alliance_id=request.alliance_id,
        editor_nation_id=request.editor_nation_id,
        updates=updates
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message, "alliance": alliance}

@api_router.post("/multi-alliances/transfer-leadership")
async def transfer_leadership(alliance_id: str, current_founder_id: str, new_founder_id: str):
    """Transfer founder status to another member."""
    success, message = await alliance_service.transfer_leadership(
        alliance_id=alliance_id,
        current_founder_id=current_founder_id,
        new_founder_id=new_founder_id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}

# ============== Faction Chat System ==============

@api_router.post("/factions/{faction_id}/chat/send")
async def send_faction_message(faction_id: str, request: SendFactionMessageRequest):
    """Send a message in faction chat."""
    from alliance_service import AllianceService
    alliance_service = AllianceService(db)
    
    # Verify sender is a member of the faction
    alliance = await alliance_service.get_alliance(faction_id)
    if not alliance:
        raise HTTPException(status_code=404, detail="Faction not found")
    
    is_member = any(m["nation_id"] == request.sender_id for m in alliance.get("members", []))
    if not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this faction to send messages")
    
    # Get sender info
    sender = await db.nations.find_one({"_id": ObjectId(request.sender_id)})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender nation not found")
    
    # Create message
    message = FactionChatMessage(
        faction_id=faction_id,
        sender_id=request.sender_id,
        sender_name=sender["name"],
        sender_flag=sender.get("flag_base64"),
        message=request.message
    )
    
    # Save to database
    await db.faction_chat.insert_one(message.dict())
    
    return {"success": True, "message": "Message sent"}

@api_router.get("/factions/{faction_id}/chat/messages")
async def get_faction_messages(faction_id: str, nation_id: str, limit: int = 50):
    """Get chat messages for a faction."""
    from alliance_service import AllianceService
    alliance_service = AllianceService(db)
    
    # Verify requester is a member of the faction
    alliance = await alliance_service.get_alliance(faction_id)
    if not alliance:
        raise HTTPException(status_code=404, detail="Faction not found")
    
    is_member = any(m["nation_id"] == nation_id for m in alliance.get("members", []))
    if not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this faction to view messages")
    
    # Get messages
    messages = await db.faction_chat.find(
        {"faction_id": faction_id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Convert ObjectId to string
    for msg in messages:
        msg["_id"] = str(msg["_id"])
    
    # Reverse to show oldest first
    messages.reverse()
    
    return {"messages": messages}

# ============== Reputation System ==============

@api_router.get("/reputation/{nation_id}")
async def get_nation_reputation(nation_id: str):
    """Get a nation's reputation data."""
    reputation = await alliance_service.get_nation_reputation(nation_id)
    
    # If no reputation exists, create default
    if not reputation:
        from bson import ObjectId
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Return default reputation
        reputation = {
            "nation_id": nation_id,
            "nation_name": nation["name"],
            "overall_score": 100,
            "alliance_reliability": 100,
            "diplomatic_standing": 100,
            "alliances_formed": 0,
            "alliances_broken": 0,
            "alliances_honored": 0,
            "betrayal_rate": 0.0,
            "recent_events": []
        }
    
    return {"success": True, "reputation": reputation}

@api_router.get("/reputation/leaderboard/top")
async def get_reputation_leaderboard(limit: int = 50):
    """Get top nations by reputation."""
    leaderboard = await alliance_service.get_reputation_leaderboard(limit)
    return {"success": True, "leaderboard": leaderboard, "count": len(leaderboard)}

# ============== War System ==============

@api_router.post("/wars/declare")
async def declare_war(request: DeclareWarRequest):
    """Declare war on another nation."""
    from war_service import WarService
    war_service = WarService(db)
    
    success, message, war = await war_service.declare_war(
        attacker_id=request.attacker_id,
        defender_id=request.defender_id,
        casus_belli=request.casus_belli
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message, "war": war}

@api_router.get("/wars/nation/{nation_id}")
async def get_nation_active_war(nation_id: str):
    """Get nation's active war if any."""
    from war_service import WarService
    war_service = WarService(db)
    
    war = await war_service.get_nation_active_war(nation_id)
    
    return {"war": war}

@api_router.post("/wars/{war_id}/surrender")
async def surrender_war(war_id: str, request: SurrenderRequest):
    """Surrender and end the war."""
    from war_service import WarService
    war_service = WarService(db)
    
    # Get war
    war = await db.wars.find_one({"_id": ObjectId(war_id)})
    if not war:
        raise HTTPException(status_code=404, detail="War not found")
    
    # Determine winner (opposite of surrendering side)
    if request.surrendering_nation_id == war["attacker_id"]:
        final_score = -100  # Defender wins decisively
    else:
        final_score = 100  # Attacker wins decisively
    
    success = await war_service.end_war(war_id, final_score)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process surrender")
    
    return {"success": True, "message": "War ended by surrender"}

@api_router.get("/wars/{war_id}")
async def get_war_details(war_id: str):
    """Get full war details including events and battle timer."""
    from war_service import WarService
    
    BATTLE_INTERVAL_HOURS = 24  # One battle every 24 hours
    
    war = await db.wars.find_one({"_id": ObjectId(war_id)})
    
    if not war:
        raise HTTPException(status_code=404, detail="War not found")
    
    now = datetime.utcnow()
    war_service = WarService(db)
    
    # Check if we should generate a battle
    if war.get("status") == "active":
        last_battle = war.get("last_battle_at") or war.get("started_at")
        
        if last_battle:
            hours_since_battle = (now - last_battle).total_seconds() / 3600
            
            if hours_since_battle >= BATTLE_INTERVAL_HOURS:
                # Generate a battle!
                try:
                    logger.info(f"Attempting to auto-generate battle for war {war_id}, hours since last: {hours_since_battle}")
                    event = await war_service.generate_war_event_with_ai(war)
                    if event:
                        success = await war_service.apply_war_event(str(war["_id"]), event)
                        if success:
                            # Reload war data after battle
                            war = await db.wars.find_one({"_id": ObjectId(war_id)})
                            logger.info(f"Auto-generated battle for war {war_id}")
                        else:
                            logger.error(f"Failed to apply war event for war {war_id}")
                    else:
                        logger.error(f"Failed to generate war event for war {war_id}")
                except Exception as e:
                    logger.error(f"Error auto-generating battle: {e}")
    
    # Calculate battle timer
    if war.get("status") == "active":
        last_battle = war.get("last_battle_at") or war.get("started_at")
        
        if last_battle:
            next_battle_time = last_battle + timedelta(hours=BATTLE_INTERVAL_HOURS)
            seconds_remaining = (next_battle_time - now).total_seconds()
            
            # Cap at 24 hours max
            if seconds_remaining > BATTLE_INTERVAL_HOURS * 3600:
                seconds_remaining = BATTLE_INTERVAL_HOURS * 3600
            
            if seconds_remaining <= 0:
                battle_timer_display = "Battle imminent!"
            else:
                hours = int(seconds_remaining // 3600)
                minutes = int((seconds_remaining % 3600) // 60)
                
                if hours > 0:
                    battle_timer_display = f"{hours}h {minutes}m"
                else:
                    battle_timer_display = f"{minutes}m"
        else:
            battle_timer_display = f"{BATTLE_INTERVAL_HOURS}h 0m"
    else:
        battle_timer_display = "War ended"
    
    war["_id"] = str(war["_id"])
    war["battle_timer_display"] = battle_timer_display
    
    return {"war": war}

@api_router.get("/wars/{war_id}/participants")
async def get_war_participants(war_id: str):
    """Get all participants in a war with their details."""
    from war_service import WarService
    war_service = WarService(db)
    participants = await war_service.get_war_participants(war_id)
    return {"success": True, "participants": participants}

@api_router.get("/wars/can-call/{nation_id}")
async def check_can_call_to_war(nation_id: str):
    """Check if a nation can be called into a war."""
    from war_service import WarService
    war_service = WarService(db)
    can_call, reason = await war_service.can_be_called_to_war(nation_id)
    return {"can_call": can_call, "reason": reason}

@api_router.post("/wars/call-to-war")
async def call_to_war(caller_nation_id: str, target_nation_id: str):
    """Send a war join request to a faction member."""
    from war_service import WarService
    war_service = WarService(db)
    success, message = await war_service.call_to_war(caller_nation_id, target_nation_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@api_router.get("/wars/join-requests/{nation_id}")
async def get_war_join_requests(nation_id: str):
    """Get pending war join requests for a nation."""
    from war_service import WarService
    war_service = WarService(db)
    requests = await war_service.get_war_join_requests(nation_id)
    return {"success": True, "requests": requests, "count": len(requests)}

@api_router.post("/wars/join-requests/{request_id}/respond")
async def respond_to_war_join_request(request_id: str, nation_id: str, accept: bool):
    """Accept or reject a war join request."""
    from war_service import WarService
    war_service = WarService(db)
    success, message = await war_service.respond_to_war_join_request(request_id, nation_id, accept)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@api_router.post("/admin/trigger-daily-jobs")
async def trigger_daily_jobs():
    """Manually trigger daily background jobs (for testing)."""
    try:
        from daily_processor import process_daily_wars, process_monthly_tributes
        
        logger.info("Manually triggering daily jobs...")
        
        # Process wars
        await process_daily_wars(db)
        
        # Process tributes (regardless of date for testing)
        await process_monthly_tributes(db)
        
        return {"success": True, "message": "Daily jobs completed"}
        
    except Exception as e:
        logger.error(f"Error triggering daily jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== NOTIFICATIONS API ==============

@api_router.get("/notifications/{nation_id}")
async def get_notifications(nation_id: str, unread_only: bool = False, limit: int = 50):
    """Get notifications for a nation."""
    from bson import ObjectId
    
    try:
        query = {"nation_id": nation_id}
        if unread_only:
            query["is_read"] = False
        
        notifications = await db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Format for frontend
        result = []
        for n in notifications:
            result.append({
                "id": str(n["_id"]),
                "notification_type": n.get("notification_type", "general"),
                "title": n.get("title", "Notification"),
                "message": n.get("message", ""),
                "related_nation_id": n.get("related_nation_id"),
                "related_nation_name": n.get("related_nation_name"),
                "is_read": n.get("is_read", False),
                "created_at": n.get("created_at", datetime.utcnow()).isoformat()
            })
        
        return {"success": True, "notifications": result}
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    from bson import ObjectId
    
    try:
        result = await db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"is_read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/{nation_id}/read-all")
async def mark_all_notifications_read(nation_id: str):
    """Mark all notifications as read for a nation."""
    try:
        await db.notifications.update_many(
            {"nation_id": nation_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking all notifications read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications/{nation_id}/count")
async def get_notification_count(nation_id: str):
    """Get unread notification count for a nation."""
    try:
        count = await db.notifications.count_documents({"nation_id": nation_id, "is_read": False})
        return {"success": True, "count": count}
    except Exception as e:
        logger.error(f"Error getting notification count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== WORLD BROWSER ENDPOINTS ==============

@api_router.get("/worlds")
async def get_worlds():
    """Get all public worlds."""
    try:
        worlds_cursor = db.worlds.find({"is_active": True}).sort("player_count", -1)
        worlds = await worlds_cursor.to_list(length=100)
        
        for world in worlds:
            world["id"] = str(world["_id"])
            world["_id"] = str(world["_id"])
        
        return {
            "success": True,
            "worlds": worlds,
            "total": len(worlds)
        }
    except Exception as e:
        logger.error(f"Error getting worlds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/worlds")
async def create_world(request: dict):
    """Create a new world."""
    try:
        name = request.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="World name is required")
        
        # Check if world with same name exists
        existing = await db.worlds.find_one({"name": name})
        if existing:
            raise HTTPException(status_code=400, detail="A world with this name already exists")
        
        world = {
            "name": name,
            "description": request.get("description", ""),
            "seed": request.get("seed", 123456),
            "max_players": request.get("max_players", 50),
            "enabled_races": request.get("enabled_races", ["human", "zythera"]),
            "allows_migration": request.get("allows_migration", True),
            "noise_settings": request.get("noise_settings") or {},
            "owner_nation_id": request.get("creator_nation_id"),
            "owner_nation_name": request.get("creator_nation_name"),
            "player_count": 0,
            "nation_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        result = await db.worlds.insert_one(world)
        world["id"] = str(result.inserted_id)
        world["_id"] = str(result.inserted_id)
        
        logger.info(f"Created world: {name} with seed {world['seed']}")
        
        return {
            "success": True,
            "world": world
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating world: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/worlds/{world_id}")
async def get_world(world_id: str):
    """Get a specific world by ID."""
    from bson import ObjectId
    try:
        world = await db.worlds.find_one({"_id": ObjectId(world_id)})
        if not world:
            raise HTTPException(status_code=404, detail="World not found")
        
        world["id"] = str(world["_id"])
        world["_id"] = str(world["_id"])
        
        # Get nation count for this world
        nation_count = await db.nations.count_documents({"world_id": world_id})
        world["nation_count"] = nation_count
        
        return {
            "success": True,
            "world": world
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting world: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/worlds/{world_id}")
async def update_world(world_id: str, request: dict):
    """Update world settings (owner only)."""
    from bson import ObjectId
    try:
        world = await db.worlds.find_one({"_id": ObjectId(world_id)})
        if not world:
            raise HTTPException(status_code=404, detail="World not found")
        
        # Check ownership (optional - could require nation_id in request)
        requester_nation_id = request.get("nation_id")
        if requester_nation_id and world.get("owner_nation_id") != requester_nation_id:
            raise HTTPException(status_code=403, detail="Only the world owner can update settings")
        
        # Update allowed fields
        update_fields = {}
        allowed_fields = ["name", "description", "max_players", "enabled_races"]
        for field in allowed_fields:
            if field in request:
                update_fields[field] = request[field]
        
        if update_fields:
            update_fields["last_activity"] = datetime.utcnow()
            await db.worlds.update_one(
                {"_id": ObjectId(world_id)},
                {"$set": update_fields}
            )
        
        return {"success": True, "message": "World updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating world: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/worlds/{world_id}")
async def delete_world(world_id: str, nation_id: str = None):
    """Delete a world (owner only). Soft delete by setting is_active to False."""
    from bson import ObjectId
    try:
        world = await db.worlds.find_one({"_id": ObjectId(world_id)})
        if not world:
            raise HTTPException(status_code=404, detail="World not found")
        
        # Check ownership
        if nation_id and world.get("owner_nation_id") != nation_id:
            raise HTTPException(status_code=403, detail="Only the world owner can delete it")
        
        # Soft delete
        await db.worlds.update_one(
            {"_id": ObjectId(world_id)},
            {"$set": {"is_active": False}}
        )
        
        logger.info(f"World {world_id} deleted by nation {nation_id}")
        
        return {"success": True, "message": "World deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting world: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/worlds/{world_id}/nations")
async def get_world_nations(world_id: str):
    """Get all nations in a specific world."""
    try:
        nations_cursor = db.nations.find({"world_id": world_id}).sort("stats.population", -1).limit(100)
        nations = await nations_cursor.to_list(length=100)
        
        for nation in nations:
            nation["id"] = str(nation["_id"])
            nation["_id"] = str(nation["_id"])
        
        return {
            "success": True,
            "nations": nations,
            "total": len(nations)
        }
    except Exception as e:
        logger.error(f"Error getting world nations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/worlds/{world_id}/join")
async def join_world(world_id: str, request: dict):
    """Join a world with an existing nation or create a new one."""
    from bson import ObjectId
    try:
        world = await db.worlds.find_one({"_id": ObjectId(world_id)})
        if not world:
            raise HTTPException(status_code=404, detail="World not found")
        
        if not world.get("is_active"):
            raise HTTPException(status_code=400, detail="This world is no longer active")
        
        # Check max players
        current_count = await db.nations.count_documents({"world_id": world_id})
        if current_count >= world.get("max_players", 50):
            raise HTTPException(status_code=400, detail="This world is full")
        
        nation_id = request.get("nation_id")
        if not nation_id:
            raise HTTPException(status_code=400, detail="nation_id is required")
        
        # Update nation's world_id
        result = await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {"$set": {"world_id": world_id}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        # Update world's nation count and last activity
        await db.worlds.update_one(
            {"_id": ObjectId(world_id)},
            {
                "$inc": {"nation_count": 1},
                "$set": {"last_activity": datetime.utcnow()}
            }
        )
        
        logger.info(f"Nation {nation_id} joined world {world_id}")
        
        return {"success": True, "message": "Joined world successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining world: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/worlds/{world_id}/migrate")
async def migrate_to_world(world_id: str, request: dict):
    """Migrate an existing nation to a different world."""
    from bson import ObjectId
    try:
        nation_id = request.get("nation_id")
        if not nation_id:
            raise HTTPException(status_code=400, detail="nation_id is required")
        
        # Get target world
        target_world = await db.worlds.find_one({"_id": ObjectId(world_id)})
        if not target_world:
            raise HTTPException(status_code=404, detail="Target world not found")
        
        if not target_world.get("is_active"):
            raise HTTPException(status_code=400, detail="Target world is no longer active")
        
        # Check if target world allows migration
        if not target_world.get("allows_migration", True):
            raise HTTPException(status_code=403, detail="This world does not allow migration")
        
        # Check if target world is full
        current_count = await db.nations.count_documents({"world_id": world_id})
        if current_count >= target_world.get("max_players", 50):
            raise HTTPException(status_code=400, detail="Target world is full")
        
        # Get nation and its current world
        nation = await db.nations.find_one({"_id": ObjectId(nation_id)})
        if not nation:
            raise HTTPException(status_code=404, detail="Nation not found")
        
        old_world_id = nation.get("world_id")
        
        # Check if nation's race is enabled in target world
        nation_race = nation.get("race", "human")
        enabled_races = target_world.get("enabled_races", ["human", "zythera"])
        if nation_race not in enabled_races:
            raise HTTPException(status_code=403, detail=f"Your race ({nation_race}) is not allowed in the target world")
        
        # Find new valid position in target world using target world's seed
        world_seed = target_world.get("seed", 123456)
        
        # Get existing positions in target world
        existing_nations = await db.nations.find(
            {"world_id": world_id}, 
            {"territory_center_col": 1, "territory_center_row": 1}
        ).to_list(length=None)
        
        existing_positions = set()
        for n in existing_nations:
            col = n.get("territory_center_col", 100)
            row = n.get("territory_center_row", 100)
            existing_positions.add((col, row))
        
        # Find new position
        new_col, new_row = find_land_position(
            existing_positions=existing_positions,
            seed=world_seed,
            min_distance=25
        )
        
        # Update nation's world and position
        await db.nations.update_one(
            {"_id": ObjectId(nation_id)},
            {
                "$set": {
                    "world_id": world_id,
                    "territory_center_col": new_col,
                    "territory_center_row": new_row,
                    "territory_counts": {},  # Reset territory (they'll need to reclaim)
                    "total_territories": 0
                }
            }
        )
        
        # Update old world's count (decrease)
        if old_world_id:
            await db.worlds.update_one(
                {"_id": ObjectId(old_world_id)},
                {"$inc": {"nation_count": -1}}
            )
        
        # Update new world's count (increase)
        await db.worlds.update_one(
            {"_id": ObjectId(world_id)},
            {
                "$inc": {"nation_count": 1},
                "$set": {"last_activity": datetime.utcnow()}
            }
        )
        
        logger.info(f"Nation {nation_id} ({nation['name']}) migrated from world {old_world_id} to {world_id}")
        
        return {
            "success": True, 
            "message": f"Successfully migrated to {target_world['name']}",
            "new_position": {"col": new_col, "row": new_row}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error migrating nation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# Serve the Expo web export from the same origin as /api so Cloudflare tunnels work
# (HTTPS page + LAN API IP is mixed-content / unreachable off-LAN).
_frontend_dist = ROOT_DIR.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("portraits"):
            raise HTTPException(status_code=404, detail="Not found")
        target = (_frontend_dist / full_path).resolve()
        try:
            target.relative_to(_frontend_dist.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
        if target.is_file():
            headers = {}
            if target.suffix in {".html", ".htm"}:
                headers["Cache-Control"] = "no-store"
            return FileResponse(target, headers=headers)
        html = _frontend_dist / f"{full_path}.html"
        if html.is_file():
            return FileResponse(html, headers={"Cache-Control": "no-store"})
        index = _frontend_dist / "index.html"
        if index.is_file():
            return FileResponse(index, headers={"Cache-Control": "no-store"})
        raise HTTPException(status_code=404, detail="Frontend not built")


