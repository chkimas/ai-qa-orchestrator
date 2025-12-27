import sqlite3

# Connect to DB
conn = sqlite3.connect("data/db/orchestrator.db")
conn.row_factory = sqlite3.Row

# Get the last 5 logs
rows = conn.execute("""
    SELECT step_id, action, details, selector, value
    FROM logs
    WHERE action != 'screenshot'
    ORDER BY id DESC LIMIT 5
""").fetchall()

print(f"🔎 Inspecting Last 5 Logs:")
print("-" * 60)
print(f"{'ID':<4} {'ACTION':<10} {'SELECTOR':<20} {'VALUE':<20}")
print("-" * 60)

for r in rows:
    # Handle potential None values safely
    sel = r['selector'] if r['selector'] is not None else "NULL"
    val = r['value'] if r['value'] is not None else "NULL"
    print(f"{r['step_id']:<4} {r['action']:<10} {str(sel):<20} {str(val):<20}")

conn.close()
