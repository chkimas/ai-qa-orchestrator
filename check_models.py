import os
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# 1. Load the Environment Variables
env_path = Path.cwd() / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ No API Key found in .env")
    exit()

print(f"🔑 Authenticating with Key: {api_key[:8]}...")

# 2. Configure the Google Library directly
genai.configure(api_key=api_key)

# 3. List what is ACTUALLY available
print("\n📡 Asking Google for available models...")
try:
    found_any = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            # We only care about models that can generate text
            print(f"   ✅ AVAILABLE: {m.name}")
            found_any = True

    if not found_any:
        print("\n❌ Success connecting, but NO models returned. This is unusual.")
    else:
        print("\n👉 ACTION: Copy one of the names above (without 'models/') into settings.py")

except Exception as e:
    print(f"\n❌ CONNECTION ERROR: {e}")
