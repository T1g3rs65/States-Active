import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

# Zythera Queen prompt - beautiful, elegant, with wings, matching reference closely
ZYTHERA_QUEEN_PROMPT = """Stunning beautiful digital art portrait of an elegant Zythera Queen alien, waist-up shot.

SHE MUST BE BEAUTIFUL AND ATTRACTIVE - like an alien supermodel queen:
- Smooth flawless teal/cyan luminous skin
- Long flowing dark teal chitin tendrils styled elegantly like luxurious hair
- Delicate thin antennae
- Large captivating orange/amber glowing eyes with long lashes
- Gorgeous feminine face - high cheekbones, full sensual lips, perfect features
- LARGE TRANSPARENT IRIDESCENT FAIRY-LIKE WINGS visible behind her - shimmering gossamer wings
- Wearing elegant black and orange royal gown with low-cut neckline showing tasteful cleavage
- Regal crown or tiara
- Alluring, beautiful, elegant pose
- Soft romantic lighting highlighting her beauty

ART STYLE: Beautiful fantasy character art - gorgeous, glamorous, stunning.
Like a beautiful alien queen from a romance fantasy game.
She should look absolutely stunning, elegant, and desirable - a beautiful alien woman.
Soft glamorous lighting, dreamy background with subtle sparkles.
"""

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("Error: EMERGENT_LLM_KEY not found in environment")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    output_dir = "/app/frontend/assets/portraits"
    
    print("Regenerating Zythera Queen portrait...")
    
    try:
        images = await image_gen.generate_images(
            prompt=ZYTHERA_QUEEN_PROMPT,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filepath = os.path.join(output_dir, "zythera_leader_queen.png")
            with open(filepath, "wb") as f:
                f.write(images[0])
            print(f"Saved: zythera_leader_queen.png")
        else:
            print("Failed: No image generated")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
