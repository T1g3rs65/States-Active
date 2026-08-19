import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

FEMALE_MARSHAL_PROMPT = """Digital art portrait of a female military Marshal, waist-up shot.

ART STYLE: Stylized digital concept art - smooth, polished, beautiful.
Like character art from a high-quality video game.
Background: Dark gradient

Character: Female Marshal / Military General
Gender: Female - attractive, strong, commanding presence
Attire: Military dress uniform with medals and decorations, formal military attire, officer's cap

Beautiful strong female military leader. Stylized concept art. Professional military attire.
Confident, stern expression befitting a high-ranking military commander.
"""

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("Error: EMERGENT_LLM_KEY not found in environment")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    output_dir = "/app/frontend/assets/portraits"
    
    print("Generating Female Marshal portrait...")
    
    try:
        images = await image_gen.generate_images(
            prompt=FEMALE_MARSHAL_PROMPT,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filepath = os.path.join(output_dir, "human_advisor_3_marshal_female.png")
            with open(filepath, "wb") as f:
                f.write(images[0])
            print(f"Saved: human_advisor_3_marshal_female.png")
        else:
            print("Failed: No image generated")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
