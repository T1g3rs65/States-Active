"""
Portrait Generation Service
Generates unique Zythera Queen portraits using AI with style references.
"""

import os
import base64
import random
import logging
from pathlib import Path
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Reference portrait descriptions for style consistency
ZYTHERA_QUEEN_STYLE = """
Art style: Pony Diffusion / Anime-influenced digital painting
Character: Zythera Queen - beautiful insectoid alien humanoid female
Physical features:
- Teal/cyan colored skin with subtle iridescent shimmer
- Four elegant antennae extending from the head
- Orange or amber glowing eyes
- Chitinous "hair-like" structure framing the face, can be styled elegantly
- Delicate facial features combining human beauty with alien grace
- Large, transparent, iridescent insect-like wings (butterfly/dragonfly style)
Composition: Portrait style, head and upper body, regal pose
Lighting: Dramatic, with glowing highlights on eyes and wing edges
"""

NORMAL_QUEEN_STYLE = """
Expression: Serene, wise, benevolent, motherly
Attire: Elegant royal robes or ornate ceremonial dress
Colors: Rich purples, teals, golds, silver accents
Mood: Peaceful, nurturing, harmonious
Background: Soft ethereal glow, hive architecture hints
"""

EVIL_QUEEN_STYLE = """
Expression: Cold, calculating, menacing, imperious
Attire: Dark armor, spiky crown, intimidating regalia
Colors: Black, deep purple, blood red, toxic green accents
Mood: Threatening, dominant, oppressive
Background: Dark shadows, ominous lighting, industrial hive elements
"""

class PortraitService:
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        self.portraits_dir = Path("/app/frontend/assets/portraits")
        self.generated_dir = self.portraits_dir / "generated"
        self.generated_dir.mkdir(exist_ok=True)
        
    async def generate_zythera_queen_portrait(
        self, 
        nation_id: str, 
        nation_name: str, 
        is_evil: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate a unique Zythera Queen portrait for a nation.
        
        Returns:
            Tuple of (success, portrait_path or error_message)
        """
        try:
            from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
            
            if not self.api_key:
                logger.error("EMERGENT_LLM_KEY not found")
                return False, "API key not configured"
            
            # Build the prompt
            style_modifier = EVIL_QUEEN_STYLE if is_evil else NORMAL_QUEEN_STYLE
            
            # Add unique elements based on nation name
            unique_elements = self._generate_unique_elements(nation_name, is_evil)
            
            prompt = f"""
{ZYTHERA_QUEEN_STYLE}

{style_modifier}

Unique character details for this queen:
{unique_elements}

Generate a stunning portrait of this Zythera Queen in the described art style.
High quality, detailed, professional digital art.
"""
            
            logger.info(f"Generating portrait for nation {nation_id} ({nation_name})")
            
            # Generate the image
            image_gen = OpenAIImageGeneration(api_key=self.api_key)
            images = await image_gen.generate_images(
                prompt=prompt,
                model="gpt-image-1",
                number_of_images=1
            )
            
            if not images or len(images) == 0:
                logger.error("No image was generated")
                return False, "No image generated"
            
            # Save the image
            portrait_filename = f"zythera_queen_{nation_id}.png"
            portrait_path = self.generated_dir / portrait_filename
            
            with open(portrait_path, "wb") as f:
                f.write(images[0])
            
            logger.info(f"Portrait saved to {portrait_path}")
            
            # Store URL path in database (for frontend to fetch)
            portrait_url = f"/api/generated-portraits/{portrait_filename}"
            from bson import ObjectId
            await self.db.nations.update_one(
                {"_id": ObjectId(nation_id)},
                {"$set": {"custom_portrait": portrait_url}}
            )
            logger.info(f"Database updated with custom_portrait URL for nation {nation_id}: {portrait_url}")
            
            return True, portrait_url
            
        except Exception as e:
            logger.error(f"Error generating portrait: {e}")
            return False, str(e)
    
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
