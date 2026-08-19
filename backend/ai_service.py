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
        # Use OPENCLAW_GATEWAY_TOKEN for the local gateway, with legacy fallbacks.
        self.api_key = (
            api_key
            or os.environ.get("OPENCLAW_GATEWAY_TOKEN")
            or os.environ.get("XAI_API_KEY")
            or os.environ.get("EMERGENT_LLM_KEY")
        )
        
    async def generate_issues(self, nation: Nation, count: int = 3) -> List[Issue]:
        """Generate daily issues based on nation's current state."""
        
        # Build context about the nation
        context = self._build_nation_context(nation)
        
        # Create system message for issue generation
        system_message = f"""You are the issue generator for 'SovereignHex', a nation simulation game.

Your task is to generate realistic, nuanced policy dilemmas that:
1. Reflect the nation's current situation and stats
2. Have NO clear "right" answer - all choices have trade-offs
3. Range from mundane (local issues) to dramatic (national crises)
4. Feel authentic to the nation's government type and culture
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
      ]
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
                    choices=choices
                )
                issues.append(issue)
            
            return issues
            
        except Exception as e:
            print(f"Error generating issues: {e}")
            # Return fallback issues
            return self._get_fallback_issues(nation)
    
    async def generate_nation_description(self, nation: Nation) -> str:
        """Generate dynamic nation description based on current stats."""
        
        context = self._build_nation_context(nation)
        
        system_message = f"""You are a creative writer for 'Emergent: Rise of Nations'.

Write a vivid, engaging 300-600 word description of the nation based on its current stats.

The description should:
1. Paint a picture of what life is like for ordinary citizens
2. Reflect the government type and political atmosphere
3. Mention notable strengths and challenges
4. Include specific details about culture, economy, and society
5. Use evocative language and concrete examples
6. Evolve based on stat thresholds (e.g., describe differently if civil_rights > 85 vs < 20)

Current Nation Context:
{context}

Write in third person, present tense. Make it feel like a living, breathing nation with real people and real consequences from policy decisions."""
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"desc_gen_{nation.id}_{datetime.utcnow().timestamp()}",
            system_message=system_message
        )
        
        user_message = UserMessage(
            text=f"Write a compelling nation description for {nation.name}, a {nation.government_type.value}."
        )
        
        try:
            response = await chat.send_message(user_message)
            return response
        except Exception as e:
            print(f"Error generating description: {e}")
            return self._get_fallback_description(nation)
    
    def _build_nation_context(self, nation: Nation) -> str:
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
        
        context = f"""Nation: {nation.name}
Species/Race: {race_info['name']}
Government Type: {nation.government_type.value}
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
        return f"{nation.name} is a {nation.government_type.value} finding its place in the world. Through careful governance and strategic decisions, the nation continues to evolve and face new challenges each day."
