import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

# Leader types needed for each government style
LEADER_TYPES = [
    # Democratic/Republic leaders
    {"id": "president_male", "title": "President", "gender": "male", "style": "democratic"},
    {"id": "president_female", "title": "President", "gender": "female", "style": "democratic"},
    {"id": "prime_minister_male", "title": "Prime Minister", "gender": "male", "style": "democratic"},
    {"id": "prime_minister_female", "title": "Prime Minister", "gender": "female", "style": "democratic"},
    
    # Monarchs
    {"id": "king", "title": "King", "gender": "male", "style": "monarchy"},
    {"id": "queen", "title": "Queen", "gender": "female", "style": "monarchy"},
    {"id": "emperor", "title": "Emperor", "gender": "male", "style": "monarchy"},
    {"id": "empress", "title": "Empress", "gender": "female", "style": "monarchy"},
    
    # Authoritarian leaders
    {"id": "dictator_male", "title": "Supreme Leader", "gender": "male", "style": "authoritarian"},
    {"id": "dictator_female", "title": "Supreme Leader", "gender": "female", "style": "authoritarian"},
    {"id": "chairman_male", "title": "Chairman", "gender": "male", "style": "authoritarian"},
    {"id": "chairwoman_female", "title": "Chairwoman", "gender": "female", "style": "authoritarian"},
    
    # Corporate/Tech leaders
    {"id": "ceo_male", "title": "Chief Executive", "gender": "male", "style": "corporate"},
    {"id": "ceo_female", "title": "Chief Executive", "gender": "female", "style": "corporate"},
    
    # Religious leaders
    {"id": "high_priest", "title": "High Priest", "gender": "male", "style": "theocratic"},
    {"id": "high_priestess", "title": "High Priestess", "gender": "female", "style": "theocratic"},
    
    # Military leaders
    {"id": "general_male", "title": "Supreme General", "gender": "male", "style": "military"},
    {"id": "general_female", "title": "Supreme General", "gender": "female", "style": "military"},
]

# Zythera Queen - only one type needed (always female with wings)
ZYTHERA_QUEEN = {
    "id": "zythera_queen",
    "title": "Queen",
    "gender": "female",
}

# Human base prompt
HUMAN_LEADER_BASE = """Digital art portrait of a human leader, waist-up shot showing head and upper torso with clothing clearly visible.

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Like character art from a high-quality video game.
Attractive, dignified human with elegant features.
Soft lighting, elegant composition.
Background: Dark gradient
"""

# Zythera Queen prompt (with wings)
ZYTHERA_QUEEN_BASE = """Digital art portrait of a Zythera Queen, waist-up shot showing head, upper torso and transparent wings.

CRITICAL FEATURES - MATCH REFERENCE:
- Smooth teal/cyan chitinous exoskeleton skin
- Long flowing dark teal chitin tendrils framing face like hair
- Multiple thin elegant antennae extending upward from head
- Large beautiful orange/amber glowing eyes
- Clean smooth teal face
- TRANSPARENT IRIDESCENT BUG-LIKE WINGS visible behind shoulders - delicate, gossamer insect wings
- Beautiful, regal, elegant alien queen
- Royal, commanding presence

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Background: Dark gradient
"""

# Remaining human advisor portraits needed (opposite gender of what we have)
MISSING_HUMAN_ADVISORS = [
    # Currently have female, need male
    {"slot": 1, "title": "First Minister", "gender": "male"},
    {"slot": 4, "title": "Minister of Culture", "gender": "male"},
    {"slot": 6, "title": "Chief Builder", "gender": "male"},
    {"slot": 8, "title": "Royal Scientist", "gender": "male"},
    # Currently have male, need female
    {"slot": 2, "title": "Treasurer", "gender": "female"},
    {"slot": 5, "title": "Spymaster", "gender": "female"},
    {"slot": 7, "title": "Grand Diplomat", "gender": "female"},
]

ADVISOR_UNIFORMS = {
    1: "elegant dark blue and silver formal robes, dignified leader attire",
    2: "professional dark gray suit, refined business attire",
    3: "military dress uniform with medals, formal military attire",
    4: "elegant burgundy robes, artistic formal wear",
    5: "dark mysterious attire, intelligence agent formal wear",
    6: "professional uniform, practical but formal engineering attire",
    7: "refined formal suit, elegant ambassador attire",
    8: "white coat over formal attire, professional scientist look",
}

async def generate_human_leader(image_gen, leader, output_dir):
    """Generate a human leader portrait"""
    
    style_clothing = {
        "democratic": "formal dark suit with national sash, professional political attire",
        "monarchy": "royal robes with crown or tiara, regal formal attire with gold accents",
        "authoritarian": "military-style formal uniform with medals, imposing leader attire",
        "corporate": "expensive modern business suit, tech executive attire",
        "theocratic": "ornate religious robes and ceremonial headwear, spiritual leader attire",
        "military": "decorated military dress uniform with many medals, high-ranking general attire",
    }
    
    clothing = style_clothing.get(leader["style"], "formal attire")
    
    prompt = f"""{HUMAN_LEADER_BASE}
Character: {leader['title']}
Gender: {leader['gender']} - attractive, dignified, commanding presence
Attire: {clothing}

A powerful, confident {leader['gender']} {leader['title']} with dignified bearing.
Stylized digital art portrait. Professional national leader appearance.
"""
    
    print(f"Generating human {leader['id']}...")
    
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filename = f"human_leader_{leader['id']}.png"
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

async def generate_zythera_queen(image_gen, output_dir):
    """Generate the Zythera Queen portrait with wings"""
    
    prompt = f"""{ZYTHERA_QUEEN_BASE}
Character: Zythera Queen - supreme ruler of the hive
Attire: wearing elegant black and orange royal robes, queen's regalia

A beautiful, regal Zythera Queen with flowing chitin tendrils and TRANSPARENT GOSSAMER WINGS.
The wings should be clearly visible - delicate, iridescent, insect-like wings behind her.
Black and orange royal attire befitting a queen.
"""
    
    print(f"Generating Zythera Queen with wings...")
    
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filename = f"zythera_leader_queen.png"
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

async def generate_missing_advisor(image_gen, advisor, output_dir):
    """Generate missing human advisor portrait"""
    
    uniform = ADVISOR_UNIFORMS.get(advisor["slot"], "professional attire")
    
    prompt = f"""Digital art portrait of a human government official, waist-up shot.

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Like character art from a high-quality video game.
Background: Dark gradient

Character: {advisor['title']}
Gender: {advisor['gender']} - attractive, professional
Attire: {uniform}

Beautiful {advisor['gender']} human official. Stylized concept art. Professional attire.
"""
    
    print(f"Generating human {advisor['gender']} {advisor['title']}...")
    
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filename = f"human_advisor_{advisor['slot']}_{advisor['title'].lower().replace(' ', '_')}_{advisor['gender']}.png"
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
    
    print("=" * 60)
    print("Generating Leader and Additional Advisor Portraits")
    print("=" * 60)
    
    # 1. Generate Zythera Queen (1 portrait)
    print("\n--- ZYTHERA QUEEN ---")
    await generate_zythera_queen(image_gen, output_dir)
    
    # 2. Generate Human Leaders (18 portraits)
    print("\n--- HUMAN LEADERS ---")
    for leader in LEADER_TYPES:
        await generate_human_leader(image_gen, leader, output_dir)
    
    # 3. Generate Missing Human Advisors (7 portraits)
    print("\n--- MISSING HUMAN ADVISORS ---")
    for advisor in MISSING_HUMAN_ADVISORS:
        await generate_missing_advisor(image_gen, advisor, output_dir)
    
    print("\n" + "=" * 60)
    print("Portrait generation complete!")
    print(f"Output directory: {output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
