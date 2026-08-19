import asyncio
import base64
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

# Advisor roles and their characteristics
ADVISORS = [
    {"slot": 1, "title": "First Minister", "gender": "female", "human_gender": "female", "personality": "wise, dignified leader"},
    {"slot": 2, "title": "Treasurer", "gender": "female", "human_gender": "male", "personality": "shrewd, calculating financier"},
    {"slot": 3, "title": "Marshal", "gender": "male", "human_gender": "male", "personality": "stern, battle-hardened warrior"},
    {"slot": 4, "title": "Minister of Culture", "gender": "female", "human_gender": "female", "personality": "elegant, artistic patron"},
    {"slot": 5, "title": "Spymaster", "gender": "female", "human_gender": "male", "personality": "mysterious, cunning intelligence agent"},
    {"slot": 6, "title": "Chief Builder", "gender": "female", "human_gender": "female", "personality": "practical, industrious engineer"},
    {"slot": 7, "title": "Grand Diplomat", "gender": "female", "human_gender": "male", "personality": "charming, sophisticated ambassador"},
    {"slot": 8, "title": "Royal Scientist", "gender": "female", "human_gender": "female", "personality": "brilliant, curious researcher"},
]

# Base prompt for Zythera - matching reference image EXACTLY
ZYTHERA_BASE = """Digital character art of a Zythera alien, waist-up portrait showing head, shoulders and upper torso with clothing clearly visible.

ALIEN FEATURES:
- Smooth teal/cyan skin with subtle highlights
- Long flowing dark teal chitin tendrils framing face like hair
- Multiple thin elegant antennae extending upward from head
- Large beautiful orange/amber glowing eyes
- Clean smooth teal face
- Beautiful, elegant alien

COMPOSITION: Waist-up shot. The character's outfit/uniform MUST be clearly visible taking up the lower half of the image.

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Background: Dark gradient
"""

# Base prompt for Human - same stylized art style, NO orange uniforms
HUMAN_BASE = """Digital art portrait, upper body only, of a human government official - stylized concept art.

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Like character art from a high-quality video game.
Attractive, professional human with elegant features.
Soft lighting, elegant composition.
Background: Dark gradient
"""

# Uniform descriptions for Zythera (black and orange)
ZYTHERA_UNIFORMS = {
    1: "wearing elegant black and orange First Minister robes with gold accents, high collar",
    2: "wearing sleek black and orange Treasurer uniform, professional fitted attire",
    3: "wearing imposing black and orange military armor, Marshal battle gear with shoulder guards",
    4: "wearing flowing black and orange Minister of Culture robes, artistic elegant garments",
    5: "wearing dark black and orange Spymaster cloak, mysterious agent attire",
    6: "wearing practical black and orange Chief Builder uniform, engineering details",
    7: "wearing refined black and orange Diplomat formal wear, elegant ambassador attire",
    8: "wearing black and orange Royal Scientist coat, laboratory attire",
}

# Uniform descriptions for Humans (professional, NOT black/orange)
HUMAN_UNIFORMS = {
    1: "wearing elegant dark blue and silver First Minister formal robes, dignified attire",
    2: "wearing professional dark gray Treasurer suit, refined business attire",
    3: "wearing military dress uniform with medals, Marshal formal military attire",
    4: "wearing elegant burgundy Minister of Culture robes, artistic formal wear",
    5: "wearing dark mysterious Spymaster attire, intelligence agent formal wear",
    6: "wearing professional Chief Builder uniform, practical but formal",
    7: "wearing refined Diplomat formal suit, elegant ambassador attire",
    8: "wearing white Royal Scientist coat over formal attire, professional",
}

async def generate_portrait(image_gen, race, advisor, output_dir):
    """Generate a single portrait"""
    
    if race == "zythera":
        # For Zythera, all female except Marshal
        gender = "male" if advisor["slot"] == 3 else "female"
        uniform = ZYTHERA_UNIFORMS[advisor["slot"]]
        prompt = f"""{ZYTHERA_BASE}
Character: {advisor['title']} ({gender})
Clothing: {uniform}

The character is wearing a BLACK and ORANGE uniform. Show the outfit clearly visible on the body.
Teal alien with chitin tendrils, orange eyes, wearing black and orange government/military attire.
"""
    else:  # human
        gender = advisor["human_gender"]
        uniform = HUMAN_UNIFORMS[advisor["slot"]]
        prompt = f"""{HUMAN_BASE}
Character: {advisor['title']}
Gender: {gender} - attractive, professional
Attire: {uniform}

Beautiful {gender} human official. Stylized concept art. Professional attire.
"""
    
    print(f"Generating {race} {advisor['title']}...")
    
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filename = f"{race}_advisor_{advisor['slot']}_{advisor['title'].lower().replace(' ', '_')}.png"
            filepath = os.path.join(output_dir, filename)
            
            with open(filepath, "wb") as f:
                f.write(images[0])
            
            print(f"  Saved: {filename}")
            return filepath
        else:
            print(f"  Failed: No image generated")
            return None
            
    except Exception as e:
        print(f"  Error: {e}")
        return None

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("Error: EMERGENT_LLM_KEY not found in environment")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    
    # Create output directory
    output_dir = "/app/frontend/assets/portraits"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 50)
    print("Regenerating Zythera Portraits with Uniforms")
    print("=" * 50)
    
    # Generate only Zythera portraits (Humans are good)
    print("\n--- ZYTHERA PORTRAITS ---")
    for advisor in ADVISORS:
        await generate_portrait(image_gen, "zythera", advisor, output_dir)
    
    print("\n" + "=" * 50)
    print("Portrait generation complete!")
    print(f"Output directory: {output_dir}")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
