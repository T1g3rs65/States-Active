"""AI service for generating issues and nation descriptions using Grok API."""

from grok_client import LlmChat, UserMessage
from models import Nation, NationStats, Issue, IssueChoice, GovernmentType
from stats_config import STAT_DEFINITIONS
from race_service import get_race_ai_description, get_race_display_info
from typing import List, Dict
import json
import os
import random
import secrets
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

    @staticmethod
    def _qual_band(value: float, lo: float, hi: float) -> str:
        span = hi - lo if hi != lo else 1.0
        t = max(0.0, min(1.0, (float(value) - lo) / span))
        if t < 0.20:
            return "very low"
        if t < 0.40:
            return "low"
        if t < 0.60:
            return "moderate"
        if t < 0.80:
            return "high"
        return "very high"

    @classmethod
    def _qual_stat(cls, field: str, value) -> str:
        d = STAT_DEFINITIONS.get(field)
        if not d or value is None or value == "?":
            return "unknown"
        try:
            v = float(value)
        except (TypeError, ValueError):
            return "unknown"
        return cls._qual_band(v, d["min"], d["max"])

    _PROSE_RULE = (
        "PROSE RULE (strict): Never write numeric stat values in titles, descriptions, "
        "choice text, or nation lore. Do not say '77 advancement', '34 happiness', "
        "'27.8 approval', or any score/percent of a stat. Refer to conditions only in "
        "words: very low, low, moderate, high, very high — or plain English like "
        "'low happiness', 'weak international standing', 'advanced research'. "
        "JSON effect numbers are the only place digits for stats are allowed."
    )

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
                        lines.append(
                            f"  - {nm} ({gov_display}): GDP {self._qual_stat('gdp', gdp)}, "
                            f"military {self._qual_stat('military_strength', mil)}, "
                            f"happiness {self._qual_stat('happiness', s.get('happiness'))}"
                        )
                    neighbors_info = "\nNEIGHBORING / NEARBY NATIONS (for reference — use sparingly in issues):\n" + "\n".join(lines) + "\n"
            except Exception as e:
                print(f"Warning: could not fetch neighbors: {e}")
        
        # Build context about the nation
        context = self._build_nation_context(nation, db=db, neighbors_info=neighbors_info)
        try:
            from wheel_friction import issue_themes
            themes = issue_themes(nation)
            theme_line = ", ".join(themes) if themes else "ordinary political and social life"
        except Exception:
            theme_line = "ordinary political and social life"
        try:
            from issue_gates import prompt_block as _gate_block
            gate_block = _gate_block(nation)
        except Exception:
            gate_block = ""

        chain = getattr(nation, "issue_chain", None) or {}
        if isinstance(nation, dict):
            chain = nation.get("issue_chain") or {}
        step = int((chain or {}).get("step") or 0)
        topic = ((chain or {}).get("topic") or "").strip()
        cid = (chain or {}).get("id")
        if step >= 3 and topic:
            chain_block = (
                f"- CHAIN STATUS: CLOSED. Do not write another issue about “{topic}”. "
                "Fresh one-off subjects only. Omit chains_into on every issue."
            )
        elif topic and step > 0:
            nxt = step + 1
            end = " This is the last beat — close the story. Omit chains_into." if nxt >= 3 else " After this, the thread ends soon."
            chain_block = (
                f"- CHAIN STATUS: Beat {nxt} of 3 about “{topic}”. "
                f"At most ONE issue may continue that thread.{end} "
                "Every other issue must be an unrelated one-off."
            )
        else:
            chain_block = (
                "- CHAIN STATUS: None. Default to one-off issues. "
                "chains_into on at most one issue, and only if a short 2–3 beat story is truly warranted."
            )

        recent_block = ""
        recent_titles = []
        if db is not None:
            try:
                nid = getattr(nation, "id", None) or (nation.get("id") if isinstance(nation, dict) else None)
                cursor = db.issues.find({"nation_id": nid}).sort("generated_at", -1).limit(24)
                docs = await cursor.to_list(length=24)
                recent_titles = [d.get("title") for d in docs if d.get("title")]
            except Exception:
                recent_titles = []
        if recent_titles:
            avoid = recent_titles[:3]
            older = recent_titles[3:]
            random.shuffle(older)
            echo = older[:3]
            recent_block = (
                f"- DO NOT SEQUEL these recent issues unless CHAIN STATUS says so: {'; '.join(avoid)}"
            )
            if echo:
                recent_block += (
                    f"\n- OPTIONAL ECHO (use in at most ONE issue this batch, or none): {'; '.join(echo)}. "
                    "Most issues must be new subjects. Do not keep returning to the same past event."
                )

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

{self._PROSE_RULE}

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
        // 2 to 4 choices. Maximum 4. Mix the count.
      ],
      "chains_into": "Rare. Omit on one-offs. At most one issue in the batch."
    }}
  ]
}}

IMPORTANT RULES:
- Use realistic effect sizes: small changes (±2-5), moderate (±5-15), large (±15-30)
- CHOICES: 2, 3, or 4 options per issue. Never 1. Never more than 4. Vary the count — some issues are binary, some have three ways out, some have four. Do not pad a simple dilemma to four.
- VETOED OPTIONS: If this government's structure would block an option (member veto, isolationist closed ports, praetorian guard, junta, holy ban, etc.), you MAY still include that option so the player can see it. Mark it with "vetoed": true and append " (vetoed)" to the choice text. Grey-out is the UI. At most one vetoed choice. Always leave at least TWO pickable (not vetoed) choices.
- Each choice must affect at least 2-6 different stats
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
- Make descriptions engaging and consequences believable. Never quote stat scores in prose.
- Vary issue types: economy, social, environment, international, crime, military, technology, education, etc.
- GEOGRAPHY LOCK: The geography and resources listed in the nation context are REFERENCE ONLY — use them to keep issues believable (don't invent a coastline if landlocked), but do NOT make resource/terrain topics the focus of most issues. Most issues should be about politics, society, economy, culture, crime, diplomacy, military, technology, or daily life — not about wheat, timber, or mining quotas.
- THEMATIC WEIGHT: Lean toward these kinds of issues (about half the batch). Still include other kinds so the deck is not a single note: {theme_line}
{gate_block}
- NEIGHBORS: If nearby/bordering nations are listed in the context, you may reference them in issues (trade disputes, border incidents, refugee flows, diplomatic overtures) but do not force every issue to involve a neighbor.
- CHAIN ISSUES: MOST issues are one-offs. Do not write a sequel to the last issue unless the CHAIN STATUS block below tells you to. Never more than 3 beats in one story. If this is beat 3, the issue MUST close the thread — no further sequel. At most ONE issue in this batch may include chains_into; the rest must omit it.
{chain_block}
{recent_block}
- At most ONE issue in this batch may lightly reference an OPTIONAL ECHO. The rest must be new subjects. Do not keep latching onto the same past issue.
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
                raw_choices = issue_data.get("choices") or []
                choices = []
                for choice in raw_choices[:4]:
                    text = (choice.get("text") or "").strip()
                    if not text:
                        continue
                    vetoed = bool(choice.get("vetoed")) or "(vetoed)" in text.lower()
                    if vetoed and "(vetoed)" not in text.lower():
                        text = f"{text} (vetoed)"
                    choices.append(
                        IssueChoice(
                            text=text,
                            effects=choice.get("effects") or {},
                            description=choice.get("description") or "",
                            vetoed=vetoed,
                        )
                    )
                pickable = [c for c in choices if not c.vetoed]
                if len(pickable) < 2:
                    continue
                
                issue = Issue(
                    nation_id=nation.id,
                    title=issue_data["title"],
                    description=issue_data["description"],
                    choices=choices,
                    chains_into=issue_data.get("chains_into"),
                )
                issues.append(issue)
            
            return self._cap_chains(issues, chain)
            
        except Exception as e:
            print(f"Error generating issues: {e}")
            # Return fallback issues
            return self._get_fallback_issues(nation)

    def _cap_chains(self, issues: List[Issue], chain: dict | None) -> List[Issue]:
        """Most issues are one-offs. A thread is at most 3 beats."""
        chain = chain or {}
        step = int(chain.get("step") or 0)
        cid = chain.get("id") or secrets.token_hex(8)
        continuing = bool((chain.get("topic") or "").strip()) and 0 < step < 3
        closed = step >= 3
        kept_starter = False
        for i, iss in enumerate(issues):
            follow = (iss.chains_into or "").strip() or None
            iss.chains_into = None
            iss.chain_id = None
            iss.chain_step = 0
            if closed:
                continue
            if continuing:
                if i == 0:
                    iss.chain_id = cid
                    iss.chain_step = step + 1
                    if iss.chain_step < 3:
                        iss.chains_into = follow or chain.get("topic")
                continue
            if follow and not kept_starter and random.random() < 0.12:
                iss.chain_id = secrets.token_hex(8)
                iss.chain_step = 1
                iss.chains_into = follow
                kept_starter = True
        return issues

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
6. Evolve based on qualitative levels (e.g. describe differently if civil rights are very high vs very low)

{self._PROSE_RULE}

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

    async def generate_policy_law(
        self,
        *,
        category: str,
        nation_name: str,
        government: str,
        issue_title: str,
        issue_description: str,
        choice_text: str,
        choice_description: str = "",
    ) -> tuple:
        """Write a standing law from an issue decision. Same AI path as issues."""
        system_message = f"""You write statutes for SovereignHex.

{self._PROSE_RULE}

Return ONLY JSON:
{{
  "name": "short statute title, 3-8 words, no year, no generic '... Act' unless the name is specific",
  "description": "2-4 sentences of what the law actually does. Who it binds. How it is enforced. No marketing. No banned words (nestled, tapestry, testament, bustling, vibrant, landscape, harmony)."
}}

The name must describe THIS choice, not the category. Never output '{category.replace('_', ' ').title()} Act'."""

        user_message = UserMessage(
            text=(
                f"Nation: {nation_name}\n"
                f"Government: {government}\n"
                f"Category hint: {category}\n"
                f"Issue: {issue_title}\n"
                f"Situation: {issue_description}\n"
                f"The chamber chose: {choice_text}\n"
                f"What that meant: {choice_description}\n"
                "Write the statute JSON."
            )
        )
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"policy_{nation_name}_{datetime.utcnow().timestamp()}",
            system_message=system_message,
        )
        try:
            response = await chat.send_message(user_message)
            text = response or ""
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            data = json.loads(text.strip())
            name = str(data.get("name") or "").strip()
            desc = str(data.get("description") or "").strip()
            if not name or name.lower().endswith(" act") and len(name.split()) <= 3:
                name = choice_text.strip()[:72] or f"{issue_title} law"
            if not desc:
                desc = (choice_description or choice_text or issue_description or "").strip()[:400]
            return name[:90], desc[:800]
        except Exception as e:
            print(f"Error generating policy law: {e}")
            name = (choice_text or issue_title or "Standing order").strip()[:72]
            desc = (choice_description or issue_description or choice_text or "").strip()[:400]
            return name, desc or f"{nation_name} adopted the choice as standing law."

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
Age: {'fledgling' if (datetime.utcnow() - nation.created_at).days < 14 else 'established'}
Total Decisions Made: {'few' if nation.total_decisions < 8 else 'several' if nation.total_decisions < 25 else 'many'}
Population: {self._qual_stat('population', stats.population)}

ABOUT THIS SPECIES:
{race_ai_desc}

RECENT POLICIES (Major Laws):"""
        
        # Include recent policies if they exist
        policies = getattr(nation, 'policies', []) or []
        if policies:
            tail = policies[-2:]
            older_p = policies[:-2]
            extra = random.sample(older_p, k=min(1, len(older_p))) if older_p else []
            shown = extra + tail
            random.shuffle(shown)
            context += "\n"
            for policy in shown:
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

        context += "\nStrongest conditions:\n"
        for stat_name, data in top_stats:
            context += f"  - {data['name']}: {self._qual_stat(stat_name, data['value'])}\n"

        context += "\nWeakest / most strained conditions:\n"
        for stat_name, data in bottom_stats:
            context += f"  - {data['name']}: {self._qual_stat(stat_name, data['value'])}\n"

        q = self._qual_stat
        context += f"\nALL CONDITIONS (qualitative only — never quote scores in prose):\n"
        context += f"  Economy: GDP {q('gdp', stats.gdp)}, growth {q('economy_growth', stats.economy_growth)}, unemployment {q('unemployment', stats.unemployment)}, inflation {q('inflation', stats.inflation)}\n"
        context += f"  Society: happiness {q('happiness', stats.happiness)}, life expectancy {q('life_expectancy', stats.life_expectancy)}, literacy {q('literacy_rate', stats.literacy_rate)}\n"
        context += f"  Rights: civil rights {q('civil_rights', stats.civil_rights)}, political freedom {q('political_freedom', stats.political_freedom)}, free speech {q('freedom_speech', stats.freedom_speech)}\n"
        context += f"  Environment: environmental health {q('environment', stats.environment)}, pollution {q('pollution', stats.pollution)}, biodiversity {q('biodiversity', stats.biodiversity)}\n"
        context += f"  Security: military {q('military_strength', stats.military_strength)}, crime {q('crime_rate', stats.crime_rate)}, law enforcement {q('law_enforcement', stats.law_enforcement)}\n"
        context += f"  Equality: income equality {q('income_equality', stats.income_equality)}\n"
        context += f"  Infrastructure: scientific advancement {q('scientific_advancement', stats.scientific_advancement)}, healthcare {q('healthcare_quality', stats.healthcare_quality)}\n"
        context += f"  Population: {q('population', stats.population)}, growth {q('population_growth', stats.population_growth)}\n"
        context += f"  Budget: education {q('budget_education', stats.budget_education)}, defense {q('budget_defense', stats.budget_defense)}, healthcare {q('budget_healthcare', stats.budget_healthcare)}\n"
        context += f"  Taxes: tax rate {q('tax_rate', stats.tax_rate)}, national debt {q('national_debt', stats.national_debt)}\n"
        context += f"  International: approval {q('international_approval', getattr(stats, 'international_approval', 50))}\n"

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
