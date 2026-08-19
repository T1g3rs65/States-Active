"""Political/Economic quiz for nation creation."""

from typing import List, Dict
from models import QuizAnswer, NationStats, GovernmentType
from stats_config import classify_government

# The 15-question quiz (inspired by NationStates, Political Compass, 8values)
QUIZ_QUESTIONS = [
    {
        "id": 1,
        "question": "A company wants to build a factory that will create 500 jobs but may cause environmental damage. What do you do?",
        "options": [
            "Approve immediately - jobs are the priority",  # +economy, -environment
            "Approve with strict environmental regulations",  # Balanced
            "Deny - environment takes precedence",  # +environment, -economy
            "Let citizens vote on it",  # +political_freedom
        ]
    },
    {
        "id": 2,
        "question": "Crime rates are rising. How should your nation respond?",
        "options": [
            "Increase police funding and surveillance",  # +law_enforcement, -civil_rights
            "Focus on rehabilitation and social programs",  # +civil_rights, +budget_welfare
            "Harsh mandatory minimum sentences",  # -crime_rate, -civil_rights
            "Community policing and education",  # Balanced, +education
        ]
    },
    {
        "id": 3,
        "question": "How should healthcare be provided in your nation?",
        "options": [
            "Free universal healthcare for all",  # +healthcare, +tax_rate, +budget_healthcare
            "Government-subsidized insurance",  # Moderate
            "Private healthcare market",  # +economy, -healthcare equality
            "Basic free care, premium private options",  # Balanced
        ]
    },
    {
        "id": 4,
        "question": "A minority religious group requests exemption from certain laws based on their beliefs. What is your stance?",
        "options": [
            "Grant full exemption - religious freedom is paramount",  # +freedom_religion, -law_enforcement
            "Case-by-case evaluation",  # Balanced
            "Deny - all citizens must follow the same laws",  # -freedom_religion, +law_enforcement
            "Hold a referendum",  # +political_freedom
        ]
    },
    {
        "id": 5,
        "question": "How should the education system be structured?",
        "options": [
            "Free public education from preschool through university",  # +education, +tax_rate
            "Public K-12, private universities",  # Moderate
            "Privatized education with vouchers",  # +economy, -equality
            "Public schools with heavy STEM focus",  # +scientific_advancement
        ]
    },
    {
        "id": 6,
        "question": "Income inequality is growing. What is your solution?",
        "options": [
            "Heavily progressive taxation and wealth redistribution",  # +income_equality, +tax_rate
            "Moderate progressive taxes with social programs",  # Balanced
            "Low taxes - the market will correct itself",  # +economy, -income_equality
            "Universal basic income",  # +happiness, +income_equality, +tax_rate
        ]
    },
    {
        "id": 7,
        "question": "Foreign nations criticize your human rights record. How do you respond?",
        "options": [
            "Dismiss their concerns - sovereignty matters most",  # -international_approval, +political_freedom
            "Engage in diplomatic dialogue",  # +international_approval
            "Implement reforms to address concerns",  # +civil_rights, +international_approval
            "Strengthen censorship to control the narrative",  # -freedom_press, -civil_rights
        ]
    },
    {
        "id": 8,
        "question": "What is the ideal role of government in the economy?",
        "options": [
            "Central planning and state ownership",  # -economy, +income_equality
            "Regulated capitalism with safety nets",  # Balanced
            "Minimal intervention, free markets",  # +economy, -income_equality
            "Strategic intervention in key industries",  # Moderate
        ]
    },
    {
        "id": 9,
        "question": "A major corporation is polluting a river. What action do you take?",
        "options": [
            "Shut them down immediately",  # +environment, -economy
            "Heavy fines and strict cleanup requirements",  # +environment, moderate economy impact
            "Work with them on a voluntary compliance plan",  # Minimal impact
            "Let market forces and consumer choice handle it",  # -environment, +economy
        ]
    },
    {
        "id": 10,
        "question": "How should military and defense be prioritized?",
        "options": [
            "Large military for national security",  # +military_strength, +budget_defense
            "Moderate defense with alliances",  # Balanced
            "Minimal military, focus on diplomacy",  # -budget_defense, +budget_other
            "Strong military but mostly defensive",  # +military_strength, moderate spending
        ]
    },
    {
        "id": 11,
        "question": "The press publishes leaked government documents. What is your response?",
        "options": [
            "Prosecute the journalists and sources",  # -freedom_press, -civil_rights
            "Investigate the leak but respect press freedom",  # Balanced
            "Protect press freedom - transparency is vital",  # +freedom_press, +civil_rights
            "Nationalize the press to control information",  # -freedom_press, -political_freedom
        ]
    },
    {
        "id": 12,
        "question": "Citizens are protesting government policies. How do you handle it?",
        "options": [
            "Protect their right to protest",  # +freedom_assembly, +civil_rights
            "Allow protest with permits only",  # Moderate
            "Disperse protests to maintain order",  # -freedom_assembly, -civil_rights
            "Ban all public protests",  # -civil_rights, -political_freedom
        ]
    },
    {
        "id": 13,
        "question": "How should drug policy be approached?",
        "options": [
            "Full legalization and regulation",  # +civil_rights, +economy
            "Decriminalize use, punish dealers",  # Moderate
            "Harsh penalties for all drug offenses",  # +law_enforcement, -civil_rights
            "Medical approach with treatment programs",  # +healthcare, +civil_rights
        ]
    },
    {
        "id": 14,
        "question": "The national debt is growing. What is your strategy?",
        "options": [
            "Raise taxes to pay it down",  # +tax_rate, -national_debt
            "Cut government spending across the board",  # -budget programs, -national_debt
            "Focus on economic growth to outgrow the debt",  # +economy focus
            "Strategic mix of modest taxes and targeted cuts",  # Balanced
        ]
    },
    {
        "id": 15,
        "question": "What is your vision for your nation's future?",
        "options": [
            "A beacon of freedom and human rights",  # +civil_rights, +political_freedom
            "An economic powerhouse leading in innovation",  # +economy, +scientific_advancement
            "A harmonious society with equality for all",  # +income_equality, +happiness
            "A strong, orderly nation with clear values",  # +law_enforcement, moderate freedoms
        ]
    },
]

def calculate_starting_stats(answers: List[QuizAnswer]) -> NationStats:
    """Calculate initial nation stats based on quiz answers."""
    
    # Start with base stats
    stats = NationStats()
    
    # Create a scoring matrix for each answer
    # Format: {question_id: {answer_index: {stat_name: modifier}}}
    scoring_matrix = {
        1: {
            0: {"gdp": 15, "economy_growth": 3, "environment": -15, "pollution": 15},
            1: {"gdp": 8, "environment": -5, "corruption": -5},
            2: {"environment": 20, "gdp": -10, "unemployment": 3},
            3: {"political_freedom": 15, "democracy_score": 10},
        },
        2: {
            0: {"law_enforcement": 20, "civil_rights": -15, "crime_rate": -3},
            1: {"civil_rights": 15, "budget_welfare": 10, "happiness": 8},
            2: {"crime_rate": -5, "civil_rights": -20, "happiness": -10},
            3: {"crime_rate": -2, "budget_education": 8, "happiness": 5},
        },
        3: {
            0: {"healthcare_quality": 25, "tax_rate": 15, "budget_healthcare": 15, "happiness": 10},
            1: {"healthcare_quality": 15, "tax_rate": 8, "happiness": 5},
            2: {"gdp": 12, "healthcare_quality": -10, "income_equality": -15},
            3: {"healthcare_quality": 10, "gdp": 5, "happiness": 8},
        },
        4: {
            0: {"freedom_religion": 25, "law_enforcement": -10, "civil_rights": 15},
            1: {"freedom_religion": 10, "political_freedom": 5},
            2: {"freedom_religion": -15, "law_enforcement": 15, "civil_rights": -10},
            3: {"political_freedom": 20, "voting_rights": 15},
        },
        5: {
            0: {"literacy_rate": 5, "university_attendance": 15, "tax_rate": 12, "budget_education": 20, "income_equality": 10},
            1: {"literacy_rate": 3, "university_attendance": 8, "budget_education": 10},
            2: {"gdp": 10, "income_equality": -15, "university_attendance": -5},
            3: {"scientific_advancement": 20, "university_attendance": 10, "budget_education": 12},
        },
        6: {
            0: {"income_equality": 30, "tax_rate": 20, "gini_coefficient": -0.15, "gdp": -8},
            1: {"income_equality": 15, "tax_rate": 10, "budget_welfare": 12},
            2: {"gdp": 15, "income_equality": -20, "gini_coefficient": 0.1, "tax_rate": -10},
            3: {"income_equality": 25, "happiness": 15, "tax_rate": 15, "budget_welfare": 15},
        },
        7: {
            0: {"international_approval": -20, "political_freedom": 10},
            1: {"international_approval": 10, "political_freedom": 5},
            2: {"civil_rights": 15, "international_approval": 20, "happiness": 8},
            3: {"freedom_press": -25, "civil_rights": -20, "corruption": 15},
        },
        8: {
            0: {"gdp": -20, "income_equality": 30, "political_freedom": -15},
            1: {"gdp": 5, "income_equality": 10, "happiness": 10},
            2: {"gdp": 25, "income_equality": -20, "tax_rate": -15},
            3: {"gdp": 12, "income_equality": 5},
        },
        9: {
            0: {"environment": 25, "pollution": -20, "gdp": -15, "unemployment": 5},
            1: {"environment": 15, "pollution": -10, "gdp": -5},
            2: {"environment": -5, "pollution": 5, "gdp": 3},
            3: {"environment": -10, "pollution": 10, "gdp": 10},
        },
        10: {
            0: {"military_strength": 30, "budget_defense": 25},
            1: {"military_strength": 10, "budget_defense": 10, "international_approval": 5},
            2: {"budget_defense": -5, "military_strength": -10, "international_approval": 10},
            3: {"military_strength": 20, "budget_defense": 15},
        },
        11: {
            0: {"freedom_press": -25, "civil_rights": -20, "corruption": 10},
            1: {"freedom_press": 5, "civil_rights": 5},
            2: {"freedom_press": 25, "civil_rights": 20, "political_freedom": 15},
            3: {"freedom_press": -30, "political_freedom": -25, "civil_rights": -25},
        },
        12: {
            0: {"freedom_assembly": 25, "civil_rights": 20, "political_freedom": 15},
            1: {"freedom_assembly": 10, "civil_rights": 5},
            2: {"freedom_assembly": -15, "civil_rights": -15, "law_enforcement": 10},
            3: {"civil_rights": -30, "political_freedom": -25, "freedom_assembly": -30},
        },
        13: {
            0: {"civil_rights": 20, "gdp": 8, "crime_rate": 2},
            1: {"civil_rights": 10, "crime_rate": -2},
            2: {"law_enforcement": 15, "civil_rights": -20, "crime_rate": -3},
            3: {"healthcare_quality": 10, "civil_rights": 15, "budget_healthcare": 8},
        },
        14: {
            0: {"tax_rate": 15, "national_debt": -20, "happiness": -5},
            1: {"national_debt": -15, "budget_education": -5, "budget_healthcare": -5},
            2: {"gdp": 10, "economy_growth": 2},
            3: {"national_debt": -10, "tax_rate": 5},
        },
        15: {
            0: {"civil_rights": 20, "political_freedom": 20, "freedom_speech": 15},
            1: {"gdp": 15, "scientific_advancement": 20, "economy_growth": 3},
            2: {"income_equality": 20, "happiness": 15, "gini_coefficient": -0.1},
            3: {"law_enforcement": 15, "corruption": -10, "crime_rate": -3},
        },
    }
    
    # Apply modifiers based on answers
    for answer in answers:
        q_id = answer.question_id
        a_idx = answer.answer_index
        
        if q_id in scoring_matrix and a_idx in scoring_matrix[q_id]:
            modifiers = scoring_matrix[q_id][a_idx]
            
            for stat_name, change in modifiers.items():
                if hasattr(stats, stat_name):
                    current_value = getattr(stats, stat_name)
                    new_value = current_value + change
                    
                    # Clamp values to reasonable ranges
                    if stat_name == "gini_coefficient":
                        new_value = max(0.2, min(0.7, new_value))
                    elif stat_name in ["life_expectancy"]:
                        new_value = max(40, min(100, new_value))
                    elif stat_name in ["literacy_rate", "population"]:
                        new_value = max(0, min(100, new_value))
                    else:
                        # Most stats are 0-100
                        new_value = max(0, min(100, new_value))
                    
                    setattr(stats, stat_name, new_value)
    
    # Calculate aggregate civil rights score
    stats.civil_rights = (
        stats.freedom_speech + stats.freedom_press + 
        stats.freedom_assembly + stats.freedom_religion
    ) / 4
    
    # Adjust political freedom based on voting rights and corruption
    stats.political_freedom = (stats.voting_rights + (100 - stats.corruption)) / 2
    
    return stats

def get_quiz_questions():
    """Return all quiz questions."""
    return QUIZ_QUESTIONS
