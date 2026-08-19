"""
Daily Background Processor
Runs daily jobs like war event generation, tribute processing, etc.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

from war_service import WarService
from models import WarStatus

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

async def process_daily_wars(db):
    """Generate war events for all active wars."""
    try:
        war_service = WarService(db)
        
        # Get all active wars
        active_wars = await db.wars.find({"status": WarStatus.ACTIVE}).to_list(length=None)
        
        logger.info(f"Processing {len(active_wars)} active wars...")
        
        for war in active_wars:
            try:
                war_id = str(war["_id"])
                logger.info(f"Generating event for war: {war['attacker_name']} vs {war['defender_name']}")
                
                # 60% chance to generate event each day
                import random
                if random.random() < 0.6:
                    # Generate AI war event
                    event = await war_service.generate_war_event_with_ai(war)
                    
                    if event:
                        # Apply event effects
                        success = await war_service.apply_war_event(war_id, event)
                        
                        if success:
                            logger.info(f"War event applied: {event.title} (score: {event.war_score_change:+d})")
                        else:
                            logger.error(f"Failed to apply war event for war {war_id}")
                    else:
                        logger.error(f"Failed to generate war event for war {war_id}")
                else:
                    logger.info(f"Skipping event generation for war {war_id} (random chance)")
                
            except Exception as e:
                logger.error(f"Error processing war {war.get('_id')}: {e}")
                continue
        
        logger.info("Daily war processing complete")
        
    except Exception as e:
        logger.error(f"Error in process_daily_wars: {e}")


async def process_monthly_tributes(db):
    """Process monthly tribute payments (resources and GDP)."""
    try:
        # Find all nations paying tribute
        tribute_nations = await db.nations.find({"paying_tribute_to": {"$exists": True, "$ne": None}}).to_list(length=None)
        
        logger.info(f"Processing {len(tribute_nations)} nations paying tribute...")
        
        for loser in tribute_nations:
            try:
                tribute_terms = loser.get("tribute_terms")
                if not tribute_terms:
                    continue
                
                winner_id = loser.get("paying_tribute_to")
                if not winner_id:
                    continue
                
                winner = await db.nations.find_one({"_id": ObjectId(winner_id)})
                if not winner:
                    logger.warning(f"Winner nation {winner_id} not found for tribute")
                    continue
                
                # Check if tribute period has ended
                started_at = tribute_terms.get("started_at")
                if isinstance(started_at, str):
                    started_at = datetime.fromisoformat(started_at)
                
                resource_duration = tribute_terms.get("resource_tribute_duration_months", 0)
                gdp_duration = tribute_terms.get("gdp_reparations_duration_months", 0)
                
                months_passed = (datetime.utcnow() - started_at).days / 30
                
                # Process resource tribute
                if months_passed < resource_duration:
                    resource_pct = tribute_terms.get("resource_tribute_percentage", 0) / 100
                    loser_resources = loser.get("resources", {})
                    
                    tribute_resources = {}
                    for resource, amount in loser_resources.items():
                        tribute_amount = amount * resource_pct
                        tribute_resources[resource] = tribute_amount
                    
                    # Transfer resources
                    if tribute_resources:
                        # Deduct from loser
                        for resource, amount in tribute_resources.items():
                            await db.nations.update_one(
                                {"_id": loser["_id"]},
                                {"$inc": {f"resources.{resource}": -amount}}
                            )
                        
                        # Add to winner
                        for resource, amount in tribute_resources.items():
                            await db.nations.update_one(
                                {"_id": winner["_id"]},
                                {"$inc": {f"resources.{resource}": amount}}
                            )
                        
                        logger.info(f"Transferred resources from {loser['name']} to {winner['name']}: {tribute_resources}")
                
                # Process GDP reparations
                if months_passed < gdp_duration:
                    gdp_pct = tribute_terms.get("gdp_reparations_percentage", 0) / 100
                    loser_gdp = loser.get("stats", {}).get("gdp", 0)
                    
                    reparation_amount = loser_gdp * gdp_pct
                    
                    # Transfer GDP
                    await db.nations.update_one(
                        {"_id": loser["_id"]},
                        {"$inc": {"stats.gdp": -reparation_amount}}
                    )
                    
                    await db.nations.update_one(
                        {"_id": winner["_id"]},
                        {"$inc": {"stats.gdp": reparation_amount}}
                    )
                    
                    logger.info(f"Transferred GDP from {loser['name']} to {winner['name']}: {reparation_amount:.2f}")
                
                # Check if both tribute periods have ended
                if months_passed >= max(resource_duration, gdp_duration):
                    # Clear tribute status
                    await db.nations.update_one(
                        {"_id": loser["_id"]},
                        {"$unset": {"paying_tribute_to": "", "tribute_terms": ""}}
                    )
                    logger.info(f"Tribute period ended for {loser['name']} -> {winner['name']}")
                
            except Exception as e:
                logger.error(f"Error processing tribute for nation {loser.get('name')}: {e}")
                continue
        
        logger.info("Monthly tribute processing complete")
        
    except Exception as e:
        logger.error(f"Error in process_monthly_tributes: {e}")


async def run_daily_jobs():
    """Run all daily background jobs."""
    try:
        # Connect to MongoDB
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        logger.info("=== Starting Daily Jobs ===")
        
        # Process wars
        await process_daily_wars(db)
        
        # Check if it's the first of the month for tribute processing
        if datetime.utcnow().day == 1:
            await process_monthly_tributes(db)
        
        logger.info("=== Daily Jobs Complete ===")
        
        client.close()
        
    except Exception as e:
        logger.error(f"Error running daily jobs: {e}")


if __name__ == "__main__":
    # Run daily jobs
    asyncio.run(run_daily_jobs())
