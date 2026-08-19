"""
Economic utility functions for calculating realistic GDP values.
"""

def calculate_realistic_gdp(population_thousands: float, gdp_stat: float) -> float:
    """
    Calculate realistic GDP in dollars based on population and GDP stat (0-100).
    
    Args:
        population_thousands: Population in thousands (e.g., 2.5 = 2,500 people)
        gdp_stat: GDP quality stat from 0-100 (represents development level)
    
    Returns:
        GDP in dollars (e.g., 50000000000 = $50 billion)
    
    Formula:
        - GDP stat determines GDP per capita
        - Very poor (0-20): $500-$5,000 per capita
        - Developing (20-40): $5,000-$15,000 per capita  
        - Developed (40-70): $15,000-$50,000 per capita
        - Advanced (70-100): $50,000-$100,000 per capita
        
        GDP = Population × GDP_per_capita
    """
    
    # Convert population from thousands to actual count
    population = population_thousands * 1000
    
    # Calculate GDP per capita based on stat (0-100)
    # Using a non-linear curve to create realistic distribution
    if gdp_stat < 20:
        # Very poor: $500 - $5,000
        gdp_per_capita = 500 + (gdp_stat / 20) * 4500
    elif gdp_stat < 40:
        # Developing: $5,000 - $15,000
        gdp_per_capita = 5000 + ((gdp_stat - 20) / 20) * 10000
    elif gdp_stat < 70:
        # Developed: $15,000 - $50,000
        gdp_per_capita = 15000 + ((gdp_stat - 40) / 30) * 35000
    else:
        # Advanced: $50,000 - $100,000
        gdp_per_capita = 50000 + ((gdp_stat - 70) / 30) * 50000
    
    # Calculate total GDP
    total_gdp = population * gdp_per_capita
    
    return total_gdp


def format_gdp_display(gdp_value: float, currency: str = "Dollar") -> str:
    """
    Format GDP value for display.
    
    Args:
        gdp_value: GDP in dollars
        currency: Currency name (e.g., "Dollar", "Credits", "Gold Coins")
    
    Returns:
        Formatted string like "$30.5 Trillion" or "500 Million Credits"
    """
    
    # Determine currency symbol
    symbol = "$" if currency.lower() in ["dollar", "dollars", "usd", "credits"] else ""
    suffix = "" if symbol else f" {currency}"
    
    # Format based on magnitude
    if gdp_value >= 1_000_000_000_000:  # Trillions
        value = gdp_value / 1_000_000_000_000
        return f"{symbol}{value:.1f} Trillion{suffix}"
    elif gdp_value >= 1_000_000_000:  # Billions
        value = gdp_value / 1_000_000_000
        return f"{symbol}{value:.1f} Billion{suffix}"
    elif gdp_value >= 1_000_000:  # Millions
        value = gdp_value / 1_000_000
        return f"{symbol}{value:.1f} Million{suffix}"
    else:  # Thousands or less
        value = gdp_value / 1000
        return f"{symbol}{value:.1f} Thousand{suffix}"


def apply_gdp_change(current_gdp_stat: float, change_amount: float, population_thousands: float) -> tuple[float, float]:
    """
    Apply a GDP stat change and return both the new stat and the new calculated GDP value.
    
    Args:
        current_gdp_stat: Current GDP stat (0-100)
        change_amount: Change to apply (e.g., +5, -3)
        population_thousands: Population in thousands
    
    Returns:
        Tuple of (new_gdp_stat, new_gdp_value)
    """
    # Clamp GDP stat to 0-100 range
    new_gdp_stat = max(0, min(100, current_gdp_stat + change_amount))
    
    # Calculate new realistic GDP
    new_gdp_value = calculate_realistic_gdp(population_thousands, new_gdp_stat)
    
    return new_gdp_stat, new_gdp_value
