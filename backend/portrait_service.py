"""
Portrait Generation Service

Deprecated (GH-78): the `emergentintegrations` image-generation provider was
removed. `generate_zythera_queen_portrait` is now a fail-fast stub; fallback
portrait selection (`get_fallback_portrait`) is retained.
"""

import os
import random
import logging
from pathlib import Path
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class PortraitService:
    def __init__(self, db):
        self.db = db
        self.portraits_dir = Path("/app/frontend/assets/portraits")
        
    async def generate_zythera_queen_portrait(
        self, 
        nation_id: str, 
        nation_name: str, 
        is_evil: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate a unique Zythera Queen portrait for a nation.

        DEPRECATED (GH-78): image generation previously used the removed
        `emergentintegrations` provider, which is no longer supported or
        installed. Image generation now routes through the OpenClaw gateway.
        This method is kept as a stub that fails fast; it returns
        ``(False, message)`` and never attempts the dead provider import.

        Returns:
            Tuple of (success, portrait_path or error_message)
        """
        logger.error(
            "PortraitService.generate_zythera_queen_portrait is deprecated: "
            "the `emergentintegrations` provider was removed. Image generation "
            "now routes through the OpenClaw gateway. Use get_fallback_portrait "
            "or the gateway-backed path instead."
        )
        return False, (
            "Deprecated: `emergentintegrations` provider removed. "
            "Image generation now routes through the OpenClaw gateway."
        )
    
    def _generate_unique_elements(self, nation_name: str, is_evil: bool) -> str:
        """Generate unique visual elements based on nation name."""
        # Use nation name hash to seed random choices for consistency
        random.seed(hash(nation_name))
        
        # Antenna styles
        antenna_styles = [
            "elegant curved antennae with golden tips",
            "crystalline antennae that glow faintly",
            "feathered antennae with iridescent fronds",
            "spiral antennae with bioluminescent patterns",
            "sleek antennae with jeweled ornaments",
            "branching antennae like delicate coral"
        ]
        
        # Wing patterns
        wing_patterns = [
            "wings with swirling galaxy patterns",
            "wings with geometric honeycomb designs",
            "wings resembling stained glass",
            "wings with flowing aurora colors",
            "wings with fractal crystalline structures",
            "wings with bioluminescent veins"
        ]
        
        # Crown/headdress styles
        if is_evil:
            crowns = [
                "a crown of twisted black thorns",
                "a spiky obsidian diadem",
                "a helmet-crown with sharp edges",
                "a dark metallic crown with glowing red gems",
                "an asymmetric crown of fused chitin and metal"
            ]
        else:
            crowns = [
                "an elegant tiara of woven gold and crystal",
                "a living crown of flowers and vines",
                "a delicate circlet with floating gems",
                "a traditional hive-mother's crown",
                "an ornate headdress with dangling jewels"
            ]
        
        # Skin markings
        markings = [
            "subtle bioluminescent markings on cheeks",
            "intricate natural patterns on the forehead",
            "glowing lines tracing the jaw",
            "constellation-like spots near the eyes",
            "flowing patterns down the neck"
        ]
        
        elements = [
            random.choice(antenna_styles),
            random.choice(wing_patterns),
            random.choice(crowns),
            random.choice(markings)
        ]
        
        # Reset random seed
        random.seed()
        
        return "\n- ".join([""] + elements)
    
    def get_fallback_portrait(self, nation_name: str, is_evil: bool) -> str:
        """Get a fallback portrait path based on nation name hash."""
        if is_evil:
            portraits_dir = self.portraits_dir / "zythera_queens_evil"
            prefix = "queen_evil_"
            count = 10
        else:
            portraits_dir = self.portraits_dir / "zythera_queens"
            prefix = "queen_"
            count = 12
        
        # Use hash of nation name for consistent selection
        index = abs(hash(nation_name)) % count + 1
        return str(portraits_dir / f"{prefix}{index}.jpg")
