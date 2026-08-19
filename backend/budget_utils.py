"""
Budget utility functions to ensure budget allocations always sum to 100%
"""

def normalize_budget(stats: dict) -> dict:
    """
    Normalize budget allocations to sum to exactly 100%.
    
    Args:
        stats: Dictionary containing budget_ fields
    
    Returns:
        Updated stats dict with normalized budgets
    """
    budget_fields = [
        'budget_defense',
        'budget_education', 
        'budget_healthcare',
        'budget_welfare',
        'budget_environment',
        'budget_infrastructure',
        'budget_other'
    ]
    
    # Get current budget values
    budget_values = {field: stats.get(field, 0) for field in budget_fields}
    
    # Calculate current total
    total = sum(budget_values.values())
    
    # If total is 0, set equal distribution
    if total == 0:
        equal_share = 100 / len(budget_fields)
        for field in budget_fields:
            stats[field] = round(equal_share, 2)
        return stats
    
    # Normalize to 100%
    for field in budget_fields:
        stats[field] = round((budget_values[field] / total) * 100, 2)
    
    return stats


def apply_budget_change(stats: dict, budget_field: str, change: float) -> dict:
    """
    Apply a budget change and redistribute to maintain 100% total.
    
    Args:
        stats: Dictionary containing budget_ fields
        budget_field: The budget field to change (e.g., 'budget_defense')
        change: Amount to change (e.g., +5 or -3)
    
    Returns:
        Updated stats dict with normalized budgets
    """
    # Apply the change
    current = stats.get(budget_field, 0)
    new_value = max(0, min(100, current + change))  # Clamp between 0-100
    stats[budget_field] = new_value
    
    # Normalize all budgets to 100%
    return normalize_budget(stats)
