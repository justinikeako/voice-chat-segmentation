# scripts/clean_data.py
import os
import base64
import time
import shutil
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables
load_dotenv()

# Setup Azure OpenAI Client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_API_KEY"),
    api_version=os.getenv("AZURE_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_API_BASE")
)
DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")

# Directories
RAW_DATA_DIR = r"D:\TO BE CLEANED"
CLEAN_DATA_DIR = r"D:\CLEANED_DATA"

# Hackathon Hack: Stop once we find this many PERFECT images per folder
TARGET_CLEAN_PER_FOLDER = 60

# Hair descriptions to give the AI context for what to look for
HAIR_DESCRIPTIONS = {
    "1A": "Pin straight, fine, completely flat with no wave.",
    "1B": "Straight but with a slight bend or volume.",
    "1C": "Straight, coarse, thick.",
    "2A": "Loose, stretched, gentle waves.",
    "2B": "Defined S-shape waves starting from mid-length.",
    "2C": "Distinct, thick S-waves starting right at the root.",
    "3A": "Big, loose, shiny curls (about the size of sidewalk chalk).",
    "3B": "Springy ringlets (about the size of a sharpie marker).",
    "3C": "Tight corkscrews, densely packed (about the size of a pencil).",
    "4A": "Dense, springy S-pattern coils (about the size of a crochet needle).",
    "4B": "Z-pattern coils, sharp angles, highly dense, wiry.",
    "4C": "Extremely tight zigzag coils, massive shrinkage, tightly packed."
}

def encode_image(image_path):
    """Convert image to base64 string for GPT-5 Vision."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def clean_dataset():
    print(f"\n[Kera AI] Starting INTERACTIVE data cleaning...")
    print(f"[Kera AI] Reading from: {RAW_DATA_DIR}")
    print(f"[Kera AI] Saving verified images to: {CLEAN_DATA_DIR}\n")
    
    if not os.path.exists(RAW_DATA_DIR):
        print(f"[Error] Directory {RAW_DATA_DIR} does not exist. Check your path.")
        return

    # Ensure the master clean directory exists
    os.makedirs(CLEAN_DATA_DIR, exist_ok=True)

    # Get a sorted list of all valid folders in the raw directory
    all_folders = sorted([f for f in os.listdir(RAW_DATA_DIR) if os.path.isdir(os.path.join(RAW_DATA_DIR, f))])
    
    if not all_folders:
        print(f"[Error] No folders found in {RAW_DATA_DIR}.")
        return

    # --- INTERACTIVE PROMPT ---
    print(f"Folders found: {', '.join(all_folders)}")
    start_folder = input("Which folder would you like to start from? (Type 'ALL' to check all, or a name like '3C'): ").strip().upper()

    folders_to_process = all_folders

    if start_folder != "ALL":
        if start_folder not in all_folders:
            print(f"[Error] Folder '{start_folder}' not found. Exiting.")
            return
        # Find the index of the chosen folder and slice the list to start from there
        start_index = all_folders.index(start_folder)
        folders_to_process = all_folders[start_index:]
        print(f"\n[Kera AI] Resuming pipeline from {start_folder} onwards...\n")

    # Look through the selected folders
    for folder_name in folders_to_process:
        raw_folder_path = os.path.join(RAW_DATA_DIR, folder_name)
        
        print(f"\n--- Processing Category: {folder_name} ---")
        
        # Create corresponding clean folder
        clean_folder_path = os.path.join(CLEAN_DATA_DIR, folder_name)
        os.makedirs(clean_folder_path, exist_ok=True)
        
        # Count how many are already in the clean folder
        clean_count = len([name for name in os.listdir(clean_folder_path) if os.path.isfile(os.path.join(clean_folder_path, name))])
        
        if clean_count >= TARGET_CLEAN_PER_FOLDER:
            print(f"[Skipping] {folder_name} already has {clean_count} clean images.")
            continue

        rejected_count = 0
        hair_desc = HAIR_DESCRIPTIONS.get(folder_name.upper(), "natural hair")
        
        # Loop through images in the raw folder
        for filename in os.listdir(raw_folder_path):
            if clean_count >= TARGET_CLEAN_PER_FOLDER:
                print(f"[Success] Reached {TARGET_CLEAN_PER_FOLDER} perfect images for {folder_name}. Moving to next type.")
                break 
                
            if not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.heic')):
                continue
            
            # If we already copied this exact file, skip it
            clean_file_path = os.path.join(clean_folder_path, filename)
            if os.path.exists(clean_file_path):
                continue

            raw_file_path = os.path.join(raw_folder_path, filename)
            
            try:
                base64_image = encode_image(raw_file_path)
                
                # The Comprehensive Prompt with folder context
                prompt = (
                    f"You are a strict data curation expert building a world-class AI dataset. "
                    f"This image is SUPPOSED to show hair type {folder_name.upper()} ({hair_desc}).\n\n"
                    "REJECT THIS IMAGE (Reply NO) if ANY of the following are true:\n"
                    f"1. It does NOT clearly match the {folder_name.upper()} ({hair_desc}) hair texture.\n"
                    "2. It is a collage, has text, or is watermarked.\n"
                    "3. It is a product bottle, meme, graphic, or illustration.\n"
                    "4. The image is too blurry, dark, or low-resolution.\n"
                    "5. The hair is heavily braided, in locs, covered by hats, or styled in a way that hides the natural loose texture.\n"
                    "6. The person's face takes up more than 50% of the image (we want close-ups of hair).\n\n"
                    f"ACCEPT THIS IMAGE (Reply YES) ONLY if it is a high-quality, clear photo primarily showing the correct {folder_name.upper()} natural hair texture.\n"
                    "Reply ONLY with the exact word YES or NO."
                )
                
                response = client.chat.completions.create(
                    model=DEPLOYMENT,
                    messages=[
                        {
                            "role": "user",
                            "content":[
                                {"type": "text", "text": prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    max_tokens=10,
                    temperature=0.0 # Strict, deterministic output
                )
                
                decision = response.choices[0].message.content.strip().upper()
                
                if "NO" in decision:
                    print(f"  [REJECTED] {filename} - Failed validation criteria.")
                    rejected_count += 1
                elif "YES" in decision:
                    # COPY the file to the clean folder
                    shutil.copy2(raw_file_path, clean_file_path)
                    clean_count += 1
                    print(f"  [VERIFIED] {filename} copied to Cleaned folder! ({clean_count}/{TARGET_CLEAN_PER_FOLDER})")
                else:
                    print(f"  [SKIPPED] Unclear AI response for {filename}: {decision}")
                    
                # Pause for 1.5 seconds to protect Azure API rate limits
                time.sleep(1.5)
                
            except Exception as e:
                print(f"  [API ERROR] Failed to process {filename}: {e}")
                time.sleep(2) # Back off a bit if the API complains

        print(f"-> Finished {folder_name}: Verified {clean_count}, Rejected {rejected_count} images.")

    print("\n[Kera AI] ✅ Interactive data cleaning complete! Your dataset is ready.")
    print(f"Your clean images are safely stored in: {CLEAN_DATA_DIR}")

if __name__ == "__main__":
    clean_dataset()