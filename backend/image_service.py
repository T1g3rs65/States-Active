import os
import logging
from datetime import datetime
from grok_client import LlmChat, UserMessage

logger = logging.getLogger(__name__)

# Initialize LLM client - use OPENCLAW_GATEWAY_TOKEN for the local gateway.
XAI_API_KEY = (
    os.environ.get('OPENCLAW_GATEWAY_TOKEN')
    or os.environ.get('XAI_API_KEY')
    or os.environ.get('EMERGENT_LLM_KEY')
)

async def generate_policy_law(
    category: str, 
    nation_name: str,
    issue_title: str,
    issue_description: str,
    choice_text: str,
    stat_effects: dict
) -> tuple:
    """
    Generate both law name and description using GPT-4o.
    
    Args:
        category: Policy category (e.g., "energy", "civil_rights")
        nation_name: Name of the nation
        issue_title: The issue title
        issue_description: Full issue description
        choice_text: What the player chose
        stat_effects: Stat changes from the choice
        
    Returns:
        Tuple of (law_name, law_description)
    """
    try:
        # Get current year for realistic policy naming
        current_year = datetime.now().year
        next_year = current_year + 1
        year_after = current_year + 2
        
        # Format stat effects for context
        effects_str = ""
        if stat_effects:
            effects_str = "Stat Changes: " + ", ".join([f"{k}: {v:+.1f}" for k, v in stat_effects.items()])
        
        prompt = f"""You are writing LEGISLATION for {nation_name}. You must be EXTREMELY SPECIFIC.

IMPORTANT: The current year is {current_year}. If you include a year in your law name or description, use {current_year} or future years like {next_year}, {year_after}.

CONTEXT:
The player was presented with this issue: "{issue_title}"
Full situation: {issue_description}

THE PLAYER CHOSE THIS OPTION:
"{choice_text}"

Results: {effects_str}

YOUR JOB: Write a law name and description that PRECISELY describes what the player's choice means IN PRACTICE.

FORMAT (MUST FOLLOW):
LAW_NAME|||DESCRIPTION

CRITICAL RULES:
1. LAW_NAME must be creative and specific (NOT generic like "Technology Act" or "Education Reform")
2. DESCRIPTION must answer: WHAT exactly is changing? WHO is affected? HOW will it work? WHAT are the specific provisions?
3. Use CONCRETE details from the player's choice
4. Include specific numbers, timelines, requirements, or enforcement mechanisms
5. If using a year, use {current_year} or later (NEVER use past years like 2024)

EXCELLENT EXAMPLES:

Smart Device Encryption Mandate of {current_year}|||All smartphones, computers, and IoT devices sold in {nation_name} must have end-to-end encryption enabled by default. Manufacturers face a $500 fine per device sold without encryption. The law takes effect in 6 months, with a 2-year grace period for existing inventory.

Zero-Emission Vehicle Acceleration Program|||Starting January {next_year}, all new vehicles sold must be electric or hydrogen-powered. Gas stations must install EV charging infrastructure by {year_after} or face closure. The government will provide $15,000 tax credits for EV purchases and build 50,000 public charging stations nationwide.

Universal Pre-K Education Act|||Free pre-kindergarten education is now available to all 3-4 year olds in {nation_name}. The government will hire 100,000 new teachers and build 10,000 new facilities over 5 years. Funded by a 2% increase in corporate tax rate for companies earning over $100 million annually.

Police Department Expansion and Training Initiative|||Police forces will expand by 25% over 3 years, hiring 50,000 new officers. All officers must complete 400 hours of de-escalation and cultural sensitivity training. Every officer will be equipped with body cameras by {next_year}, with footage stored for 5 years. Citizens can file complaints through a new independent oversight board with subpoena power.

TERRIBLE EXAMPLES (NEVER DO THIS):
Technology Reform Act|||New technology policies enacted
Energy Policy|||Changes to energy sector
Something Act of 2024|||[Any past year is wrong - we are in {current_year}!]

REMEMBER: The player chose "{choice_text}" - your law MUST reflect EXACTLY what that choice means!

Write the law now:"""

        logger.info(f"Generating law name and description for {category} category")
        
        # Use LlmChat to generate text
        system_msg = "You are a legislative writer creating specific, detailed law descriptions for a nation-building game."
        chat = LlmChat(
            api_key=XAI_API_KEY,
            session_id=f"policy_{category}_{nation_name}",
            system_message=system_msg
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response - expect format "LAW_NAME|||DESCRIPTION"
        if "|||" in response:
            parts = response.split("|||")
            law_name = parts[0].strip()
            description = parts[1].strip()
        else:
            # Fallback if format not followed
            law_name = f"{policy_name} Act"
            description = response.strip()
        
        logger.info(f"Successfully generated law: {law_name}")
        return (law_name, description)
        
    except Exception as e:
        logger.error(f"Error generating law: {e}")
        # Return a default if generation fails
        return (f"{category.replace('_', ' ').title()} Act", f"{nation_name} has enacted a new policy affecting {category.replace('_', ' ')}.")
