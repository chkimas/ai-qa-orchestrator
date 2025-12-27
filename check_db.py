import sqlite3
from pathlib import Path

# Path to your database
db_path = Path("data/db/orchestrator.db")

print(f"📂 Inspecting Database at: {db_path.absolute()}")

if not db_path.exists():
    print("❌ Database file NOT found!")
    exit()

try:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        # 1. Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_tests';")
        table = cursor.fetchone()

        if not table:
            print("❌ Table 'saved_tests' DOES NOT EXIST.")
            print("   👉 Run: python main.py 'init' (and let it crash) to force creation.")
        else:
            print("✅ Table 'saved_tests' exists.")

            # 2. Check for data
            cursor.execute("SELECT id, name, intent, created_at FROM saved_tests")
            rows = cursor.fetchall()

            if len(rows) == 0:
                print("⚠️ Table is EMPTY. The save operation didn't insert anything.")
            else:
                print(f"✅ Found {len(rows)} saved tests:")
                for r in rows:
                    print(f"   - ID {r[0]}: {r[1]} ({r[2]})")

except Exception as e:
    print(f"❌ Error reading DB: {e}")
