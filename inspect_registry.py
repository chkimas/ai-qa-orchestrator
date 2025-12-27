import sqlite3
import json

# Connect to DB
conn = sqlite3.connect("data/db/orchestrator.db")
conn.row_factory = sqlite3.Row

# Fetch the latest saved test
row = conn.execute("SELECT * FROM saved_tests ORDER BY id DESC LIMIT 1").fetchone()

if not row:
    print("❌ No saved tests found!")
else:
    print(f"📂 Test ID: {row['id']}")
    print(f"🏷️  Name: {row['name']}")

    # Parse and pretty-print the JSON steps
    steps = json.loads(row['steps_json'])
    print(f"\n📜 STEPS ({len(steps)}):")

    for s in steps:
        print(f"   [{s.get('step_id')}] {s.get('action')} ({s.get('role')})")
        print(f"       Selector: '{s.get('selector')}'")
        print(f"       Value:    '{s.get('value')}'")
        print("       ------")

conn.close()
