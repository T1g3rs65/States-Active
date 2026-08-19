"""
Service to detect and create policies from issue decisions.
Policies are major decisions that define a nation's character.
"""

import logging
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)

# Keywords that indicate a policy-worthy decision
POLICY_KEYWORDS = {
    "energy": ["nuclear", "coal", "renewable", "solar", "wind", "fossil", "oil", "gas"],
    "civil_rights": ["cannabis", "marijuana", "gay", "lgbt", "abortion", "marriage", "drugs", "death penalty", "capital punishment"],
    "economy": ["universal basic income", "ubi", "minimum wage", "privatization", "nationalization", "tax", "welfare"],
    "healthcare": ["universal healthcare", "public health", "private insurance", "medicare"],
    "education": ["free education", "private schools", "university", "tuition"],
    "environment": ["climate", "carbon", "emissions", "pollution", "green", "eco"],
    "military": ["conscription", "draft", "military spending", "defense", "war", "peace"],
    "technology": ["ai", "artificial intelligence", "surveillance", "privacy", "internet", "censorship"],
    "immigration": ["immigration", "border", "refugee", "asylum", "citizenship"],
    "foreign_policy": ["alliance", "war", "peace treaty", "embargo", "sanctions"],
}

def detect_policy(issue_title: str, choice_text: str, effects: Dict[str, float]) -> Optional[str]:
    """
    Detect if a decision should create a policy.
    
    Args:
        issue_title: The issue title
        choice_text: The choice text
        effects: The stat effects of the choice
        
    Returns:
        Category name if policy should be created, None otherwise
    """
    import random
    
    issue_lower = issue_title.lower()
    choice_lower = choice_text.lower()
    combined = f"{issue_lower} {choice_lower}"
    
    # Check if this is an advisor issue
    is_advisor_issue = "[advisor report]" in issue_lower
    
    # Different policy creation rates
    if is_advisor_issue:
        # Advisor issues have 70% chance to create policy
        base_chance = 0.70
    else:
        # Normal issues have 15% chance to create policy
        base_chance = 0.15
    
    # Check for policy keywords
    category_matched = None
    for category, keywords in POLICY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in combined:
                category_matched = category
                break
        if category_matched:
            break
    
    # Check for very large stat changes (>= 10 points) - these always boost policy chance
    large_changes = {k: v for k, v in effects.items() if abs(v) >= 10}
    if large_changes:
        # Large stat changes increase policy chance by 30%
        base_chance = min(1.0, base_chance + 0.30)
        if not category_matched:
            stat_name = list(large_changes.keys())[0]
            category_matched = _stat_to_category(stat_name)
    
    # If we found a category match, roll the dice
    if category_matched and random.random() < base_chance:
        logger.info(f"Policy creation triggered! Category: {category_matched}, Advisor: {is_advisor_issue}, Chance: {base_chance*100:.0f}%")
        return category_matched
    
    return None

def _generate_policy_details(keyword: str, category: str, choice_text: str, effects: Dict[str, float]) -> Tuple[str, str]:
    """Generate policy name and description based on keyword and effects."""
    
    # Simplified policy generation
    choice_lower = choice_text.lower()
    
    # Nuclear power
    if "nuclear" in keyword:
        if any(word in choice_lower for word in ["ban", "phase out", "eliminate"]):
            return ("Nuclear Power Banned", "All nuclear power plants are prohibited")
        elif any(word in choice_lower for word in ["expand", "build", "invest"]):
            return ("Nuclear Power Expansion", "Nation invests heavily in nuclear energy")
    
    # Cannabis
    if "cannabis" in keyword or "marijuana" in keyword:
        if any(word in choice_lower for word in ["legal", "decriminal"]):
            return ("Cannabis Legalized", "Recreational cannabis is now legal")
        elif any(word in choice_lower for word in ["ban", "illegal", "criminalize"]):
            return ("Cannabis Prohibited", "Cannabis possession is a serious crime")
    
    # LGBT rights
    if any(word in keyword for word in ["gay", "lgbt"]):
        if any(word in choice_lower for word in ["legal", "allow", "recognize", "equal"]):
            return ("Marriage Equality", "Same-sex marriage is recognized")
        elif any(word in choice_lower for word in ["ban", "prohibit"]):
            return ("Traditional Marriage Only", "Marriage is defined as between one man and one woman")
    
    # UBI
    if "universal basic income" in keyword or "ubi" in keyword:
        if any(word in choice_lower for word in ["implement", "introduce", "establish"]):
            return ("Universal Basic Income", "All citizens receive monthly income from government")
    
    # Healthcare
    if "healthcare" in keyword or "health" in keyword:
        if any(word in choice_lower for word in ["universal", "free", "public"]):
            return ("Universal Healthcare", "Free healthcare for all citizens")
        elif any(word in choice_lower for word in ["private", "privatize"]):
            return ("Private Healthcare System", "Healthcare is provided by private companies")
    
    # Death penalty
    if "death penalty" in keyword or "capital punishment" in keyword:
        if any(word in choice_lower for word in ["abolish", "ban", "eliminate"]):
            return ("Death Penalty Abolished", "Capital punishment is no longer practiced")
        elif any(word in choice_lower for word in ["reinstate", "expand", "implement"]):
            return ("Death Penalty Reinstated", "Capital punishment for serious crimes")
    
    # Default: create a generic policy
    policy_name = f"{category.replace('_', ' ').title()} Policy Change"
    description = f"Policy related to {keyword}"
    return (policy_name, description)

def _stat_to_category(stat_name: str) -> str:
    """Map a stat name to a policy category."""
    stat_categories = {
        "gdp": "economy",
        "civil_rights": "civil_rights",
        "environment": "environment",
        "military_strength": "military",
        "healthcare_quality": "healthcare",
        "scientific_advancement": "technology",
        "education": "education",
    }
    return stat_categories.get(stat_name, "general")
