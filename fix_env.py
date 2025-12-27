import os
from pathlib import Path

# 1. Define where the file SHOULD be
root_dir = Path.cwd()
env_path = root_dir / ".env"

print(f"📍 diagnosing .env at: {env_path}")

# 2. Key to write (I used the one you shared; replace if needed)
# NOTE: Using the key you pasted in the chat
api_key_content = "AIzaSyAdcX6wxrlcSMD0L19CaUc_b2svrjaNOlg"

# 3. FORCE WRITE the file
try:
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(api_key_content)
    print("✅ `.env` file successfully re-written.")
except Exception as e:
    print(f"❌ Failed to write file: {e}")
    exit()

# 4. Verify we can read it back
try:
    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        print(f"👀 File Content on Disk: '{content}'")

    if "GOOGLE_API_KEY" in content and "AIzaSy" in content:
        print("✅ Verification PASSED: File is valid.")
    else:
        print("❌ Verification FAILED: Content is wrong.")
except Exception as e:
    print(f"❌ Failed to read file: {e}")

print("\n👇 NOW RUN THIS COMMAND:")
print("python -m tests.test_planner")
