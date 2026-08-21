"""Configuration for all nation statistics and their relationships."""

from typing import Dict, List, Tuple
from models import GovernmentType

# Stat definitions with ranges and descriptions
STAT_DEFINITIONS = {
    "gdp": {"min": 0, "max": 100, "default": 50, "name": "GDP per Capita", "higher_is_better": True},
    "economy_growth": {"min": -10, "max": 15, "default": 2, "name": "Economic Growth", "higher_is_better": True},
    "unemployment": {"min": 0, "max": 50, "default": 5, "name": "Unemployment Rate", "higher_is_better": False},
    "inflation": {"min": -5, "max": 20, "default": 2, "name": "Inflation Rate", "higher_is_better": False},
    "civil_rights": {"min": 0, "max": 100, "default": 50, "name": "Civil Rights", "higher_is_better": True},
    "freedom_speech": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Speech", "higher_is_better": True},
    "freedom_press": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Press", "higher_is_better": True},
    "freedom_assembly": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Assembly", "higher_is_better": True},
    "freedom_religion": {"min": 0, "max": 100, "default": 50, "name": "Freedom of Religion", "higher_is_better": True},
    "political_freedom": {"min": 0, "max": 100, "default": 50, "name": "Political Freedom", "higher_is_better": True},
    "voting_rights": {"min": 0, "max": 100, "default": 50, "name": "Voting Rights", "higher_is_better": True},
    "corruption": {"min": 0, "max": 100, "default": 50, "name": "Corruption Level", "higher_is_better": False},
    "political_apathy": {"min": 0, "max": 100, "default": 50, "name": "Political Apathy", "higher_is_better": False},
    "happiness": {"min": 0, "max": 100, "default": 50, "name": "Happiness Index", "higher_is_better": True},
    "life_expectancy": {"min": 40, "max": 100, "default": 75, "name": "Life Expectancy", "higher_is_better": True},
    "obesity_rate": {"min": 0, "max": 60, "default": 20, "name": "Obesity Rate", "higher_is_better": False},
    "environment": {"min": 0, "max": 100, "default": 50, "name": "Environmental Health", "higher_is_better": True},
    "pollution": {"min": 0, "max": 100, "default": 50, "name": "Pollution Level", "higher_is_better": False},
    "biodiversity": {"min": 0, "max": 100, "default": 50, "name": "Biodiversity", "higher_is_better": True},
    "eco_footprint": {"min": 0, "max": 100, "default": 50, "name": "Ecological Footprint", "higher_is_better": False},
    "healthcare_quality": {"min": 0, "max": 100, "default": 50, "name": "Healthcare Quality", "higher_is_better": True},
    "literacy_rate": {"min": 0, "max": 100, "default": 95, "name": "Literacy Rate", "higher_is_better": True},
    "university_attendance": {"min": 0, "max": 80, "default": 30, "name": "University Attendance", "higher_is_better": True},
    "scientific_advancement": {"min": 0, "max": 100, "default": 50, "name": "Scientific Advancement", "higher_is_better": True},
    "crime_rate": {"min": 0, "max": 50, "default": 5, "name": "Crime Rate", "higher_is_better": False},
    "law_enforcement": {"min": 0, "max": 100, "default": 50, "name": "Law Enforcement", "higher_is_better": True},
    "military_strength": {"min": 0, "max": 100, "default": 50, "name": "Military Strength", "higher_is_better": True},
    "budget_defense": {"min": 0, "max": 50, "default": 10, "name": "Defense Budget", "higher_is_better": False},
    "income_equality": {"min": 0, "max": 100, "default": 50, "name": "Income Equality", "higher_is_better": True},
    "gini_coefficient": {"min": 0.2, "max": 0.7, "default": 0.35, "name": "Gini Coefficient", "higher_is_better": False},
    "population": {"min": 1, "max": 1000, "default": 10, "name": "Population (millions)", "higher_is_better": True},
    "population_growth": {"min": -5, "max": 10, "default": 1, "name": "Population Growth", "higher_is_better": True},
    "national_debt": {"min": 0, "max": 200, "default": 40, "name": "National Debt", "higher_is_better": False},
    "tax_rate": {"min": 0, "max": 80, "default": 25, "name": "Average Tax Rate", "higher_is_better": False},
    "international_approval": {"min": 0, "max": 100, "default": 50, "name": "International Approval", "higher_is_better": True},
}

# Enhanced government type classification using multiple stats
def classify_government(civil_rights: float, economy: float, political_freedom: float, 
                       environment: float = 50, military: float = 50, 
                       scientific: float = 50, crime: float = 5, 
                       race: str = "human") -> GovernmentType:
    """Classify government type based on multiple dimensions and race."""
    
    # Use Zythera-specific classification for Zythera race
    if race and race.lower() == "zythera":
        return classify_zythera_government(civil_rights, economy, political_freedom, 
                                           environment, military, scientific, crime)
    
    # Extreme cases first
    if political_freedom < 20 and economy < 20 and civil_rights < 20:
        return GovernmentType.ANARCHY
    
    if political_freedom < 15 and civil_rights < 15:
        return GovernmentType.PSYCHOTIC_DICTATORSHIP
        
    # Environment-focused
    if environment >= 80 and economy < 40 and civil_rights >= 65:
        return GovernmentType.ECO_SOCIALIST_HAVEN
        
    # Welfare state
    if economy < 45 and civil_rights >= 70 and political_freedom >= 65:
        if environment < 40:
            return GovernmentType.WELFARE_PARADISE
        else:
            return GovernmentType.LEFT_WING_UTOPIA
    
    # Scandinavian model
    if civil_rights >= 75 and economy >= 40 and economy < 70 and political_freedom >= 75:
        return GovernmentType.SCANDINAVIAN_PARADISE
    
    # Tech-focused
    if scientific >= 75 and economy >= 70:
        return GovernmentType.TECH_OLIGARCHY
    
    # Laissez-faire
    if economy >= 80 and political_freedom >= 70 and civil_rights >= 60:
        return GovernmentType.LAISSEZ_FAIRE_DYNAMO
        
    # Trade focused
    if economy >= 70 and political_freedom >= 55 and military < 40:
        return GovernmentType.TRADE_EMPIRE
    
    # Surveillance state
    if civil_rights < 35 and crime < 2 and political_freedom < 40:
        return GovernmentType.SURVEILLANCE_PANOPTICON
    
    # Military rule
    if military >= 75 and political_freedom < 40:
        return GovernmentType.MARTIAL_COMMAND
        
    # Libertarian extremes
    if civil_rights >= 85 and political_freedom >= 80 and economy >= 70:
        if scientific >= 65:
            return GovernmentType.SEASTEAD_REPUBLIC
        elif crime >= 8:
            return GovernmentType.PSYCHEDELIC_FREE_STATE
        else:
            return GovernmentType.CIVIL_RIGHTS_LOVEFEST
    
    # Meritocracy
    if scientific >= 70 and civil_rights >= 60 and political_freedom >= 60:
        return GovernmentType.PRAGMATIC_MERITOCRACY
    
    # Technocracy
    if scientific >= 75 and political_freedom >= 50:
        return GovernmentType.TECHNOCRATIC_SYNDICATE
    
    # Corporate dominance
    if economy >= 75:
        if civil_rights >= 70 and political_freedom >= 70:
            return GovernmentType.CAPITALIST_PARADISE
        elif civil_rights < 40 or political_freedom < 40:
            if crime >= 6:
                return GovernmentType.CORPORATE_BORDELLO
            else:
                return GovernmentType.CORPORATE_POLICE_STATE
        elif civil_rights >= 60:
            return GovernmentType.RIGHT_WING_UTOPIA
    
    # Free market
    if economy >= 70 and political_freedom >= 75:
        return GovernmentType.FREE_MARKET_PARADISE
    
    # Cyberpunk (high tech, low rights, high economy)
    if scientific >= 70 and civil_rights < 45 and economy >= 65:
        return GovernmentType.CYBERPUNK_MEGACITY
    
    # Pirate haven (high crime, high freedom)
    if crime >= 12 and civil_rights >= 75 and political_freedom >= 70:
        return GovernmentType.PIRATE_HAVEN
    
    # Liberal democracy (balanced high)
    if civil_rights >= 70 and political_freedom >= 70 and economy >= 60:
        return GovernmentType.LIBERAL_DEMOCRACY
    
    # Democratic socialists
    if civil_rights >= 65 and political_freedom >= 60 and economy < 50:
        return GovernmentType.DEMOCRATIC_SOCIALISTS
    
    # Socialist states (low economy, moderate/low freedoms)
    # People's Republic - authoritarian socialist (low freedoms, low economy)
    if economy < 35 and political_freedom < 40 and civil_rights < 50:
        return GovernmentType.PEOPLES_REPUBLIC
    
    # Socialist Republic - moderate freedoms, socialist economy
    if economy < 40 and civil_rights >= 35 and civil_rights < 65:
        return GovernmentType.SOCIALIST_REPUBLIC
    
    # Authoritarian spectrum
    if political_freedom < 30:
        if economy >= 60:
            return GovernmentType.IRON_FIST_CONSUMERISTS
        elif civil_rights >= 50:
            return GovernmentType.BENEVOLENT_DICTATORSHIP
        elif economy < 35:
            return GovernmentType.CORRUPT_DICTATORSHIP
    
    # Moralistic
    if civil_rights < 40 and political_freedom >= 40 and political_freedom < 70:
        return GovernmentType.MORALISTIC_DEMOCRACY
    
    # Centrist
    if 40 <= civil_rights <= 65 and 40 <= economy <= 65 and 40 <= political_freedom <= 65:
        return GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY
    
    # Authoritarian democracy
    if political_freedom < 50 and civil_rights >= 40 and economy >= 50:
        return GovernmentType.AUTHORITARIAN_DEMOCRACY
    
    # Father knows best
    if civil_rights < 50 and political_freedom < 50 and economy >= 40:
        return GovernmentType.FATHER_KNOWS_BEST_STATE
    
    # Default fallback
    return GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY


def classify_zythera_government(civil_rights: float, economy: float, political_freedom: float, 
                                environment: float = 50, military: float = 50, 
                                scientific: float = 50, crime: float = 5) -> GovernmentType:
    """Classify Zythera hive government type based on stats. All led by Queens."""
    
    # Extreme/chaotic
    if political_freedom < 20 and civil_rights < 20:
        return GovernmentType.SPLINTER_COLONY  # Anarchic, competing queens
    
    if political_freedom < 15 and civil_rights < 15 and economy < 30:
        return GovernmentType.PARASITIC_HIVE  # Exploitative, extractive
    
    # Hivemind (very low freedom, high order)
    if political_freedom < 25 and civil_rights < 25 and crime < 2:
        return GovernmentType.HIVEMIND_COLLECTIVE
    
    # Military focus
    if military >= 75 and political_freedom < 45:
        return GovernmentType.MILITANT_HIVE
    
    # Imperial expansion
    if military >= 65 and economy >= 60 and political_freedom < 40:
        return GovernmentType.IMPERIAL_SWARM
    
    # Divine/Religious hive
    if civil_rights < 40 and political_freedom < 35 and environment >= 60:
        return GovernmentType.DIVINE_HIVE
    
    # Traditional monarchy (strict hierarchy)
    if political_freedom < 40 and civil_rights < 45 and economy >= 50:
        return GovernmentType.ROYAL_HIVE
    
    # Ordered bureaucracy
    if political_freedom < 50 and civil_rights >= 40 and economy >= 55 and crime < 4:
        return GovernmentType.ORDERED_COLONY
    
    # Collective (left-wing authoritarian)
    if economy < 45 and civil_rights >= 50 and political_freedom < 50:
        return GovernmentType.COLLECTIVE_HIVE
    
    # Worker's equality (left-wing)
    if economy < 40 and civil_rights >= 60 and political_freedom >= 50:
        return GovernmentType.WORKERS_SWARM
    
    # Tech focused
    if scientific >= 70 and economy >= 60:
        return GovernmentType.TECHNO_SWARM
    
    # Merchant/trade focused
    if economy >= 70 and political_freedom >= 55:
        return GovernmentType.MERCHANT_HIVE
    
    # Environmental harmony
    if environment >= 70 and civil_rights >= 60:
        return GovernmentType.NURTURING_HIVE
    
    # Cooperative/symbiotic (high freedom, collective)
    if civil_rights >= 70 and political_freedom >= 65 and economy < 60:
        return GovernmentType.SYMBIOTIC_SWARM
    
    # Free colony (maximum freedom)
    if civil_rights >= 75 and political_freedom >= 75:
        return GovernmentType.FREE_COLONY
    
    # Harmonious (balanced high)
    if civil_rights >= 60 and political_freedom >= 60 and economy >= 50:
        return GovernmentType.HARMONIOUS_HIVE
    
    # Diplomatic focus
    if civil_rights >= 55 and political_freedom >= 50 and military < 40:
        return GovernmentType.DIPLOMATIC_SWARM
    
    # Default balanced
    return GovernmentType.BALANCED_HIVE


def get_government_description(gov_type: GovernmentType) -> str:
    """Get a brief description of the government type."""
    descriptions = {
        # Human Government Types
        GovernmentType.LEFT_WING_UTOPIA: "Public ownership, tight equality.",
        GovernmentType.SCANDINAVIAN_PARADISE: "High tax, high services, still a market.",
        GovernmentType.LIBERAL_DEMOCRACY: "Elections and civil liberties.",
        GovernmentType.CAPITALIST_PARADISE: "Light regulation, business first.",
        GovernmentType.RIGHT_WING_UTOPIA: "Small state. Property and little else.",
        GovernmentType.ECO_SOCIALIST_HAVEN: "Green rules and public ownership.",
        GovernmentType.WELFARE_PARADISE: "Cradle-to-grave benefits.",
        GovernmentType.LAISSEZ_FAIRE_DYNAMO: "No industrial policy.",
        GovernmentType.CIVIL_RIGHTS_LOVEFEST: "The state gets out of the way.",
        GovernmentType.FREE_MARKET_PARADISE: "Competition is the only plan.",
        GovernmentType.DEMOCRATIC_SOCIALISTS: "Elected government, heavy welfare.",
        GovernmentType.CORPORATE_POLICE_STATE: "Firms write the rules.",
        GovernmentType.AUTHORITARIAN_DEMOCRACY: "Votes happen. Same people stay in.",
        GovernmentType.BENEVOLENT_DICTATORSHIP: "One ruler. Competent, not free.",
        GovernmentType.IRON_FIST_CONSUMERISTS: "Shop freely. Do not talk politics.",
        GovernmentType.MORALISTIC_DEMOCRACY: "The majority voted in a moral code.",
        GovernmentType.PSYCHOTIC_DICTATORSHIP: "Terror as policy.",
        GovernmentType.ANARCHY: "No centre.",
        GovernmentType.FATHER_KNOWS_BEST_STATE: "The state parents you.",
        GovernmentType.TECH_OLIGARCHY: "Engineers in the cabinet.",
        GovernmentType.TRADE_EMPIRE: "Ports and deals.",
        GovernmentType.SURVEILLANCE_PANOPTICON: "Cameras. No private life.",
        GovernmentType.THEOCRATIC_ENFORCERS: "Clergy as law.",
        GovernmentType.MARTIAL_COMMAND: "Generals keep the peace.",
        GovernmentType.SEASTEAD_REPUBLIC: "Offshore, lightly taxed.",
        GovernmentType.PSYCHEDELIC_FREE_STATE: "Drugs are legal.",
        GovernmentType.PRAGMATIC_MERITOCRACY: "Exams beat bloodlines.",
        GovernmentType.TECHNOCRATIC_SYNDICATE: "Specialists vote.",
        GovernmentType.INOFFENSIVE_CENTRIST_DEMOCRACY: "The middle of every chart.",
        GovernmentType.CORPORATE_BORDELLO: "If it sells, it's legal.",
        GovernmentType.CORRUPT_DICTATORSHIP: "The palace is a payroll.",
        GovernmentType.CYBERPUNK_MEGACITY: "High tech, bad streets.",
        GovernmentType.PIRATE_HAVEN: "No extradition.",
        GovernmentType.SOCIALIST_REPUBLIC: "Central plan, some speech.",
        GovernmentType.PEOPLES_REPUBLIC: "The party owns the press.",
        
        # Zythera Hive Government Types
        GovernmentType.COLLECTIVE_HIVE: "Shares are even. Queen as quartermaster.",
        GovernmentType.WORKERS_SWARM: "Labour caste runs production.",
        GovernmentType.ROYAL_HIVE: "Caste is law.",
        GovernmentType.IMPERIAL_SWARM: "The hive grows by taking ground.",
        GovernmentType.DIVINE_HIVE: "The Queen is worshipped.",
        GovernmentType.MILITANT_HIVE: "Warrior caste first.",
        GovernmentType.ORDERED_COLONY: "Forms, rosters, quotas.",
        GovernmentType.SYMBIOTIC_SWARM: "Room for individuals inside the hive.",
        GovernmentType.NURTURING_HIVE: "The Queen spends on brood and sick.",
        GovernmentType.MERCHANT_HIVE: "Trade first.",
        GovernmentType.TECHNO_SWARM: "Labs outrank temples.",
        GovernmentType.HARMONIOUS_HIVE: "Neither tight nor loose.",
        GovernmentType.FREE_COLONY: "The Queen lets subjects wander.",
        GovernmentType.BALANCED_HIVE: "Whatever the hive needs this season.",
        GovernmentType.DIPLOMATIC_SWARM: "Treaties over raids.",
        GovernmentType.PARASITIC_HIVE: "Tribute in, work out.",
        GovernmentType.HIVEMIND_COLLECTIVE: "Individual thought merges into the Queen's will.",
        GovernmentType.SPLINTER_COLONY: "Rival queens compete in chaotic power struggles.",
    }
    return descriptions.get(gov_type, "A nation finding its identity.")
