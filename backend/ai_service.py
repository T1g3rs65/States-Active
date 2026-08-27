"""AI service for generating issues and nation descriptions using Grok API."""

from grok_client import LlmChat, UserMessage
from models import Nation, NationStats, Issue, IssueChoice, GovernmentType
from stats_config import STAT_DEFINITIONS
from race_service import get_race_ai_description, get_race_display_info
from typing import List, Dict
import json
import os
from datetime import datetime

class AIService:
    def __init__(self, api_key: str = None):
        # Exclusively use OPENCLAW_GATEWAY_TOKEN. Direct XAI/EMERGENT keys removed.
        self.api_key = (
            api_key
            or os.environ.get("OPENCLAW_GATEWAY_TOKEN")
            
            
        )
    
    @staticmethod
    def _display_identity(nation: Nation) -> str:
        """Return the wheel-based full government display name if available."""
        display = getattr(nation, "display_name", None) or getattr(nation, "display_identity", None)
        if display:
            return display
        parts = [
            getattr(nation, "government_form", None),
            getattr(nation, "government_subtype", None),
            getattr(nation, "territorial_structure", None),
            getattr(nation, "style_modifier", None),
        ]
        parts = [p for p in parts if p and p != "None (clean result)"]
        return " ".join(parts) or "Unknown"
    
    @staticmethod
    def _neighbor_identity(n: dict) -> str:
        """Build a readable government label from a neighbor dict."""
        display = n.get("display_name") or n.get("display_identity")
        if display:
            return display
        parts = [
            n.get("government_form"),
            n.get("government_subtype"),
            n.get("territorial_structure"),
            n.get("style_modifier"),
        ]
        parts = [p for p in parts if p and p != "None (clean result)"]
        return " ".join(parts) or "Unknown"
        
    async def generate_issues(self, nation: Nation, count: int = 3, db=None) -> List[Issue]:
        """Generate daily issues based on nation's current state."""
        
        # Fetch neighboring nations for context (same world, excluding self)
        neighbors_info = ""
        if db is not None:
            try:
                world_id = getattr(nation, "world_id", None)
                query = {}
                if world_id:
                    query["world_id"] = world_id
                # Exclude self by name (nation.id may not match _id in DB)
                self_name = nation.name
                query["name"] = {"$ne": self_name}
                cursor = db.nations.find(query, {
                    "name": 1,
                    "display_name": 1,
                    "government_form": 1,
                    "government_subtype": 1,
                    "territorial_structure": 1,
                    "style_modifier": 1,
                    "stats.gdp": 1,
                    "stats.military_strength": 1,
                    "stats.happiness": 1,
                    "stats.population": 1,
                }).limit(5)
                neighbors = await cursor.to_list(length=5)
                if neighbors:
                    lines = []
                    for n in neighbors:
                        nm = n.get("name", "?")
                        gov_display = n.get("display_name") or self._neighbor_identity(n)
                        s = n.get("stats") or {}
                        gdp = s.get("gdp", "?")
                        mil = s.get("military_strength", "?")
                        pop = s.get("population", "?")
                        lines.append(f"  - {nm} ({gov_display}): GDP {gdp}, Military {mil}, Pop {pop}k, Happiness {s.get('happiness','?')}")
                    neighbors_info = "\nNEIGHBORING / NEARBY NATIONS (for reference — use sparingly in issues):\n" + "\n".join(lines) + "\n"
            except Exception as e:
                print(f"Warning: could not fetch neighbors: {e}")
        
        # Build context about the nation
        context = self._build_nation_context(nation, db=db, neighbors_info=neighbors_info)
        
        # Create system message for issue generation
        system_message = f"""You are the issue generator for 'SovereignHex', a nation simulation game.

Your task is to generate realistic, nuanced policy dilemmas that:
1. Reflect the nation's current situation and stats
2. Have NO clear "right" answer - all choices have trade-offs
3. Range from mundane (local issues) to dramatic (national crises)
4. Feel authentic to the nation's full government identity and culture
5. Create cascading effects across multiple stats

Current Nation Context:
{context}

Generate {count} issues in the following JSON format:
{{
  "issues": [
    {{
      "title": "Brief catchy title (5-8 words)",
      "description": "Detailed scenario description (50-150 words). Be specific, vivid, and include stakeholder perspectives.",
      "choices": [
        {{
          "text": "Action option (10-20 words)",
          "effects": {{
            "stat_name": change_amount,
            // Include 3-8 stats affected, positive and negative
          }},
          "description": "What happens if this is chosen (15-30 words)"
        }},
        // EXACTLY 4 choices per issue - no more, no less
      ],
      "chains_into": "Optional: short title for a follow-up issue that results from this one. Omit entirely for most issues; only include ~20% of the time."
    }}
  ]
}}

IMPORTANT RULES:
- Use realistic effect sizes: small changes (±2-5), moderate (±5-15), large (±15-30)
- Each choice must affect at least 3-8 different stats
- Create genuine trade-offs - rarely should all effects be positive or negative

VALID STAT NAMES (use ONLY these exact names):
ECONOMY: gdp, economy_growth, unemployment, inflation, national_debt, tax_rate
CIVIL RIGHTS: civil_rights, freedom_speech, freedom_press, freedom_assembly, freedom_religion
POLITICAL: political_freedom, voting_rights, corruption, political_apathy
SOCIAL: happiness, life_expectancy, obesity_rate
ENVIRONMENT: environment, pollution, biodiversity, eco_footprint
HEALTH & EDUCATION: healthcare_quality, literacy_rate, university_attendance, scientific_advancement
CRIME & LAW: crime_rate, law_enforcement
MILITARY: military_strength
EQUALITY: income_equality, gini_coefficient
POPULATION: population, population_growth
BUDGET ALLOCATION: budget_education, budget_defense, budget_healthcare, budget_welfare, budget_environment, budget_infrastructure, budget_other
INTERNATIONAL: international_approval

- Use diverse stats - don't just stick to gdp/happiness/civil_rights
- Include military, science, environment, crime stats in issues
- IMPORTANT: Most choices should have a small population effect (±0.05 to ±0.5 thousand) to show nation growth/decline
- Make descriptions engaging and consequences believable
- Vary issue types: economy, social, environment, international, crime, military, technology, education, etc.
- GEOGRAPHY LOCK: The geography and resources listed in the nation context are REFERENCE ONLY — use them to keep issues believable (don't invent a coastline if landlocked), but do NOT make resource/terrain topics the focus of most issues. Most issues should be about politics, society, economy, culture, crime, diplomacy, military, technology, or daily life — not about wheat, timber, or mining quotas.
- NEIGHBORS: If nearby/bordering nations are listed in the context, you may reference them in issues (trade disputes, border incidents, refugee flows, diplomatic overtures) but do not force every issue to involve a neighbor.
- CHAIN ISSUES: About 1 in 5 issues (roughly 20% chance) may end with a "chains_into" field — a short title for a follow-up issue that would logically result from the player's choice. This is optional; most issues should NOT have chains_into. Only include it when a choice would clearly lead to a consequential next dilemma.
- Reference past decisions occasionally to create narrative continuity
- Issues can change government type by shifting key stats (civil_rights, gdp, political_freedom, environment, military_strength, scientific_advancement, crime_rate)
- Population growth represents immigration, birth rate, and overall national vitality"""
        
        # Create chat instance
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"issue_gen_{nation.id}_{datetime.utcnow().timestamp()}",
            system_message=system_message
        )
        
        # Generate issues
        user_message = UserMessage(
            text=f"Generate {count} diverse, engaging policy issues for {nation.name}. Make them reflect current stats and create meaningful choices with realistic consequences."
        )
        
        try:
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            # Extract JSON from markdown code blocks if present
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            data = json.loads(response_text.strip())
            
            # Convert to Issue objects
            issues = []
            for issue_data in data.get("issues", []):
                choices = [
                    IssueChoice(
                        text=choice["text"],
                        effects=choice["effects"],
                        description=choice["description"]
                    )
                    for choice in issue_data["choices"][:4]  # Limit to exactly 4 choices
                ]
                
                issue = Issue(
                    nation_id=nation.id,
                    title=issue_data["title"],
                    description=issue_data["description"],
                    choices=choices,
                    chains_into=issue_data.get("chains_into"),  # Optional follow-up title
                )
                issues.append(issue)
            
            return issues
            
        except Exception as e:
            print(f"Error generating issues: {e}")
            # Return fallback issues
            return self._get_fallback_issues(nation)
    
    async def generate_nation_description(self, nation: Nation, db=None) -> str:
        """Generate dynamic nation description based on current stats."""
        
        context = self._build_nation_context(nation, db=db)
        display = self._display_identity(nation)
        
        system_message = f"""You are a creative writer for 'Emergent: Rise of Nations'.

Write a vivid, engaging 300-600 word description of the nation based on its current stats.

The description should:
1. Paint a picture of what life is like for ordinary citizens
2. Reflect the government type and political atmosphere
3. Mention notable strengths and challenges
4. Include specific details about culture, economy, and society
5. Use evocative language and concrete examples
6. Evolve based on stat thresholds (e.g. describe differently if civil_rights > 85 vs < 20)

Current Nation Context:
{context}

Write in third person, present tense. Make it feel like a living, breathing nation with real people and real consequences from policy decisions."""

        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"desc_gen_{nation.id}_{datetime.utcnow().timestamp()}",
            system_message=system_message
        )
        
        user_message = UserMessage(
            text=f"Write a compelling nation description for {nation.name}, a {display}."
        )
        
        try:
            response = await chat.send_message(user_message)
            return response
        except Exception as e:
            print(f"Error generating description: {e}")
            return self._get_fallback_description(nation)
    
    def _build_nation_context(self, nation: Nation, db=None, neighbors_info: str = "") -> str:
        """Build detailed context about the nation for AI prompts."""
        
        stats = nation.stats
        
        # Get race information
        race_id = getattr(nation, 'race', 'human')
        race_info = get_race_display_info(race_id)
        race_ai_desc = get_race_ai_description(race_id)
        
        # Get top stats and bottom stats
        stat_values = {}
        for field, value in stats.dict().items():
            if field in STAT_DEFINITIONS:
                stat_def = STAT_DEFINITIONS[field]
                # Normalize to 0-100 scale for comparison
                normalized = ((value - stat_def['min']) / (stat_def['max'] - stat_def['min'])) * 100
                stat_values[field] = {
                    'name': stat_def['name'],
                    'value': value,
                    'normalized': normalized,
                    'higher_is_better': stat_def['higher_is_better']
                }
        
        # Sort by normalized value
        sorted_stats = sorted(stat_values.items(), key=lambda x: x[1]['normalized'], reverse=True)
        
        top_stats = sorted_stats[:10]
        bottom_stats = sorted_stats[-10:]
        
        display_identity = self._display_identity(nation)
        
        context = f"""Nation: {nation.name}
Full Government Identity: {display_identity}
Government Form: {getattr(nation, 'government_form', 'unknown')}
Government Subtype: {getattr(nation, 'government_subtype', 'unknown')}
Territorial Structure: {getattr(nation, 'territorial_structure', 'unknown')}
Style Modifier: {getattr(nation, 'style_modifier', 'unknown')}
Species/Race: {race_info['name']}
Age: {(datetime.utcnow() - nation.created_at).days} days old
Total Decisions Made: {nation.total_decisions}
Population: {stats.population:.1f}k citizens

ABOUT THIS SPECIES:
{race_ai_desc}

RECENT POLICIES (Major Laws):"""
        
        # Include recent policies if they exist
        policies = getattr(nation, 'policies', [])
        if policies:
            recent_policies = policies[-5:]  # Last 5 policies
            context += "\n"
            for policy in recent_policies:
                # Handle both dict and Policy object
                if isinstance(policy, dict):
                    policy_name = policy.get('name', 'Unknown Policy')
                    policy_desc = policy.get('news_snippet', policy.get('short_description', 'Policy enacted'))
                else:
                    policy_name = getattr(policy, 'name', 'Unknown Policy')
                    policy_desc = getattr(policy, 'news_snippet', getattr(policy, 'short_description', 'Policy enacted'))
                context += f"  - {policy_name}: {policy_desc}\n"
        else:
            context += " None enacted yet.\n"
        
        context += self._build_geography_context(nation)
        if neighbors_info:
            context += neighbors_info

        context += "\nTop Performing Stats:\n"
        for stat_name, data in top_stats:
            context += f"  - {data['name']}: {data['value']:.1f}\n"
        
        context += "\nLowest Performing Stats:\n"
        for stat_name, data in bottom_stats:
            context += f"  - {data['name']}: {data['value']:.1f}\n"
        
        context += f"\nALL STATS (you can reference any of these in the description):\n"
        context += f"  Economy: GDP {stats.gdp:.1f}, Growth {stats.economy_growth:.1f}%, Unemployment {stats.unemployment:.1f}%, Inflation {stats.inflation:.1f}%\n"
        context += f"  Society: Happiness {stats.happiness:.1f}, Life Expectancy {stats.life_expectancy:.1f}yrs, Literacy {stats.literacy_rate:.1f}%\n"
        context += f"  Rights: Civil Rights {stats.civil_rights:.1f}, Political Freedom {stats.political_freedom:.1f}, Free Speech {stats.freedom_speech:.1f}\n"
        context += f"  Environment: Environment {stats.environment:.1f}, Pollution {stats.pollution:.1f}, Biodiversity {stats.biodiversity:.1f}\n"
        context += f"  Security: Military {stats.military_strength:.1f}, Crime Rate {stats.crime_rate:.1f}, Law Enforcement {stats.law_enforcement:.1f}\n"
        context += f"  Equality: Income Equality {stats.income_equality:.1f}, Gini {stats.gini_coefficient:.1f}\n"
        context += f"  Infrastructure: Scientific Advancement {stats.scientific_advancement:.1f}, Healthcare {stats.healthcare_quality:.1f}\n"
        context += f"  Population: {stats.population:.1f}k, Growth {stats.population_growth:.1f}%\n"
        context += f"  Budget: Education {stats.budget_education:.1f}%, Defense {stats.budget_defense:.1f}%, Healthcare {stats.budget_healthcare:.1f}%\n"
        context += f"  Taxes: Tax Rate {stats.tax_rate:.1f}%, National Debt {stats.national_debt:.1f}\n"
        
        return context

    def _build_geography_context(self, nation: Nation) -> str:
        """Tile + resource brief so issues match the actual map."""
        counts = getattr(nation, "territory_counts", None)
        resources = getattr(nation, "resource_counts", None)
        total = getattr(nation, "total_territories", None)
        if isinstance(nation, dict):
            counts = nation.get("territory_counts", counts)
            resources = nation.get("resource_counts", resources)
            total = nation.get("total_territories", total)
        counts = counts or {}
        resources = resources or {}
        total = int(total or 0)
        if not counts and not resources:
            return (
                "\nGEOGRAPHY & RESOURCES: Unknown — no terrain census yet. "
                "Avoid inventing a specific coast, desert, or mine until the nation's land is surveyed.\n"
            )

        water_keys = {
            "deep_ocean", "shallow_sea", "ocean", "coast", "coastal",
            "river", "lake", "wetland", "mangrove", "flooded_grassland",
        }
        water = sum(int(v or 0) for k, v in counts.items() if k in water_keys)
        land = max(0, total - water) if total else sum(
            int(v or 0) for k, v in counts.items() if k not in water_keys
        )
        landlocked = water == 0 and land > 0
        access = "LANDLOCKED — no coastline. Do not write ports, navies, beaches, fishing fleets, or overseas shipping as local facts."
        if water > 0 and land == 0:
            access = "MARITIME / island-heavy — water dominates the territory."
        elif water > 0:
            access = f"HAS COASTLINE ({water} water area of {total or water + land} total). Ports and fishing are allowed if they fit the biomes."

        biome_order = sorted(counts.items(), key=lambda kv: int(kv[1] or 0), reverse=True)
        biome_line = ", ".join(f"{k.replace('_', ' ')} {int(v)}" for k, v in biome_order[:8] if int(v or 0) > 0) or "none recorded"
        res_order = sorted(resources.items(), key=lambda kv: int(kv[1] or 0), reverse=True)
        top_res = [f"{k.replace('_', ' ')} {int(v)}" for k, v in res_order[:6] if int(v or 0) > 0]
        missing = [k.replace("_", " ") for k, v in res_order if int(v or 0) <= 0]
        # Also flag common resources never present
        known = {k for k, _ in res_order}
        for expected in ("fish", "oil", "iron", "coal", "timber", "gold"):
            if expected not in known:
                missing.append(expected)
        missing = missing[:8]

        return (
            f"\nGEOGRAPHY & RESOURCES (use this; do not invent a different landscape):\n"
            f"  Access: {access}\n"
            f"  Extent: {total or land + water} area — land {land}, water {water}\n"
            f"  Dominant terrain: {biome_line}\n"
            f"  Principal resources: {', '.join(top_res) if top_res else 'none recorded'}\n"
            f"  Do not invent these as major local industries: {', '.join(missing) if missing else 'n/a'}\n"
        )

    def _get_fallback_issues(self, nation: Nation) -> List[Issue]:
        """Return generic fallback issues if AI generation fails."""
        return [
            Issue(
                nation_id=nation.id,
                title="Economic Development Dilemma",
                description="Local businesses are requesting tax breaks to expand operations, promising job creation. However, this would reduce government revenue needed for social programs.",
                choices=[
                    IssueChoice(
                        text="Grant the tax breaks",
                        effects={"gdp": 5, "unemployment": -2, "tax_rate": -3, "budget_welfare": -5},
                        description="Businesses expand, creating jobs but reducing social program funding."
                    ),
                    IssueChoice(
                        text="Deny the request",
                        effects={"gdp": -3, "budget_welfare": 3, "happiness": -2},
                        description="Social programs remain funded but economic growth slows."
                    ),
                    IssueChoice(
                        text="Negotiate a compromise",
                        effects={"gdp": 2, "tax_rate": -1, "budget_welfare": -2, "happiness": 1},
                        description="A middle ground that satisfies no one completely."
                    ),
                ]
            )
        ]
    
    def _get_fallback_description(self, nation: Nation) -> str:
        """Return generic description if AI generation fails."""
        display = self._display_identity(nation)
        return f"{nation.name} is a {display} finding its place in the world. Through careful governance and strategic decisions, the nation continues to evolve and face new challenges each day."
