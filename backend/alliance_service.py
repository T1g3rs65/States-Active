"""
Alliance Service - Multi-Nation Alliance Governance & Reputation System
Handles creation, management, and tracking of alliances and nation reputation.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from bson import ObjectId
import logging

from models import (
    MultiAlliance, AllianceMember, AllianceRole, AllianceInvite, 
    AllianceJoinRequest, AllianceStatus, ReputationEvent, NationReputation
)

logger = logging.getLogger(__name__)

# ============== Reputation Constants ==============
REPUTATION_EVENTS = {
    "alliance_formed": {"change": 5, "desc": "Formed an alliance"},
    "alliance_joined": {"change": 3, "desc": "Joined an alliance"},
    "alliance_left_gracefully": {"change": -2, "desc": "Left an alliance"},
    "alliance_broken": {"change": -15, "desc": "Broke an alliance"},
    "alliance_kicked": {"change": -10, "desc": "Was kicked from alliance"},
    "alliance_honored_30d": {"change": 10, "desc": "Honored alliance for 30+ days"},
    "alliance_honored_90d": {"change": 20, "desc": "Honored alliance for 90+ days"},
    "betrayal": {"change": -25, "desc": "Betrayed an ally"},
    "helped_ally": {"change": 5, "desc": "Assisted an ally"},
    "war_declared": {"change": -5, "desc": "Declared war"},
    "peace_treaty": {"change": 8, "desc": "Signed peace treaty"},
    "vote_praised": {"change": 2, "desc": "Received international praise"},
    "vote_condemned": {"change": -3, "desc": "Received international condemnation"},
}


class AllianceService:
    """Service for managing multi-nation alliances."""
    
    def __init__(self, db):
        self.db = db
    
    # ============== Vassal System Helpers ==============
    
    def get_available_vassal_slots(self, alliance: Dict) -> int:
        """Calculate available vassal slots based on member count."""
        member_count = len(alliance.get("members", []))
        
        # Unlock schedule: 1 slot at 3 members, 2 at 7, 3 at 10
        if member_count >= 10:
            max_slots = 3
        elif member_count >= 7:
            max_slots = 2
        elif member_count >= 3:
            max_slots = 1
        else:
            max_slots = 0
        
        current_vassals = len(alliance.get("vassals", []))
        return max(0, max_slots - current_vassals)
    
    def is_eligible_for_vassal(self, nation_population: float) -> bool:
        """Check if a nation is eligible to be a vassal (under 500k)."""
        # Population is stored in thousands, so 500k = 500
        return nation_population < 500
    
    async def try_promote_vassal(self, alliance_id: str, vassal: Dict) -> bool:
        """Try to promote a vassal to member if they're above 500k and slot available."""
        try:
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False
            
            # Get nation data
            nation = await self.db.nations.find_one({"_id": ObjectId(vassal["nation_id"])})
            if not nation:
                return False
            
            population = nation.get("stats", {}).get("population", 0)
            
            # Check if above 500k and member slot available
            if population >= 500:
                member_count = len(alliance.get("members", []))
                if member_count < 10:  # Hardcap
                    # Promote to member
                    vassal["role"] = AllianceRole.MEMBER
                    
                    # Move from vassals to members
                    await self.db.multi_alliances.update_one(
                        {"_id": ObjectId(alliance_id)},
                        {
                            "$pull": {"vassals": {"nation_id": vassal["nation_id"]}},
                            "$push": {"members": vassal}
                        }
                    )
                    
                    logger.info(f"Promoted vassal {vassal['nation_name']} to member in {alliance['name']}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error promoting vassal: {e}")
            return False
    
    async def break_pacts_with_faction_members(self, nation_id: str, faction_id: str) -> int:
        """
        Break all 1-on-1 pacts between a nation and other members of the same faction.
        This happens automatically when joining a faction, with no reputation penalty.
        
        Returns the number of pacts broken.
        """
        try:
            # Get all faction members (both from members and vassals lists)
            faction = await self.db.multi_alliances.find_one({"_id": ObjectId(faction_id)})
            if not faction:
                return 0
            
            faction_member_ids = set()
            for member in faction.get("members", []):
                faction_member_ids.add(member["nation_id"])
            for vassal in faction.get("vassals", []):
                faction_member_ids.add(vassal["nation_id"])
            
            # Remove the nation itself from the set
            faction_member_ids.discard(nation_id)
            
            if not faction_member_ids:
                return 0
            
            # Find all active pacts between the joining nation and faction members
            pacts_to_break = await self.db.alliances.find({
                "is_active": True,
                "$or": [
                    {"nation1_id": nation_id, "nation2_id": {"$in": list(faction_member_ids)}},
                    {"nation2_id": nation_id, "nation1_id": {"$in": list(faction_member_ids)}}
                ]
            }).to_list(length=100)
            
            if not pacts_to_break:
                return 0
            
            # Break all these pacts (no reputation penalty - faction membership supersedes pacts)
            pact_ids = [pact["_id"] for pact in pacts_to_break]
            await self.db.alliances.update_many(
                {"_id": {"$in": pact_ids}},
                {"$set": {
                    "is_active": False, 
                    "broken_at": datetime.utcnow(),
                    "broken_reason": "faction_membership"  # Special reason - no penalty
                }}
            )
            
            logger.info(f"Auto-broke {len(pacts_to_break)} pacts for nation {nation_id} joining faction {faction['name']}")
            return len(pacts_to_break)
            
        except Exception as e:
            logger.error(f"Error breaking pacts with faction members: {e}")
            return 0
    
    # ============== Alliance Creation & Management ==============
    
    async def create_alliance(
        self,
        founder_nation_id: str,
        founder_nation_name: str,
        founder_nation_flag: Optional[str],
        founder_race: str,
        name: str,
        tag: str,
        description: str = "",
        motto: str = "",
        color: str = "#3B82F6",
        is_public: bool = True,
        requires_approval: bool = True
    ) -> Tuple[bool, str, Optional[Dict]]:
        """Create a new multi-nation alliance."""
        try:
            # Validate tag (3-5 uppercase letters)
            tag = tag.upper().strip()
            if len(tag) < 2 or len(tag) > 6:
                return False, "Tag must be 2-6 characters", None
            
            # Get founder nation to get world_id
            founder_nation = await self.db.nations.find_one({"_id": ObjectId(founder_nation_id)})
            if not founder_nation:
                return False, "Nation not found", None
            
            world_id = founder_nation.get("world_id")
            
            # Check if tag is already taken in the same world
            tag_query = {"tag": tag, "is_active": True}
            if world_id:
                tag_query["world_id"] = world_id
            existing = await self.db.multi_alliances.find_one(tag_query)
            if existing:
                return False, f"Tag '{tag}' is already taken in this world", None
            
            # Check if nation is already in an alliance in this world
            membership_query = {"members.nation_id": founder_nation_id, "is_active": True}
            if world_id:
                membership_query["world_id"] = world_id
            existing_membership = await self.db.multi_alliances.find_one(membership_query)
            if existing_membership:
                return False, "You are already in an alliance. Leave it first.", None
            
            # Create founder member
            founder_member = AllianceMember(
                nation_id=founder_nation_id,
                nation_name=founder_nation_name,
                nation_flag=founder_nation_flag,
                race=founder_race,
                role=AllianceRole.FOUNDER,
                joined_at=datetime.utcnow(),
                contribution_score=0
            )
            
            # Create alliance with world_id
            alliance = MultiAlliance(
                name=name,
                tag=tag,
                description=description,
                motto=motto,
                color=color,
                world_id=world_id,  # Set world_id from founder
                members=[founder_member],
                is_public=is_public,
                requires_approval=requires_approval,
                created_at=datetime.utcnow()
            )
            
            # Save to database
            alliance_dict = alliance.dict()
            result = await self.db.multi_alliances.insert_one(alliance_dict)
            alliance_dict["id"] = str(result.inserted_id)
            alliance_dict["_id"] = str(result.inserted_id)
            
            # Convert datetime objects to strings for JSON serialization
            for member in alliance_dict.get("members", []):
                if hasattr(member.get("joined_at"), "isoformat"):
                    member["joined_at"] = member["joined_at"].isoformat()
            if hasattr(alliance_dict.get("created_at"), "isoformat"):
                alliance_dict["created_at"] = alliance_dict["created_at"].isoformat()
            
            # Add reputation event
            await self.add_reputation_event(
                founder_nation_id, 
                founder_nation_name,
                "alliance_formed",
                related_alliance_id=str(result.inserted_id),
                related_alliance_name=name
            )
            
            logger.info(f"Alliance '{name}' [{tag}] created by {founder_nation_name}")
            return True, f"Alliance '{name}' created successfully!", alliance_dict
            
        except Exception as e:
            logger.error(f"Error creating alliance: {e}")
            return False, str(e), None
    
    async def get_alliance(self, alliance_id: str) -> Optional[Dict]:
        """Get alliance by ID."""
        try:
            alliance = await self.db.multi_alliances.find_one({"_id": ObjectId(alliance_id)})
            if alliance:
                alliance["id"] = str(alliance["_id"])
                alliance["_id"] = str(alliance["_id"])
            return alliance
        except Exception as e:
            logger.error(f"Error getting alliance: {e}")
            return None
    
    async def get_public_alliances(self, limit: int = 50, world_id: Optional[str] = None) -> List[Dict]:
        """Get list of public alliances for browser, filtered by world."""
        try:
            query = {
                "is_public": True,
                "is_active": True
            }
            if world_id:
                query["world_id"] = world_id
            
            cursor = self.db.multi_alliances.find(query).sort("created_at", -1).limit(limit)
            
            alliances = await cursor.to_list(length=limit)
            for a in alliances:
                a["id"] = str(a["_id"])
                a["_id"] = str(a["_id"])
                a["member_count"] = len(a.get("members", []))
            
            return alliances
        except Exception as e:
            logger.error(f"Error getting public alliances: {e}")
            return []
    
    async def get_nation_alliance(self, nation_id: str) -> Optional[Dict]:
        """Get the alliance a nation belongs to (as member or vassal)."""
        try:
            # Check both members and vassals lists
            alliance = await self.db.multi_alliances.find_one({
                "$or": [
                    {"members.nation_id": nation_id},
                    {"vassals.nation_id": nation_id}
                ],
                "is_active": True
            })
            if alliance:
                alliance["id"] = str(alliance["_id"])
                alliance["_id"] = str(alliance["_id"])
            return alliance
        except Exception as e:
            logger.error(f"Error getting nation alliance: {e}")
            return None
    
    async def get_member_role(self, alliance_id: str, nation_id: str) -> Optional[str]:
        """Get a nation's role in an alliance (member or vassal)."""
        alliance = await self.get_alliance(alliance_id)
        if not alliance:
            return None
        
        for member in alliance.get("members", []):
            if member.get("nation_id") == nation_id:
                return member.get("role")
        
        # Also check vassals
        for vassal in alliance.get("vassals", []):
            if vassal.get("nation_id") == nation_id:
                return vassal.get("role", "vassal")
        
        return None
    
    def can_manage_members(self, role: str) -> bool:
        """Check if role has permission to invite/kick members."""
        return role in [AllianceRole.FOUNDER.value, AllianceRole.LEADER.value, AllianceRole.OFFICER.value]
    
    def can_kick(self, role: str) -> bool:
        """Check if role has permission to kick members."""
        return role in [AllianceRole.FOUNDER.value, AllianceRole.LEADER.value]
    
    def can_promote(self, role: str) -> bool:
        """Check if role has permission to promote/demote."""
        return role in [AllianceRole.FOUNDER.value, AllianceRole.LEADER.value]
    
    # ============== Invitations & Join Requests ==============
    
    async def invite_to_alliance(
        self,
        alliance_id: str,
        inviter_nation_id: str,
        inviter_nation_name: str,
        to_nation_id: str,
        to_nation_name: str,
        message: str = ""
    ) -> Tuple[bool, str]:
        """Invite a nation to join the alliance."""
        try:
            # Check inviter's role
            role = await self.get_member_role(alliance_id, inviter_nation_id)
            if not role or not self.can_manage_members(role):
                return False, "You don't have permission to invite members"
            
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found"
            
            # Check if already a member
            for member in alliance.get("members", []):
                if member.get("nation_id") == to_nation_id:
                    return False, "Nation is already a member"
            
            # Check if target is in another alliance
            existing = await self.get_nation_alliance(to_nation_id)
            if existing:
                return False, "That nation is already in an alliance"
            
            # Check for existing pending invite
            existing_invite = await self.db.alliance_invites.find_one({
                "alliance_id": alliance_id,
                "to_nation_id": to_nation_id,
                "status": "pending"
            })
            if existing_invite:
                return False, "An invitation is already pending"
            
            # Create invite
            invite = AllianceInvite(
                alliance_id=alliance_id,
                alliance_name=alliance["name"],
                invited_by_nation_id=inviter_nation_id,
                invited_by_nation_name=inviter_nation_name,
                to_nation_id=to_nation_id,
                to_nation_name=to_nation_name,
                message=message,
                status=AllianceStatus.PENDING,
                created_at=datetime.utcnow()
            )
            
            await self.db.alliance_invites.insert_one(invite.dict())
            logger.info(f"Invitation sent from {inviter_nation_name} to {to_nation_name} for alliance {alliance['name']}")
            return True, f"Invitation sent to {to_nation_name}"
            
        except Exception as e:
            logger.error(f"Error inviting to alliance: {e}")
            return False, str(e)
    
    async def respond_to_invite(
        self,
        invite_id: str,
        nation_id: str,
        nation_name: str,
        nation_flag: Optional[str],
        race: str,
        accept: bool
    ) -> Tuple[bool, str]:
        """Accept or decline an alliance invitation."""
        try:
            invite = await self.db.alliance_invites.find_one({"_id": ObjectId(invite_id)})
            if not invite:
                return False, "Invitation not found"
            
            if invite["to_nation_id"] != nation_id:
                return False, "This invitation is not for you"
            
            if invite["status"] != "pending":
                return False, "Invitation already responded to"
            
            # Update invite status
            await self.db.alliance_invites.update_one(
                {"_id": ObjectId(invite_id)},
                {"$set": {
                    "status": "accepted" if accept else "rejected",
                    "responded_at": datetime.utcnow()
                }}
            )
            
            if accept:
                # Add to alliance
                success, msg = await self._add_member_to_alliance(
                    invite["alliance_id"],
                    nation_id,
                    nation_name,
                    nation_flag,
                    race,
                    AllianceRole.MEMBER
                )
                if success:
                    # Add reputation event
                    await self.add_reputation_event(
                        nation_id, nation_name, "alliance_joined",
                        related_alliance_id=invite["alliance_id"],
                        related_alliance_name=invite["alliance_name"]
                    )
                return success, msg
            else:
                return True, "Invitation declined"
                
        except Exception as e:
            logger.error(f"Error responding to invite: {e}")
            return False, str(e)
    
    async def request_to_join(
        self,
        alliance_id: str,
        nation_id: str,
        nation_name: str,
        nation_flag: Optional[str],
        message: str = ""
    ) -> Tuple[bool, str]:
        """Request to join an alliance (for public alliances with approval)."""
        from bson import ObjectId
        try:
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found"
            
            if not alliance.get("is_public"):
                return False, "This alliance is private"
            
            # Get nation data to check eligibility
            nation_data = await self.db.nations.find_one({"_id": ObjectId(nation_id)})
            if not nation_data:
                return False, "Nation not found"
            
            # Check all eligibility requirements (race, ideology, population, reputation)
            eligible, eligibility_msg = await self.check_join_eligibility(
                alliance_id=alliance_id,
                nation_id=nation_id,
                nation_race=nation_data.get("race", "human"),
                nation_population=nation_data.get("stats", {}).get("population", 0) / 1000,  # Convert from thousands to millions
                nation_stats=nation_data.get("stats", {})
            )
            
            if not eligible:
                return False, eligibility_msg
            
            # Check for existing membership
            existing = await self.get_nation_alliance(nation_id)
            if existing:
                return False, "You are already in an alliance"
            
            # Check for existing pending request
            existing_req = await self.db.alliance_join_requests.find_one({
                "alliance_id": alliance_id,
                "nation_id": nation_id,
                "status": "pending"
            })
            if existing_req:
                return False, "You already have a pending request"
            
            # Determine if joining as member or vassal
            population = nation_data.get("stats", {}).get("population", 0)
            is_vassal_eligible = self.is_eligible_for_vassal(population)
            
            member_count = len(alliance.get("members", []))
            vassal_count = len(alliance.get("vassals", []))
            available_vassal_slots = self.get_available_vassal_slots(alliance)
            
            # Priority logic:
            # 1. Under 500k: Try vassal first, fall back to member if no vassal slots
            # 2. Over 500k: Must be member
            
            if is_vassal_eligible:
                # Under 500k - prefer vassal but can be member
                if available_vassal_slots > 0:
                    join_as = AllianceRole.VASSAL
                else:
                    # No vassal slots, try member slot
                    if member_count >= 10:
                        return False, "Faction is at full capacity. No vassal slots (unlock at 3/7/10 members) and no member slots available (10/10)."
                    join_as = AllianceRole.MEMBER
            else:
                # 500k+ - must join as member
                if member_count >= 10:
                    return False, "Faction is at full capacity (10 members max)."
                join_as = AllianceRole.MEMBER
            
            # If no approval required, join directly
            if not alliance.get("requires_approval"):
                success, msg = await self._add_member_to_alliance(
                    alliance_id, nation_id, nation_name, nation_flag, 
                    nation_data.get("race", "human"), join_as
                )
                if success:
                    await self.add_reputation_event(
                        nation_id, nation_name, "alliance_joined",
                        related_alliance_id=alliance_id,
                        related_alliance_name=alliance["name"]
                    )
                return success, msg
            
            # Create join request
            request = AllianceJoinRequest(
                alliance_id=alliance_id,
                alliance_name=alliance["name"],
                nation_id=nation_id,
                nation_name=nation_name,
                nation_flag=nation_flag,
                message=message,
                status=AllianceStatus.PENDING,
                created_at=datetime.utcnow()
            )
            
            await self.db.alliance_join_requests.insert_one(request.dict())
            logger.info(f"Join request from {nation_name} for alliance {alliance['name']}")
            return True, "Join request sent. Waiting for approval."
            
        except Exception as e:
            logger.error(f"Error requesting to join: {e}")
            return False, str(e)
    
    async def handle_join_request(
        self,
        request_id: str,
        handler_nation_id: str,
        accept: bool,
        join_as_role: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Accept or reject a join request.
        
        Args:
            request_id: The join request ID
            handler_nation_id: Nation ID of the handler (leader/founder)
            accept: Whether to accept the request
            join_as_role: Optional role to join as ("member" or "vassal")
                         Only honored if the nation is eligible for that role.
                         Nations above 500k population can ONLY be members.
        """
        try:
            request = await self.db.alliance_join_requests.find_one({"_id": ObjectId(request_id)})
            if not request:
                return False, "Request not found"
            
            # Check handler's role
            role = await self.get_member_role(request["alliance_id"], handler_nation_id)
            if not role or not self.can_manage_members(role):
                return False, "You don't have permission to handle requests"
            
            if request["status"] != "pending":
                return False, "Request already handled"
            
            # Update request status
            await self.db.alliance_join_requests.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {
                    "status": "accepted" if accept else "rejected",
                    "responded_at": datetime.utcnow()
                }}
            )
            
            if accept:
                # Get nation data to check population for role eligibility
                nation = await self.db.nations.find_one({"_id": ObjectId(request["nation_id"])})
                if not nation:
                    return False, "Nation not found"
                
                population = nation.get("stats", {}).get("population", 0)
                nation_race = nation.get("race", "human")
                
                # Determine the role to use
                alliance = await self.get_alliance(request["alliance_id"])
                if not alliance:
                    return False, "Alliance not found"
                
                # Check eligibility for requested role
                is_vassal_eligible = self.is_eligible_for_vassal(population)
                available_vassal_slots = self.get_available_vassal_slots(alliance)
                member_count = len(alliance.get("members", []))
                
                # Determine final role based on request and eligibility
                final_role = AllianceRole.MEMBER  # Default
                
                if join_as_role == "vassal":
                    # Check if they can be a vassal
                    if not is_vassal_eligible:
                        return False, f"Nation has {population:.0f}k population. Nations above 500k cannot be vassals - must join as member."
                    if available_vassal_slots <= 0:
                        return False, "No vassal slots available. They can be accepted as a member instead."
                    final_role = AllianceRole.VASSAL
                elif join_as_role == "member":
                    # Check if member slot is available
                    if member_count >= 10:
                        if is_vassal_eligible and available_vassal_slots > 0:
                            return False, "No member slots available (10/10). They could be accepted as a vassal instead."
                        return False, "Faction is at full capacity (10 members max)."
                    final_role = AllianceRole.MEMBER
                else:
                    # No role specified - auto-determine based on population and slots (legacy behavior)
                    if is_vassal_eligible and available_vassal_slots > 0:
                        final_role = AllianceRole.VASSAL
                    elif member_count < 10:
                        final_role = AllianceRole.MEMBER
                    else:
                        return False, "Faction is at full capacity. No vassal or member slots available."
                
                success, msg = await self._add_member_to_alliance(
                    request["alliance_id"],
                    request["nation_id"],
                    request["nation_name"],
                    request.get("nation_flag"),
                    nation_race,
                    final_role
                )
                if success:
                    await self.add_reputation_event(
                        request["nation_id"], request["nation_name"], "alliance_joined",
                        related_alliance_id=request["alliance_id"],
                        related_alliance_name=request["alliance_name"]
                    )
                return success, msg
            else:
                return True, "Request rejected"
                
        except Exception as e:
            logger.error(f"Error handling join request: {e}")
            return False, str(e)
    
    async def _add_member_to_alliance(
        self,
        alliance_id: str,
        nation_id: str,
        nation_name: str,
        nation_flag: Optional[str],
        race: str,
        role: AllianceRole
    ) -> Tuple[bool, str]:
        """Internal method to add a member or vassal to an alliance."""
        try:
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found"
            
            new_member = {
                "nation_id": nation_id,
                "nation_name": nation_name,
                "nation_flag": nation_flag,
                "race": race,
                "role": role.value,
                "joined_at": datetime.utcnow(),
                "contribution_score": 0
            }
            
            # Add to vassals or members list based on role
            if role == AllianceRole.VASSAL:
                # Check vassal slots
                available_slots = self.get_available_vassal_slots(alliance)
                if available_slots <= 0:
                    return False, "No vassal slots available"
                
                await self.db.multi_alliances.update_one(
                    {"_id": ObjectId(alliance_id)},
                    {"$push": {"vassals": new_member}}
                )
                logger.info(f"{nation_name} joined alliance {alliance['name']} as VASSAL")
                
                # Break any pacts with other faction members (no penalty)
                pacts_broken = await self.break_pacts_with_faction_members(nation_id, alliance_id)
                if pacts_broken > 0:
                    return True, f"Welcome to {alliance['name']} as a vassal! {pacts_broken} Non-Aggression Pact(s) with faction members ended automatically."
                
                return True, f"Welcome to {alliance['name']} as a vassal! You'll be promoted to full member when you reach 500k population (if slots available)."
            else:
                # Check member slots
                if len(alliance.get("members", [])) >= 10:
                    return False, "Alliance is at full capacity (10 members)"
                
                await self.db.multi_alliances.update_one(
                    {"_id": ObjectId(alliance_id)},
                    {"$push": {"members": new_member}}
                )
                logger.info(f"{nation_name} joined alliance {alliance['name']}")
                
                # Break any pacts with other faction members (no penalty)
                pacts_broken = await self.break_pacts_with_faction_members(nation_id, alliance_id)
                if pacts_broken > 0:
                    return True, f"Welcome to {alliance['name']}! {pacts_broken} Non-Aggression Pact(s) with faction members ended automatically."
                
                return True, f"Welcome to {alliance['name']}!"
            
        except Exception as e:
            logger.error(f"Error adding member: {e}")
            return False, str(e)
    
    # ============== Leave & Kick ==============
    
    async def leave_alliance(self, alliance_id: str, nation_id: str, nation_name: str) -> Tuple[bool, str]:
        """Leave an alliance gracefully (works for members only - vassals cannot leave)."""
        try:
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found"
            
            role = await self.get_member_role(alliance_id, nation_id)
            if not role:
                return False, "You are not in this alliance"
            
            # Vassals cannot leave on their own
            if role == "vassal":
                return False, "Vassals cannot leave on their own. You must be released by a faction leader."
            
            # Founder leaving disbands the alliance (unless they transfer leadership)
            if role == AllianceRole.FOUNDER.value:
                if len(alliance.get("members", [])) > 1:
                    return False, "Transfer leadership before leaving, or disband the alliance"
                else:
                    # Disband if founder is the only member
                    await self.db.multi_alliances.update_one(
                        {"_id": ObjectId(alliance_id)},
                        {"$set": {"is_active": False, "disbanded_at": datetime.utcnow()}}
                    )
                    await self.add_reputation_event(nation_id, nation_name, "alliance_left_gracefully",
                        related_alliance_id=alliance_id, related_alliance_name=alliance["name"])
                    return True, "Alliance disbanded"
            
            # Remove from members list
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id)},
                {"$pull": {"members": {"nation_id": nation_id}}}
            )
            
            # Add reputation event (graceful leave is minor penalty)
            await self.add_reputation_event(nation_id, nation_name, "alliance_left_gracefully",
                related_alliance_id=alliance_id, related_alliance_name=alliance["name"])
            
            logger.info(f"{nation_name} left alliance {alliance['name']}")
            return True, f"You have left {alliance['name']}"
            
        except Exception as e:
            logger.error(f"Error leaving alliance: {e}")
            return False, str(e)
    
    async def kick_member(
        self,
        alliance_id: str,
        kicker_nation_id: str,
        target_nation_id: str,
        target_nation_name: str,
        reason: str = ""
    ) -> Tuple[bool, str]:
        """Kick a member from the alliance."""
        try:
            # Check kicker's role
            kicker_role = await self.get_member_role(alliance_id, kicker_nation_id)
            if not kicker_role or not self.can_kick(kicker_role):
                return False, "You don't have permission to kick members"
            
            target_role = await self.get_member_role(alliance_id, target_nation_id)
            if not target_role:
                return False, "Target is not in this alliance"
            
            # Can't kick founder
            if target_role == AllianceRole.FOUNDER.value:
                return False, "Cannot kick the founder"
            
            # Leaders can't kick other leaders (only founder can)
            if target_role == AllianceRole.LEADER.value and kicker_role != AllianceRole.FOUNDER.value:
                return False, "Only the founder can kick leaders"
            
            alliance = await self.get_alliance(alliance_id)
            
            # Remove member
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id)},
                {"$pull": {"members": {"nation_id": target_nation_id}}}
            )
            
            # Add reputation event (kicked = bigger penalty)
            await self.add_reputation_event(target_nation_id, target_nation_name, "alliance_kicked",
                related_alliance_id=alliance_id, related_alliance_name=alliance["name"])
            
            logger.info(f"{target_nation_name} kicked from alliance {alliance['name']}. Reason: {reason}")
            return True, f"{target_nation_name} has been kicked"
            
        except Exception as e:
            logger.error(f"Error kicking member: {e}")
            return False, str(e)
    
    # ============== Role Management ==============
    
    async def promote_member(
        self,
        alliance_id: str,
        promoter_nation_id: str,
        target_nation_id: str,
        new_role: AllianceRole
    ) -> Tuple[bool, str]:
        """Promote or demote a member."""
        try:
            promoter_role = await self.get_member_role(alliance_id, promoter_nation_id)
            if not promoter_role or not self.can_promote(promoter_role):
                return False, "You don't have permission to change roles"
            
            target_role = await self.get_member_role(alliance_id, target_nation_id)
            if not target_role:
                return False, "Target is not in this alliance"
            
            # Can't change founder role (except transfer)
            if target_role == AllianceRole.FOUNDER.value:
                return False, "Cannot change founder's role"
            
            # Only founder can promote to leader
            if new_role == AllianceRole.LEADER and promoter_role != AllianceRole.FOUNDER.value:
                return False, "Only the founder can promote to leader"
            
            # Can't promote to founder (use transfer instead)
            if new_role == AllianceRole.FOUNDER:
                return False, "Use transfer_leadership to make someone founder"
            
            # Update role
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id), "members.nation_id": target_nation_id},
                {"$set": {"members.$.role": new_role.value}}
            )
            
            logger.info(f"Role changed: {target_nation_id} is now {new_role.value}")
            return True, f"Role updated to {new_role.value}"
            
        except Exception as e:
            logger.error(f"Error promoting member: {e}")
            return False, str(e)
    
    async def transfer_leadership(
        self,
        alliance_id: str,
        current_founder_id: str,
        new_founder_id: str
    ) -> Tuple[bool, str]:
        """Transfer founder status to another member."""
        try:
            current_role = await self.get_member_role(alliance_id, current_founder_id)
            if current_role != AllianceRole.FOUNDER.value:
                return False, "Only the founder can transfer leadership"
            
            new_role = await self.get_member_role(alliance_id, new_founder_id)
            if not new_role:
                return False, "Target is not in this alliance"
            
            # Demote current founder to leader
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id), "members.nation_id": current_founder_id},
                {"$set": {"members.$.role": AllianceRole.LEADER.value}}
            )
            
            # Promote new founder
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id), "members.nation_id": new_founder_id},
                {"$set": {"members.$.role": AllianceRole.FOUNDER.value}}
            )
            
            logger.info(f"Leadership transferred from {current_founder_id} to {new_founder_id}")
            return True, "Leadership transferred successfully"
            
        except Exception as e:
            logger.error(f"Error transferring leadership: {e}")
            return False, str(e)
    
    # ============== Edit Alliance Settings ==============
    
    async def edit_alliance_settings(
        self,
        alliance_id: str,
        editor_nation_id: str,
        updates: dict
    ) -> Tuple[bool, str, Optional[Dict]]:
        """Edit alliance settings (founder/leader only)."""
        try:
            # Check editor's role
            role = await self.get_member_role(alliance_id, editor_nation_id)
            if not role or role not in [AllianceRole.FOUNDER.value, AllianceRole.LEADER.value]:
                return False, "Only founders and leaders can edit faction settings", None
            
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found", None
            
            # Build update dict with only provided fields
            update_fields = {}
            
            editable_fields = [
                "name", "description", "motto", "color", "is_public",
                "requires_approval", "min_reputation", "min_population",
                "max_members", "allowed_races", "allowed_ideologies"
            ]
            
            for field in editable_fields:
                if field in updates and updates[field] is not None:
                    update_fields[field] = updates[field]
            
            if not update_fields:
                return False, "No valid fields to update", None
            
            # Validate some fields
            if "max_members" in update_fields:
                if update_fields["max_members"] < len(alliance.get("members", [])):
                    return False, "Cannot set max members below current member count", None
                if update_fields["max_members"] > 10:
                    update_fields["max_members"] = 10  # Hard cap at 10 members
            
            if "min_reputation" in update_fields:
                if update_fields["min_reputation"] < 0 or update_fields["min_reputation"] > 200:
                    return False, "Reputation must be between 0 and 200", None
            
            if "min_population" in update_fields:
                if update_fields["min_population"] < 0:
                    return False, "Population cannot be negative", None
            
            # Update the alliance
            await self.db.multi_alliances.update_one(
                {"_id": ObjectId(alliance_id)},
                {"$set": update_fields}
            )
            
            # Get updated alliance
            updated_alliance = await self.get_alliance(alliance_id)
            
            logger.info(f"Alliance {alliance['name']} settings updated by {editor_nation_id}: {list(update_fields.keys())}")
            return True, "Faction settings updated successfully", updated_alliance
            
        except Exception as e:
            logger.error(f"Error editing alliance settings: {e}")
            return False, str(e), None
    
    async def check_join_eligibility(
        self,
        alliance_id: str,
        nation_id: str,
        nation_race: str,
        nation_population: float,
        nation_stats: dict
    ) -> Tuple[bool, str]:
        """Check if a nation meets all requirements to join an alliance."""
        try:
            alliance = await self.get_alliance(alliance_id)
            if not alliance:
                return False, "Alliance not found"
            
            # Check race restriction
            allowed_races = alliance.get("allowed_races", [])
            if allowed_races and nation_race.lower() not in [r.lower() for r in allowed_races]:
                return False, f"This faction only accepts: {', '.join(allowed_races)}"
            
            # Check minimum population
            min_pop = alliance.get("min_population", 0)
            if min_pop > 0 and nation_population < min_pop:
                return False, f"Minimum population required: {min_pop}M (you have {nation_population:.1f}M)"
            
            # Check ideology restrictions using expanded 12-position political compass
            allowed_ideologies = alliance.get("allowed_ideologies", [])
            if allowed_ideologies:
                # Calculate nation's political compass position (matching politicalCompass.ts)
                civil_rights = nation_stats.get("civil_rights", 50)
                political_freedom = nation_stats.get("political_freedom", 50)
                gdp = nation_stats.get("gdp", 50)
                
                # Economic axis: 0=left, 100=right
                economic = gdp
                # Libertarian axis: 0=auth, 100=lib
                libertarian = (civil_rights + political_freedom) / 2
                
                # Use 35/65 thresholds for more variety
                LEFT = 35
                RIGHT = 65
                AUTH = 35
                LIB = 65
                
                # Determine nation's ideology position (matching frontend logic)
                nation_ideology = "centrist"
                
                # Authoritarian (libertarian < 35)
                if libertarian < AUTH:
                    if economic < LEFT:
                        nation_ideology = "stalinist"
                    elif economic > RIGHT:
                        nation_ideology = "monarchist"
                    else:
                        nation_ideology = "autocrat"
                
                # Libertarian (libertarian > 65)
                elif libertarian > LIB:
                    if economic < LEFT:
                        nation_ideology = "anarchist"
                    elif economic > RIGHT:
                        nation_ideology = "minarchist"
                    else:
                        nation_ideology = "libertarian"
                
                # Center-Auth (libertarian 35-50)
                elif libertarian < 50:
                    if economic < LEFT:
                        nation_ideology = "socialist"
                    elif economic > RIGHT:
                        nation_ideology = "corporatist"
                    else:
                        nation_ideology = "statist"
                
                # Center-Lib (libertarian 50-65)
                else:
                    if economic < LEFT:
                        nation_ideology = "progressive"
                    elif economic > RIGHT:
                        nation_ideology = "conservative"
                    else:
                        nation_ideology = "centrist"
                
                if nation_ideology not in allowed_ideologies:
                    ideology_names = {
                        "stalinist": "Stalinist",
                        "monarchist": "Monarchist",
                        "autocrat": "Autocrat",
                        "socialist": "Socialist",
                        "corporatist": "Corporatist",
                        "statist": "Statist",
                        "progressive": "Progressive",
                        "centrist": "Centrist",
                        "conservative": "Conservative",
                        "anarchist": "Anarchist",
                        "libertarian": "Libertarian",
                        "minarchist": "Minarchist"
                    }
                    allowed_names = [ideology_names.get(q, q) for q in allowed_ideologies]
                    return False, f"Your ideology ({ideology_names.get(nation_ideology, nation_ideology)}) doesn't match. Allowed: {', '.join(allowed_names)}"
            
            return True, "Eligible to join"
            
        except Exception as e:
            logger.error(f"Error checking eligibility: {e}")
            return False, str(e)
    
    # ============== Reputation System ==============
    
    async def add_reputation_event(
        self,
        nation_id: str,
        nation_name: str,
        event_type: str,
        custom_description: str = None,
        custom_change: int = None,
        related_nation_id: str = None,
        related_nation_name: str = None,
        related_alliance_id: str = None,
        related_alliance_name: str = None
    ) -> bool:
        """Add a reputation event for a nation."""
        try:
            event_config = REPUTATION_EVENTS.get(event_type, {"change": 0, "desc": event_type})
            
            change = custom_change if custom_change is not None else event_config["change"]
            description = custom_description or event_config["desc"]
            
            event = ReputationEvent(
                nation_id=nation_id,
                event_type=event_type,
                description=description,
                reputation_change=change,
                related_nation_id=related_nation_id,
                related_nation_name=related_nation_name,
                related_alliance_id=related_alliance_id,
                related_alliance_name=related_alliance_name,
                timestamp=datetime.utcnow()
            )
            
            # Save event
            await self.db.reputation_events.insert_one(event.dict())
            
            # Update nation's reputation
            await self._update_nation_reputation(nation_id, nation_name, event_type, change)
            
            logger.info(f"Reputation event: {nation_name} - {event_type} ({change:+d})")
            return True
            
        except Exception as e:
            logger.error(f"Error adding reputation event: {e}")
            return False
    
    async def _update_nation_reputation(
        self,
        nation_id: str,
        nation_name: str,
        event_type: str,
        change: int
    ):
        """Update a nation's reputation scores."""
        try:
            # Get or create reputation record
            reputation = await self.db.nation_reputation.find_one({"nation_id": nation_id})
            
            if not reputation:
                reputation = NationReputation(
                    nation_id=nation_id,
                    nation_name=nation_name
                ).dict()
                await self.db.nation_reputation.insert_one(reputation)
                reputation = await self.db.nation_reputation.find_one({"nation_id": nation_id})
            
            # Update scores (clamp to 0-200)
            new_overall = max(0, min(200, reputation.get("overall_score", 100) + change))
            
            # Alliance-specific events affect alliance_reliability more
            alliance_events = ["alliance_formed", "alliance_joined", "alliance_left_gracefully", 
                            "alliance_broken", "alliance_kicked", "alliance_honored_30d", "alliance_honored_90d", "betrayal"]
            
            alliance_change = change * 2 if event_type in alliance_events else change
            new_alliance = max(0, min(200, reputation.get("alliance_reliability", 100) + alliance_change))
            
            # Update statistics
            updates = {
                "overall_score": new_overall,
                "alliance_reliability": new_alliance,
                "last_updated": datetime.utcnow()
            }
            
            # Update counters based on event type
            if event_type == "alliance_formed":
                updates["alliances_formed"] = reputation.get("alliances_formed", 0) + 1
            elif event_type == "alliance_broken":
                updates["alliances_broken"] = reputation.get("alliances_broken", 0) + 1
            elif event_type in ["alliance_honored_30d", "alliance_honored_90d"]:
                updates["alliances_honored"] = reputation.get("alliances_honored", 0) + 1
            
            # Calculate betrayal rate
            total_alliances = updates.get("alliances_formed", reputation.get("alliances_formed", 0))
            broken = updates.get("alliances_broken", reputation.get("alliances_broken", 0))
            if total_alliances > 0:
                updates["betrayal_rate"] = round((broken / total_alliances) * 100, 1)
            
            await self.db.nation_reputation.update_one(
                {"nation_id": nation_id},
                {"$set": updates}
            )
            
        except Exception as e:
            logger.error(f"Error updating reputation: {e}")
    
    async def get_nation_reputation(self, nation_id: str) -> Optional[Dict]:
        """Get a nation's reputation data."""
        try:
            reputation = await self.db.nation_reputation.find_one({"nation_id": nation_id})
            if reputation:
                reputation["_id"] = str(reputation["_id"])
                
                # Get recent events
                events_cursor = self.db.reputation_events.find(
                    {"nation_id": nation_id}
                ).sort("timestamp", -1).limit(10)
                events = await events_cursor.to_list(length=10)
                
                for e in events:
                    e["id"] = str(e["_id"])
                    e["_id"] = str(e["_id"])
                
                reputation["recent_events"] = events
            
            return reputation
            
        except Exception as e:
            logger.error(f"Error getting reputation: {e}")
            return None
    
    async def get_reputation_leaderboard(self, limit: int = 50) -> List[Dict]:
        """Get top nations by reputation."""
        try:
            cursor = self.db.nation_reputation.find({}).sort("overall_score", -1).limit(limit)
            nations = await cursor.to_list(length=limit)
            
            for i, n in enumerate(nations, 1):
                n["rank"] = i
                n["_id"] = str(n["_id"])
            
            return nations
        except Exception as e:
            logger.error(f"Error getting reputation leaderboard: {e}")
            return []
    
    # ============== Ideology Compliance & Grace Period ==============
    
    async def check_and_enforce_ideology_compliance(
        self,
        nation_id: str,
        nation_stats: dict,
        nation_race: str
    ) -> Tuple[bool, Optional[str], Optional[dict]]:
        """
        Check if a nation's current ideology matches their faction's restrictions.
        Manages 7-day grace period for non-compliance.
        Returns (is_compliant, warning_message, grace_period_info)
        """
        try:
            # Find nation's faction
            alliance = await self.get_nation_alliance(nation_id)
            if not alliance:
                return True, None, None  # Not in a faction, no compliance check needed
            
            allowed_ideologies = alliance.get("allowed_ideologies", [])
            if not allowed_ideologies:
                return True, None, None  # No ideology restrictions in this faction
            
            # Calculate nation's current ideology
            current_ideology = self._calculate_nation_ideology(nation_stats)
            
            # Find this member in the alliance
            members = alliance.get("members", [])
            member_index = None
            member = None
            for idx, m in enumerate(members):
                if m.get("nation_id") == nation_id:
                    member_index = idx
                    member = m
                    break
            
            if not member:
                return True, None, None  # Not found in member list
            
            is_compliant = current_ideology in allowed_ideologies
            now = datetime.utcnow()
            
            # Update member with current check time
            members[member_index]["last_ideology_check"] = now
            
            if is_compliant:
                # Nation is compliant
                if member.get("ideology_mismatch_started"):
                    # They were non-compliant but are now compliant
                    # Start the 24-hour "compliant stabilization" period
                    if not member.get("ideology_compliant_since"):
                        members[member_index]["ideology_compliant_since"] = now
                    else:
                        # Check if they've been compliant for 24 hours
                        compliant_since = member["ideology_compliant_since"]
                        if isinstance(compliant_since, str):
                            compliant_since = datetime.fromisoformat(compliant_since)
                        hours_compliant = (now - compliant_since).total_seconds() / 3600
                        
                        if hours_compliant >= 24:
                            # Clear grace period - they've been good for 24 hours
                            members[member_index]["ideology_mismatch_started"] = None
                            members[member_index]["ideology_compliant_since"] = None
                            members[member_index]["grace_period_warned"] = False
                            logger.info(f"Grace period cleared for {member['nation_name']} after 24h compliance")
                else:
                    # No grace period, already compliant
                    members[member_index]["ideology_compliant_since"] = None
                
                # Save updated member data
                await self.db.multi_alliances.update_one(
                    {"_id": ObjectId(alliance["_id"])},
                    {"$set": {"members": members}}
                )
                
                return True, None, None
            
            else:
                # Nation is NOT compliant
                # Reset compliant timer since they're non-compliant again
                members[member_index]["ideology_compliant_since"] = None
                
                if not member.get("ideology_mismatch_started"):
                    # First time detecting non-compliance - start grace period
                    members[member_index]["ideology_mismatch_started"] = now
                    members[member_index]["grace_period_warned"] = False
                    logger.warning(f"Grace period started for {member['nation_name']} - ideology mismatch: {current_ideology}")
                
                mismatch_started = member.get("ideology_mismatch_started")
                if isinstance(mismatch_started, str):
                    mismatch_started = datetime.fromisoformat(mismatch_started)
                
                days_in_grace = (now - mismatch_started).days
                days_remaining = 7 - days_in_grace
                
                if days_remaining <= 0:
                    # Grace period expired - kick them out
                    logger.warning(f"Kicking {member['nation_name']} from {alliance['name']} - grace period expired")
                    
                    # Remove from alliance
                    await self.db.multi_alliances.update_one(
                        {"_id": ObjectId(alliance["_id"])},
                        {"$pull": {"members": {"nation_id": nation_id}}}
                    )
                    
                    # Add reputation penalty
                    await self.add_reputation_event(
                        nation_id, member['nation_name'], "alliance_kicked",
                        related_alliance_id=str(alliance["_id"]),
                        related_alliance_name=alliance["name"]
                    )
                    
                    return False, f"You have been removed from {alliance['name']} due to ideology incompatibility after 7-day grace period.", None
                
                else:
                    # Still in grace period
                    ideology_names = {
                        "stalinist": "Stalinist", "monarchist": "Monarchist", "autocrat": "Autocrat",
                        "socialist": "Socialist", "corporatist": "Corporatist", "statist": "Statist",
                        "progressive": "Progressive", "centrist": "Centrist", "conservative": "Conservative",
                        "anarchist": "Anarchist", "libertarian": "Libertarian", "minarchist": "Minarchist"
                    }
                    allowed_names = [ideology_names.get(q, q) for q in allowed_ideologies]
                    
                    warning_msg = f"⚠️ FACTION WARNING: Your ideology ({ideology_names.get(current_ideology, current_ideology)}) doesn't match {alliance['name']}'s requirements ({', '.join(allowed_names)}). You have {days_remaining} days to align or you'll be removed."
                    
                    grace_info = {
                        "days_remaining": days_remaining,
                        "current_ideology": current_ideology,
                        "allowed_ideologies": allowed_ideologies,
                        "faction_name": alliance["name"]
                    }
                    
                    # Update member
                    await self.db.multi_alliances.update_one(
                        {"_id": ObjectId(alliance["_id"])},
                        {"$set": {"members": members}}
                    )
                    
                    return False, warning_msg, grace_info
            
        except Exception as e:
            logger.error(f"Error checking ideology compliance: {e}")
            return True, None, None  # Don't block on errors
    
    def _calculate_nation_ideology(self, nation_stats: dict) -> str:
        """Calculate nation's ideology position using expanded 12-position system."""
        civil_rights = nation_stats.get("civil_rights", 50)
        political_freedom = nation_stats.get("political_freedom", 50)
        gdp = nation_stats.get("gdp", 50)
        
        economic = gdp
        libertarian = (civil_rights + political_freedom) / 2
        
        LEFT = 35
        RIGHT = 65
        AUTH = 35
        LIB = 65
        
        # Authoritarian (libertarian < 35)
        if libertarian < AUTH:
            if economic < LEFT:
                return "stalinist"
            elif economic > RIGHT:
                return "monarchist"
            else:
                return "autocrat"
        
        # Libertarian (libertarian > 65)
        elif libertarian > LIB:
            if economic < LEFT:
                return "anarchist"
            elif economic > RIGHT:
                return "minarchist"
            else:
                return "libertarian"
        
        # Center-Auth (libertarian 35-50)
        elif libertarian < 50:
            if economic < LEFT:
                return "socialist"
            elif economic > RIGHT:
                return "corporatist"
            else:
                return "statist"
        
        # Center-Lib (libertarian 50-65)
        else:
            if economic < LEFT:
                return "progressive"
            elif economic > RIGHT:
                return "conservative"
            else:
                return "centrist"
    
    # ============== Get Pending Invites/Requests ==============
    
    async def get_nation_invites(self, nation_id: str) -> List[Dict]:
        """Get pending invites for a nation."""
        try:
            cursor = self.db.alliance_invites.find({
                "to_nation_id": nation_id,
                "status": "pending"
            }).sort("created_at", -1)
            
            invites = await cursor.to_list(length=20)
            for i in invites:
                i["id"] = str(i["_id"])
                i["_id"] = str(i["_id"])
            
            return invites
        except Exception as e:
            logger.error(f"Error getting invites: {e}")
            return []
    
    async def get_alliance_join_requests(self, alliance_id: str) -> List[Dict]:
        """Get pending join requests for an alliance with population info."""
        try:
            cursor = self.db.alliance_join_requests.find({
                "alliance_id": alliance_id,
                "status": "pending"
            }).sort("created_at", -1)
            
            requests = await cursor.to_list(length=50)
            
            # Enhance each request with nation population data
            for r in requests:
                r["id"] = str(r["_id"])
                r["_id"] = str(r["_id"])
                
                # Get nation data for population
                try:
                    nation = await self.db.nations.find_one({"_id": ObjectId(r["nation_id"])})
                    if nation:
                        population = nation.get("stats", {}).get("population", 0)
                        r["nation_population"] = population
                        r["is_vassal_eligible"] = self.is_eligible_for_vassal(population)  # Under 500k
                        r["nation_race"] = nation.get("race", "human")
                    else:
                        r["nation_population"] = 0
                        r["is_vassal_eligible"] = True
                        r["nation_race"] = "human"
                except Exception as e:
                    logger.error(f"Error getting nation for join request: {e}")
                    r["nation_population"] = 0
                    r["is_vassal_eligible"] = True
                    r["nation_race"] = "human"
            
            return requests
        except Exception as e:
            logger.error(f"Error getting join requests: {e}")
            return []
