"""
War System Service
Handles war declaration, AI event generation, and war resolution.
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
import json
from dotenv import load_dotenv
from grok_client import LlmChat, UserMessage

from models import (
    War, WarEvent, WarStatus, CasusBelli, PeaceTerms,
    Nation
)

load_dotenv()

logger = logging.getLogger(__name__)

# Get API key - use XAI_API_KEY for Grok, fallback to EMERGENT_LLM_KEY
XAI_API_KEY = os.environ.get('XAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')

class WarService:
    """Service for managing wars between nations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def declare_war(
        self,
        attacker_id: str,
        defender_id: str,
        casus_belli: CasusBelli
    ) -> Tuple[bool, str, Optional[War]]:
        """Declare war on another nation."""
        try:
            from bson import ObjectId
            
            # Get both nations
            attacker = await self.db.nations.find_one({"_id": ObjectId(attacker_id)})
            defender = await self.db.nations.find_one({"_id": ObjectId(defender_id)})
            
            if not attacker or not defender:
                return False, "Nation not found", None
            
            # Check that both nations are in the same world
            attacker_world = attacker.get("world_id")
            defender_world = defender.get("world_id")
            if attacker_world != defender_world:
                return False, "Cannot declare war on a nation in a different world", None
            
            # Check if already at war (with anyone)
            attacker_existing_war = await self.db.wars.find_one({
                "$or": [
                    {"attacker_id": attacker_id, "status": WarStatus.ACTIVE},
                    {"defender_id": attacker_id, "status": WarStatus.ACTIVE}
                ]
            })
            
            if attacker_existing_war:
                return False, f"You are already at war. Nations can only participate in one war at a time.", None
            
            # Check if defender is already at war
            defender_existing_war = await self.db.wars.find_one({
                "$or": [
                    {"attacker_id": defender_id, "status": WarStatus.ACTIVE},
                    {"defender_id": defender_id, "status": WarStatus.ACTIVE}
                ]
            })
            
            if defender_existing_war:
                return False, f"{defender['name']} is already at war with another nation. Wait for their current conflict to end.", None
            
            # Check truce status - cannot declare war if paying/receiving tribute
            attacker_tribute = attacker.get("paying_tribute_to")
            defender_tribute = defender.get("paying_tribute_to")
            
            if attacker_tribute == defender_id:
                return False, f"Cannot declare war on {defender['name']} - you are currently paying tribute (truce in effect)", None
            
            if defender_tribute == attacker_id:
                return False, f"Cannot declare war on {defender['name']} - they are currently paying tribute to you (truce in effect)", None
            
            # Check if either is paying tribute to the other (reverse check)
            attacker_receiving = await self.db.nations.find_one({
                "_id": {"$ne": ObjectId(attacker_id)},
                "paying_tribute_to": attacker_id
            })
            defender_receiving = await self.db.nations.find_one({
                "_id": {"$ne": ObjectId(defender_id)},
                "paying_tribute_to": defender_id
            })
            
            if attacker_receiving and str(attacker_receiving["_id"]) == defender_id:
                return False, f"Cannot declare war on {defender['name']} - truce is in effect due to ongoing tribute", None
            
            if defender_receiving and str(defender_receiving["_id"]) == attacker_id:
                return False, f"Cannot declare war on {defender['name']} - truce is in effect due to ongoing tribute", None
            
            # Check non-aggression pact - cannot declare war on someone you have a pact with
            existing_pact = await self.db.alliances.find_one({
                "is_active": True,
                "$or": [
                    {"nation1_id": attacker_id, "nation2_id": defender_id},
                    {"nation1_id": defender_id, "nation2_id": attacker_id}
                ]
            })
            if existing_pact:
                return False, f"Cannot declare war on {defender['name']} - you have a Non-Aggression Pact with them. Break the pact first.", None
            
            # Check if target is in same faction - cannot declare war on faction members
            attacker_faction = await self.db.multi_alliances.find_one({
                "$or": [
                    {"members.nation_id": attacker_id},
                    {"vassals.nation_id": attacker_id}
                ],
                "is_active": True
            })
            if attacker_faction:
                # Check if defender is in the same faction
                defender_in_faction = any(
                    m.get("nation_id") == defender_id 
                    for m in attacker_faction.get("members", []) + attacker_faction.get("vassals", [])
                )
                if defender_in_faction:
                    return False, f"Cannot declare war on {defender['name']} - they are in your faction!", None
            
            # Check vassal war restrictions
            # If defender is a vassal, only unfactioned players and other vassals can declare war
            defender_alliance = await self.db.multi_alliances.find_one({
                "vassals.nation_id": defender_id,
                "is_active": True
            })
            
            if defender_alliance:
                # Defender is a vassal - check if attacker is allowed to attack
                attacker_alliance = await self.db.multi_alliances.find_one({
                    "$or": [
                        {"members.nation_id": attacker_id},
                        {"vassals.nation_id": attacker_id}
                    ],
                    "is_active": True
                })
                
                if attacker_alliance:
                    # Attacker is in a faction - check if they're a vassal
                    is_attacker_vassal = any(v.get("nation_id") == attacker_id for v in attacker_alliance.get("vassals", []))
                    
                    if not is_attacker_vassal:
                        # Attacker is a full member - cannot attack vassals
                        return False, f"Cannot declare war on {defender['name']} - they are a vassal. Only unfactioned nations and other vassals can declare war on vassals.", None
            
            # Check if either nation is a vassal - if so, mark as vassal war (1v1 only)
            attacker_is_vassal = await self.db.multi_alliances.find_one({
                "vassals.nation_id": attacker_id,
                "is_active": True
            }) is not None
            
            defender_is_vassal = defender_alliance is not None  # Already checked above
            
            is_vassal_war = attacker_is_vassal or defender_is_vassal
            
            # Create war
            war = War(
                attacker_id=attacker_id,
                attacker_name=attacker["name"],
                attacker_race=attacker.get("race", "human"),
                attacker_government=attacker.get("government_type", "Unknown"),
                attacker_flag=attacker.get("flag_base64"),
                
                defender_id=defender_id,
                defender_name=defender["name"],
                defender_race=defender.get("race", "human"),
                defender_government=defender.get("government_type", "Unknown"),
                defender_flag=defender.get("flag_base64"),
                
                world_id=attacker_world,  # Store which world this war is in
                
                casus_belli=casus_belli,
                status=WarStatus.ACTIVE,
                war_score=0,
                day=0,
                is_vassal_war=is_vassal_war,  # Mark if either participant is a vassal
                started_at=datetime.utcnow()
            )
            
            result = await self.db.wars.insert_one(war.dict())
            war_dict = war.dict()
            war_dict["_id"] = str(result.inserted_id)
            
            # Apply reputation penalty
            from alliance_service import AllianceService
            alliance_service = AllianceService(self.db)
            
            rep_penalty = 0
            if casus_belli == CasusBelli.AGGRESSIVE_EXPANSION:
                rep_penalty = -20
            elif casus_belli == CasusBelli.RESOURCE_COMPETITION:
                rep_penalty = -10
            elif casus_belli == CasusBelli.IDEOLOGICAL_CONFLICT:
                rep_penalty = -5
            elif casus_belli == CasusBelli.DEFENSIVE_WAR:
                rep_penalty = 5  # Bonus for defensive war
            
            if rep_penalty != 0:
                await alliance_service.add_reputation_event(
                    attacker_id, attacker["name"], "war_declared",
                    related_nation_id=defender_id,
                    related_nation_name=defender["name"]
                )
            
            # Post to news feed with better formatting
            casus_belli_text = {
                CasusBelli.IDEOLOGICAL_CONFLICT: "ideological differences",
                CasusBelli.RESOURCE_COMPETITION: "resource competition",
                CasusBelli.AGGRESSIVE_EXPANSION: "aggressive expansion",
                CasusBelli.DEFENSIVE_WAR: "defensive measures",
                CasusBelli.ALLY_OBLIGATION: "alliance obligations"
            }.get(casus_belli, "undisclosed reasons")
            
            await self.post_to_news_feed(
                event_type="war_declared",
                title=f"⚔️ WAR: {attacker['name']} vs {defender['name']}",
                description=f"{attacker['name']} has declared war on {defender['name']} citing {casus_belli_text}. The world watches as tensions escalate into open conflict.",
                related_nations=[attacker_id, defender_id],
                war_id=str(result.inserted_id)
            )
            
            logger.info(f"War declared: {attacker['name']} vs {defender['name']} ({casus_belli})")
            return True, f"War declared on {defender['name']}", war_dict
            
        except Exception as e:
            logger.error(f"Error declaring war: {e}")
            return False, str(e), None
    
    async def get_nation_active_war(self, nation_id: str) -> Optional[Dict]:
        """Get nation's active war if any."""
        try:
            war = await self.db.wars.find_one({
                "$or": [
                    {"attacker_id": nation_id, "status": WarStatus.ACTIVE},
                    {"defender_id": nation_id, "status": WarStatus.ACTIVE},
                    {"attacker_allies": nation_id, "status": WarStatus.ACTIVE},
                    {"defender_allies": nation_id, "status": WarStatus.ACTIVE}
                ]
            })
            
            if war:
                war["_id"] = str(war["_id"])
            
            return war
            
        except Exception as e:
            logger.error(f"Error getting active war: {e}")
            return None

    async def can_be_called_to_war(self, nation_id: str) -> Tuple[bool, str]:
        """Check if a nation can be called into a war."""
        try:
            # Check if already in a war
            existing_war = await self.get_nation_active_war(nation_id)
            if existing_war:
                return False, "This nation is already involved in a war"
            
            # Check if paying/receiving tribute (truce)
            nation = await self.db.nations.find_one({"_id": ObjectId(nation_id)})
            if not nation:
                return False, "Nation not found"
            
            if nation.get("paying_tribute_to"):
                return False, "This nation is paying tribute (truce in effect)"
            
            # Check if anyone is paying tribute to this nation
            tribute_payer = await self.db.nations.find_one({"paying_tribute_to": nation_id})
            if tribute_payer:
                return False, "This nation has a truce (receiving tribute)"
            
            return True, "Can be called to war"
            
        except Exception as e:
            logger.error(f"Error checking call to war eligibility: {e}")
            return False, str(e)

    async def call_to_war(
        self, 
        caller_nation_id: str, 
        target_nation_id: str
    ) -> Tuple[bool, str]:
        """Send a war join request to a faction member."""
        try:
            # Get caller's active war
            war = await self.get_nation_active_war(caller_nation_id)
            if not war:
                return False, "You are not currently at war"
            
            war_id = str(war["_id"]) if isinstance(war.get("_id"), ObjectId) else war.get("_id")
            
            # Check if this is a vassal war (no allies allowed)
            if war.get("is_vassal_war"):
                return False, "Cannot call allies into a vassal war - these are 1v1 only"
            
            # Check if target can be called
            can_join, reason = await self.can_be_called_to_war(target_nation_id)
            if not can_join:
                return False, reason
            
            # Check if there's already a pending request
            existing_request = await self.db.war_join_requests.find_one({
                "war_id": war_id,
                "target_nation_id": target_nation_id,
                "status": "pending"
            })
            if existing_request:
                return False, "A war join request is already pending for this nation"
            
            # Check if caller and target are in the same faction
            caller_alliance = await self.db.multi_alliances.find_one({
                "$or": [
                    {"members.nation_id": caller_nation_id},
                    {"vassals.nation_id": caller_nation_id}
                ],
                "is_active": True
            })
            
            if not caller_alliance:
                return False, "You must be in a faction to call allies"
            
            # Only full members can be called (not vassals)
            target_is_member = any(
                m.get("nation_id") == target_nation_id 
                for m in caller_alliance.get("members", [])
            )
            
            if not target_is_member:
                return False, "You can only call full faction members to war (not vassals)"
            
            # Determine which side the caller is on and get enemy name
            if war["attacker_id"] == caller_nation_id or caller_nation_id in war.get("attacker_allies", []):
                side = "attacker"
                enemy_name = war["defender_name"]
                if target_nation_id in war.get("attacker_allies", []):
                    return False, "This nation is already fighting on your side"
                if target_nation_id in war.get("defender_allies", []):
                    return False, "This nation is fighting for the enemy!"
            elif war["defender_id"] == caller_nation_id or caller_nation_id in war.get("defender_allies", []):
                side = "defender"
                enemy_name = war["attacker_name"]
                if target_nation_id in war.get("defender_allies", []):
                    return False, "This nation is already fighting on your side"
                if target_nation_id in war.get("attacker_allies", []):
                    return False, "This nation is fighting for the enemy!"
            else:
                return False, "You are not a primary participant in this war"
            
            # Get nation names
            caller_nation = await self.db.nations.find_one({"_id": ObjectId(caller_nation_id)})
            target_nation = await self.db.nations.find_one({"_id": ObjectId(target_nation_id)})
            
            if not caller_nation or not target_nation:
                return False, "Nation not found"
            
            # Create the war join request
            request = {
                "war_id": war_id,
                "caller_nation_id": caller_nation_id,
                "caller_nation_name": caller_nation["name"],
                "target_nation_id": target_nation_id,
                "target_nation_name": target_nation["name"],
                "side": side,
                "enemy_nation_name": enemy_name,
                "status": "pending",
                "created_at": datetime.utcnow()
            }
            
            await self.db.war_join_requests.insert_one(request)
            
            logger.info(f"War join request sent from {caller_nation['name']} to {target_nation['name']}")
            return True, f"War join request sent to {target_nation['name']}"
            
        except Exception as e:
            logger.error(f"Error sending war join request: {e}")
            return False, str(e)

    async def get_war_join_requests(self, nation_id: str) -> List[Dict]:
        """Get pending war join requests for a nation."""
        try:
            cursor = self.db.war_join_requests.find({
                "target_nation_id": nation_id,
                "status": "pending"
            }).sort("created_at", -1)
            
            requests = await cursor.to_list(length=20)
            for r in requests:
                r["_id"] = str(r["_id"])
                r["id"] = str(r["_id"])
            
            return requests
        except Exception as e:
            logger.error(f"Error getting war join requests: {e}")
            return []

    async def respond_to_war_join_request(
        self,
        request_id: str,
        nation_id: str,
        accept: bool
    ) -> Tuple[bool, str]:
        """Accept or reject a war join request."""
        try:
            request = await self.db.war_join_requests.find_one({"_id": ObjectId(request_id)})
            if not request:
                return False, "Request not found"
            
            if request["target_nation_id"] != nation_id:
                return False, "This request is not for your nation"
            
            if request["status"] != "pending":
                return False, "Request already handled"
            
            # Update request status
            await self.db.war_join_requests.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {
                    "status": "accepted" if accept else "rejected",
                    "responded_at": datetime.utcnow()
                }}
            )
            
            if accept:
                # Add nation to the war
                war = await self.db.wars.find_one({"_id": ObjectId(request["war_id"])})
                if not war:
                    return False, "War no longer exists"
                
                if war.get("status") != "active":
                    return False, "War has already ended"
                
                # Verify they can still join
                can_join, reason = await self.can_be_called_to_war(nation_id)
                if not can_join:
                    return False, reason
                
                # Add to appropriate side
                if request["side"] == "attacker":
                    await self.db.wars.update_one(
                        {"_id": ObjectId(request["war_id"])},
                        {"$addToSet": {"attacker_allies": nation_id}}
                    )
                else:
                    await self.db.wars.update_one(
                        {"_id": ObjectId(request["war_id"])},
                        {"$addToSet": {"defender_allies": nation_id}}
                    )
                
                # Get nation name
                nation = await self.db.nations.find_one({"_id": ObjectId(nation_id)})
                nation_name = nation["name"] if nation else "Unknown Nation"
                
                # Create global news post
                news_post = {
                    "type": "war_ally_joined",
                    "title": f"{nation_name} Joins the War!",
                    "content": f"{nation_name} has answered the call to arms and joined the war against {request['enemy_nation_name']}!",
                    "related_nation_id": nation_id,
                    "related_nation_name": nation_name,
                    "timestamp": datetime.utcnow(),
                    "is_global": True
                }
                await self.db.global_news.insert_one(news_post)
                
                # Cancel all other pending war join requests for this nation WITHOUT penalty
                # Since they can only be in one war at a time
                await self.db.war_join_requests.update_many(
                    {
                        "target_nation_id": nation_id,
                        "status": "pending",
                        "_id": {"$ne": ObjectId(request_id)}  # Don't update the one we just accepted
                    },
                    {"$set": {
                        "status": "auto_cancelled",
                        "responded_at": datetime.utcnow(),
                        "cancel_reason": "Joined another war"
                    }}
                )
                
                logger.info(f"{nation_name} accepted war join request and joined the war")
                
                # Create notification for the caller
                notification = {
                    "nation_id": request["caller_nation_id"],
                    "notification_type": "war_join_accepted",
                    "title": "War Call Accepted!",
                    "message": f"{nation_name} has answered your call to arms and joined the war!",
                    "related_nation_id": nation_id,
                    "related_nation_name": nation_name,
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                await self.db.notifications.insert_one(notification)
                
                return True, f"You have joined the war against {request['enemy_nation_name']}!"
            else:
                # Reputation penalty for rejecting
                from alliance_service import AllianceService
                alliance_service = AllianceService(self.db)
                
                nation = await self.db.nations.find_one({"_id": ObjectId(nation_id)})
                nation_name = nation["name"] if nation else "Unknown"
                
                await alliance_service.add_reputation_event(
                    nation_id,
                    nation_name,
                    "war_call_refused",
                    related_nation_id=request["caller_nation_id"],
                    related_nation_name=request["caller_nation_name"]
                )
                
                # Create notification for the caller
                notification = {
                    "nation_id": request["caller_nation_id"],
                    "notification_type": "war_join_declined",
                    "title": "War Call Declined",
                    "message": f"{nation_name} has declined your call to arms.",
                    "related_nation_id": nation_id,
                    "related_nation_name": nation_name,
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                await self.db.notifications.insert_one(notification)
                
                logger.info(f"{nation_name} rejected war join request (reputation penalty applied)")
                return True, "You have declined the call to war. Your reputation has been affected."
                
        except Exception as e:
            logger.error(f"Error responding to war join request: {e}")
            return False, str(e)

    async def get_war_participants(self, war_id: str) -> Dict:
        """Get all participants in a war with their details."""
        try:
            war = await self.db.wars.find_one({"_id": ObjectId(war_id)})
            if not war:
                return {}
            
            # Get all nation IDs
            attacker_ids = [war["attacker_id"]] + war.get("attacker_allies", [])
            defender_ids = [war["defender_id"]] + war.get("defender_allies", [])
            
            # Fetch all nations
            all_ids = [ObjectId(nid) for nid in attacker_ids + defender_ids]
            nations = await self.db.nations.find({"_id": {"$in": all_ids}}).to_list(length=20)
            nations_by_id = {str(n["_id"]): n for n in nations}
            
            # Build participant lists
            attackers = []
            for nid in attacker_ids:
                nation = nations_by_id.get(nid)
                if nation:
                    attackers.append({
                        "nation_id": nid,
                        "name": nation["name"],
                        "flag": nation.get("flag_base64"),
                        "race": nation.get("race", "human"),
                        "military_strength": nation.get("stats", {}).get("military_strength", 50),
                        "is_primary": nid == war["attacker_id"]
                    })
            
            defenders = []
            for nid in defender_ids:
                nation = nations_by_id.get(nid)
                if nation:
                    defenders.append({
                        "nation_id": nid,
                        "name": nation["name"],
                        "flag": nation.get("flag_base64"),
                        "race": nation.get("race", "human"),
                        "military_strength": nation.get("stats", {}).get("military_strength", 50),
                        "is_primary": nid == war["defender_id"]
                    })
            
            return {
                "attackers": attackers,
                "defenders": defenders,
                "total_attacker_strength": sum(a["military_strength"] for a in attackers),
                "total_defender_strength": sum(d["military_strength"] for d in defenders)
            }
            
        except Exception as e:
            logger.error(f"Error getting war participants: {e}")
            return {}
    
    def _get_military_advisor(self, nation: Dict) -> Optional[Dict]:
        """Get the military advisor from a nation."""
        advisors = nation.get("advisors", [])
        for advisor in advisors:
            title = advisor.get("title", "").lower()
            if any(keyword in title for keyword in ['marshal', 'defense', 'military', 'general', 'commander', 'admiral', 'war']):
                return advisor
        return None
    
    async def generate_war_event_with_ai(self, war: Dict) -> Optional[WarEvent]:
        """Generate a war event using AI."""
        try:
            # Get current stats for both nations
            from bson import ObjectId
            attacker = await self.db.nations.find_one({"_id": ObjectId(war["attacker_id"])})
            defender = await self.db.nations.find_one({"_id": ObjectId(war["defender_id"])})
            
            if not attacker or not defender:
                return None
            
            attacker_stats = attacker.get("stats", {})
            defender_stats = defender.get("stats", {})
            
            # Get military advisors for both sides
            attacker_advisor = self._get_military_advisor(attacker)
            defender_advisor = self._get_military_advisor(defender)
            
            # Calculate advisor bonuses (ability and approval both matter)
            attacker_advisor_bonus = 0
            if attacker_advisor:
                ability = attacker_advisor.get("ability", 50)
                approval = attacker_advisor.get("approval", 50)
                # Bonus is average of ability and approval, scaled to 0-20 range
                attacker_advisor_bonus = ((ability + approval) / 2) * 0.2
            
            defender_advisor_bonus = 0
            if defender_advisor:
                ability = defender_advisor.get("ability", 50)
                approval = defender_advisor.get("approval", 50)
                defender_advisor_bonus = ((ability + approval) / 2) * 0.2
            
            # Calculate combined military strength including allies
            attacker_ally_ids = war.get("attacker_allies", [])
            defender_ally_ids = war.get("defender_allies", [])
            
            attacker_ally_strength = 0
            attacker_ally_names = []
            for ally_id in attacker_ally_ids:
                ally = await self.db.nations.find_one({"_id": ObjectId(ally_id)})
                if ally:
                    attacker_ally_strength += ally.get("stats", {}).get("military_strength", 50)
                    attacker_ally_names.append(ally["name"])
            
            defender_ally_strength = 0
            defender_ally_names = []
            for ally_id in defender_ally_ids:
                ally = await self.db.nations.find_one({"_id": ObjectId(ally_id)})
                if ally:
                    defender_ally_strength += ally.get("stats", {}).get("military_strength", 50)
                    defender_ally_names.append(ally["name"])
            
            # Total military power = primary nation + allies + advisor bonus
            base_attacker_power = attacker_stats.get('military_strength', 50)
            base_defender_power = defender_stats.get('military_strength', 50)
            
            total_attacker_power = base_attacker_power + attacker_ally_strength + attacker_advisor_bonus
            total_defender_power = base_defender_power + defender_ally_strength + defender_advisor_bonus
            
            # Get last 3 events for context
            recent_events = war.get("events", [])[-3:]
            event_summaries = [f"Day {i+1}: {e.get('title', 'Unknown')}" for i, e in enumerate(recent_events)]
            
            # Determine who's winning
            war_score = war.get("war_score", 0)
            if war_score > 30:
                situation = f"Attacker ({war['attacker_name']}) has strong advantage"
            elif war_score > 10:
                situation = f"Attacker ({war['attacker_name']}) has slight advantage"
            elif war_score < -30:
                situation = f"Defender ({war['defender_name']}) has strong advantage"
            elif war_score < -10:
                situation = f"Defender ({war['defender_name']}) has slight advantage"
            else:
                situation = "Evenly matched, fierce fighting"
            
            # Build advisor info for prompt - use the advisor's NAME not title
            attacker_advisor_info = ""
            if attacker_advisor:
                advisor_name = attacker_advisor.get('name', 'Unknown')
                attacker_advisor_info = f"- Military Advisor: {advisor_name} (Ability: {attacker_advisor.get('ability', 50)}, Approval: {attacker_advisor.get('approval', 50)}%)"
            
            defender_advisor_info = ""
            if defender_advisor:
                advisor_name = defender_advisor.get('name', 'Unknown')
                defender_advisor_info = f"- Military Advisor: {advisor_name} (Ability: {defender_advisor.get('ability', 50)}, Approval: {defender_advisor.get('approval', 50)}%)"
            
            # Build ally info
            attacker_allies_info = ""
            if attacker_ally_names:
                attacker_allies_info = f"- Allies: {', '.join(attacker_ally_names)} (Combined ally strength: +{attacker_ally_strength})"
            
            defender_allies_info = ""
            if defender_ally_names:
                defender_allies_info = f"- Allies: {', '.join(defender_ally_names)} (Combined ally strength: +{defender_ally_strength})"
            
            prompt = f"""Generate a dramatic war event for a nation simulation game.

CONTEXT:
- Day {war.get('day', 0)} of war between {war['attacker_name']} and {war['defender_name']}
- Current situation: {situation}
- Casus Belli: {war.get('casus_belli', 'unknown')}

ATTACKER: {war['attacker_name']}
- Race: {war.get('attacker_race', 'human')}
- Government: {war.get('attacker_government', 'unknown')}
- Military Strength: {base_attacker_power}/100
{attacker_advisor_info}
{attacker_allies_info}
- TOTAL COMBINED POWER: {total_attacker_power:.1f}
- GDP: {attacker_stats.get('gdp', 50)}/100

DEFENDER: {war['defender_name']}
- Race: {war.get('defender_race', 'human')}
- Government: {war.get('defender_government', 'unknown')}
- Military Strength: {base_defender_power}/100
{defender_advisor_info}
{defender_allies_info}
- TOTAL COMBINED POWER: {total_defender_power:.1f}
- GDP: {defender_stats.get('gdp', 50)}/100

RECENT EVENTS:
{chr(10).join(event_summaries) if event_summaries else "First engagement"}

Generate a realistic war event that:
1. Reflects the TOTAL COMBINED military power difference (stronger coalition more likely to win)
2. Consider military advisor influence - skilled advisors lead to better tactics
3. If allies are involved, mention their contributions to the battle
3. Considers race-specific tactics and characteristics
4. Includes vivid tactical details
5. Has realistic casualties proportional to battle intensity
6. Is dramatic and engaging
7. May mention the advisor's tactical decisions if relevant

Output ONLY valid JSON (no markdown, no ```json tags):
{{
  "title": "Battle/Siege/Ambush name (3-6 words)",
  "description": "Vivid description of the event (100-200 words)",
  "war_score_change": -20 to +20 (positive favors attacker, weighted by power difference),
  "attacker_casualties": {{"military": -15, "population": -0.2}},
  "defender_casualties": {{"military": -10, "population": -0.15}},
  "stat_effects": {{
    "attacker": {{"happiness": -3}},
    "defender": {{"happiness": -5}}
  }}
}}"""
            
            # Create chat instance using Grok API
            chat = LlmChat(
                api_key=XAI_API_KEY,
                session_id=f"war_event_{war['_id']}_{datetime.utcnow().timestamp()}",
                system_message="You are a war event generator for a nation simulation game. Generate realistic, dramatic war events."
            )
            
            # Use GPT-4o
            chat.with_model("openai", "gpt-4o")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            event_data = response
            
            # Parse JSON
            import json
            event_json = json.loads(event_data)
            
            # Create WarEvent
            event = WarEvent(
                title=event_json.get("title", "Battle"),
                description=event_json.get("description", "A battle occurred."),
                war_score_change=event_json.get("war_score_change", 0),
                attacker_casualties=event_json.get("attacker_casualties", {}),
                defender_casualties=event_json.get("defender_casualties", {}),
                stat_effects=event_json.get("stat_effects", {}),
                date=datetime.utcnow()
            )
            
            logger.info(f"Generated war event: {event.title} (score: {event.war_score_change:+d})")
            return event
            
        except Exception as e:
            logger.error(f"Error generating war event: {e}")
            return None
    
    async def apply_war_event(self, war_id: str, event: WarEvent) -> bool:
        """Apply a war event's effects to the war and nations."""
        try:
            from bson import ObjectId
            
            # Get war
            war = await self.db.wars.find_one({"_id": ObjectId(war_id)})
            if not war:
                return False
            
            # Update war score
            new_score = war.get("war_score", 0) + event.war_score_change
            new_score = max(-100, min(100, new_score))  # Clamp to -100..100
            
            # Increment day
            new_day = war.get("day", 0) + 1
            
            # Add event to history
            events = war.get("events", [])
            events.append(event.dict())
            
            # Update war with last_battle_at timestamp
            await self.db.wars.update_one(
                {"_id": ObjectId(war_id)},
                {"$set": {
                    "war_score": new_score,
                    "day": new_day,
                    "events": events,
                    "last_battle_at": datetime.utcnow()
                }}
            )
            
            # Apply casualties to nations
            # Attacker casualties
            if event.attacker_casualties:
                attacker_inc_updates = {}
                for stat, change in event.attacker_casualties.items():
                    if stat == "population":
                        # Population change is a percentage, handle separately
                        attacker = await self.db.nations.find_one({"_id": ObjectId(war["attacker_id"])})
                        if attacker:
                            current_pop = attacker.get("stats", {}).get("population", 1000000)
                            # Change is negative percentage like -0.2 means -0.2% loss
                            new_pop = current_pop * (1 + (change / 100))
                            await self.db.nations.update_one(
                                {"_id": ObjectId(war["attacker_id"])},
                                {"$set": {"stats.population": max(100000, new_pop)}}
                            )
                    else:
                        attacker_inc_updates[f"stats.{stat}"] = change
                
                if attacker_inc_updates:
                    await self.db.nations.update_one(
                        {"_id": ObjectId(war["attacker_id"])},
                        {"$inc": attacker_inc_updates}
                    )
            
            # Defender casualties
            if event.defender_casualties:
                defender_inc_updates = {}
                for stat, change in event.defender_casualties.items():
                    if stat == "population":
                        # Population change is a percentage
                        defender = await self.db.nations.find_one({"_id": ObjectId(war["defender_id"])})
                        if defender:
                            current_pop = defender.get("stats", {}).get("population", 1000000)
                            new_pop = current_pop * (1 + (change / 100))
                            await self.db.nations.update_one(
                                {"_id": ObjectId(war["defender_id"])},
                                {"$set": {"stats.population": max(100000, new_pop)}}
                            )
                    else:
                        defender_inc_updates[f"stats.{stat}"] = change
                
                if defender_inc_updates:
                    await self.db.nations.update_one(
                        {"_id": ObjectId(war["defender_id"])},
                        {"$inc": defender_inc_updates}
                    )
            
            # Apply stat effects
            for side, effects in event.stat_effects.items():
                nation_id = war[f"{side}_id"]
                stat_updates = {f"stats.{k}": v for k, v in effects.items()}
                if stat_updates:
                    await self.db.nations.update_one(
                        {"_id": ObjectId(nation_id)},
                        {"$inc": stat_updates}
                    )
            
            # Send battle notifications to all war participants
            all_participants = [war["attacker_id"], war["defender_id"]]
            all_participants.extend(war.get("attacker_allies", []))
            all_participants.extend(war.get("defender_allies", []))
            
            for participant_id in all_participants:
                try:
                    # Determine if this participant is on attacker or defender side
                    is_attacker_side = (participant_id == war["attacker_id"] or 
                                       participant_id in war.get("attacker_allies", []))
                    
                    if event.war_score_change > 0:
                        outcome = "victory" if is_attacker_side else "defeat"
                    elif event.war_score_change < 0:
                        outcome = "defeat" if is_attacker_side else "victory"
                    else:
                        outcome = "stalemate"
                    
                    notification = {
                        "nation_id": participant_id,
                        "type": "war_battle",
                        "message": f"⚔️ Battle Report: {event.title} - {outcome.capitalize()}! War score is now {new_score:+d}",
                        "is_read": False,
                        "created_at": datetime.utcnow(),
                        "war_id": str(war["_id"])
                    }
                    await self.db.notifications.insert_one(notification)
                except Exception as notif_error:
                    logger.error(f"Error sending battle notification to {participant_id}: {notif_error}")
            
            # Post war event to news feed
            await self.post_to_news_feed(
                event_type="war_battle",
                title=f"⚔️ {event.title}",
                description=f"Day {new_day} of war between {war['attacker_name']} and {war['defender_name']}: {event.description[:200]}...",
                related_nations=[war["attacker_id"], war["defender_id"]],
                war_id=str(war["_id"])
            )
            
            # Check if war should end
            if abs(new_score) >= 80 or new_day >= 30:
                await self.end_war(war_id, new_score)
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying war event: {e}")
            return False
    
    async def end_war(self, war_id: str, final_score: int) -> bool:
        """End a war and apply consequences."""
        try:
            from bson import ObjectId
            
            war = await self.db.wars.find_one({"_id": ObjectId(war_id)})
            if not war:
                return False
            
            # Determine winner and severity
            if final_score >= 80:
                winner_id = war["attacker_id"]
                loser_id = war["defender_id"]
                severity = "decisive"
            elif final_score >= 50:
                winner_id = war["attacker_id"]
                loser_id = war["defender_id"]
                severity = "victory"
            elif final_score <= -80:
                winner_id = war["defender_id"]
                loser_id = war["attacker_id"]
                severity = "decisive"
            elif final_score <= -50:
                winner_id = war["defender_id"]
                loser_id = war["attacker_id"]
                severity = "victory"
            else:
                # Stalemate
                winner_id = None
                loser_id = None
                severity = "stalemate"
            
            # Calculate peace terms
            peace_terms = None
            if winner_id:
                if severity == "decisive":
                    peace_terms = PeaceTerms(
                        resource_tribute_percentage=40,
                        resource_tribute_duration_months=18,
                        gdp_reparations_percentage=20,
                        gdp_reparations_duration_months=24
                    )
                elif severity == "victory":
                    peace_terms = PeaceTerms(
                        resource_tribute_percentage=30,
                        resource_tribute_duration_months=12,
                        gdp_reparations_percentage=15,
                        gdp_reparations_duration_months=18
                    )
                
                # Apply consequences
                await self._apply_war_consequences(
                    winner_id=winner_id,
                    loser_id=loser_id,
                    severity=severity,
                    peace_terms=peace_terms
                )
            
            # Update war status
            await self.db.wars.update_one(
                {"_id": ObjectId(war_id)},
                {"$set": {
                    "status": WarStatus.ENDED,
                    "winner_id": winner_id,
                    "peace_terms": peace_terms.dict() if peace_terms else None,
                    "ended_at": datetime.utcnow()
                }}
            )
            
            # Post war end to news feed
            if winner_id:
                winner_name = war["attacker_name"] if winner_id == war["attacker_id"] else war["defender_name"]
                loser_name = war["defender_name"] if winner_id == war["attacker_id"] else war["attacker_name"]
                
                await self.post_to_news_feed(
                    event_type="war_ended",
                    title=f"War Concluded: {winner_name} Victorious",
                    description=f"The war between {war['attacker_name']} and {war['defender_name']} has ended with a {severity} victory for {winner_name}. Peace terms have been imposed on {loser_name}.",
                    related_nations=[war["attacker_id"], war["defender_id"]],
                    war_id=war_id
                )
            else:
                await self.post_to_news_feed(
                    event_type="war_ended",
                    title="War Ends in Stalemate",
                    description=f"The war between {war['attacker_name']} and {war['defender_name']} has ended in a stalemate with no clear victor. Both nations agree to cease hostilities.",
                    related_nations=[war["attacker_id"], war["defender_id"]],
                    war_id=war_id
                )
            
            # Post war end to news feed (second notification with emoji)
            if winner_id:
                winner_name = war["attacker_name"] if winner_id == war["attacker_id"] else war["defender_name"]
                loser_name = war["defender_name"] if winner_id == war["attacker_id"] else war["attacker_name"]
                
                severity_text = "decisive" if severity == "decisive" else ""
                await self.post_to_news_feed(
                    event_type="war_ended",
                    title=f"🏆 WAR CONCLUDED: {winner_name} Victorious!",
                    description=f"After {war.get('day', 0)} days of conflict, {winner_name} has achieved a {severity_text} victory over {loser_name}. Peace terms include tribute payments and economic reparations.",
                    related_nations=[war["attacker_id"], war["defender_id"]],
                    war_id=war_id
                )
            else:
                await self.post_to_news_feed(
                    event_type="war_ended",
                    title=f"⚪ STALEMATE: {war['attacker_name']} vs {war['defender_name']}",
                    description=f"After {war.get('day', 0)} days of inconclusive fighting, both nations have agreed to white peace. No territory or resources change hands.",
                    related_nations=[war["attacker_id"], war["defender_id"]],
                    war_id=war_id
                )
            
            logger.info(f"War ended: {war['attacker_name']} vs {war['defender_name']}, Winner: {winner_id or 'stalemate'}")
            return True
            
        except Exception as e:
            logger.error(f"Error ending war: {e}")
            return False
    
    async def _apply_war_consequences(
        self,
        winner_id: str,
        loser_id: str,
        severity: str,
        peace_terms: Optional[PeaceTerms]
    ):
        """Apply stat penalties and rewards after war."""
        try:
            from bson import ObjectId
            
            # Loser penalties
            if severity == "decisive":
                loser_penalties = {
                    "stats.gdp": -25,
                    "stats.economy_growth": -8,
                    "stats.unemployment": 20,
                    "stats.inflation": 15,
                    "stats.national_debt": 30,
                    "stats.military_strength": -40,
                    "stats.happiness": -30,
                    "stats.crime_rate": 20,
                    "stats.political_freedom": -10,
                    "stats.corruption": 15
                }
                # Population loss percentage
                await self.db.nations.update_one(
                    {"_id": ObjectId(loser_id)},
                    [{"$set": {
                        "stats.population": {"$multiply": ["$stats.population", 0.85]}  # -15%
                    }}]
                )
            else:  # victory
                loser_penalties = {
                    "stats.gdp": -20,
                    "stats.economy_growth": -6,
                    "stats.unemployment": 15,
                    "stats.inflation": 12,
                    "stats.national_debt": 25,
                    "stats.military_strength": -30,
                    "stats.happiness": -25,
                    "stats.crime_rate": 15,
                    "stats.political_freedom": -8,
                    "stats.corruption": 12
                }
                await self.db.nations.update_one(
                    {"_id": ObjectId(loser_id)},
                    [{"$set": {
                        "stats.population": {"$multiply": ["$stats.population", 0.90]}  # -10%
                    }}]
                )
            
            await self.db.nations.update_one(
                {"_id": ObjectId(loser_id)},
                {"$inc": loser_penalties}
            )
            
            # Winner rewards (but costs too)
            winner_rewards = {
                "stats.gdp": 10,
                "stats.economy_growth": 3,
                "stats.military_strength": -15,  # Casualties
                "stats.happiness": -10,  # War exhaustion
                "stats.budget_defense": 10  # War debt
            }
            
            await self.db.nations.update_one(
                {"_id": ObjectId(winner_id)},
                {"$inc": winner_rewards}
            )
            
            # Store peace terms for monthly processing
            if peace_terms:
                await self.db.nations.update_one(
                    {"_id": ObjectId(loser_id)},
                    {"$set": {
                        "paying_tribute_to": winner_id,
                        "tribute_terms": peace_terms.dict()
                    }}
                )
            
            logger.info(f"War consequences applied: severity={severity}")
            
        except Exception as e:
            logger.error(f"Error applying war consequences: {e}")


    async def post_to_news_feed(
        self,
        event_type: str,
        title: str,
        description: str,
        related_nations: List[str] = [],
        war_id: str = None
    ):
        """Post a war event to the global news feed."""
        try:
            feed_entry = {
                "event_type": event_type,
                "title": title,
                "description": description,
                "related_nations": related_nations,
                "timestamp": datetime.utcnow(),
                "is_war_event": True,
                "war_id": war_id
            }
            
            await self.db.decision_feed.insert_one(feed_entry)
            logger.info(f"Posted to news feed: {title}")
            
        except Exception as e:
            logger.error(f"Error posting to news feed: {e}")
