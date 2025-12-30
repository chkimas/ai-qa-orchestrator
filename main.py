import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import asyncio
import sqlite3
import os
import base64
import json
import argparse
import time
from dotenv import load_dotenv

# Load env before imports
load_dotenv()

# --- IMPORTS ---
from ai.planner import generate_test_plan
from automation.core.runner import AutomationRunner
from data.memory import init_db

# New Capabilities
from ai.crawler import AutonomousCrawler
from ai.reporter import generate_report

# Initialize DB on startup
init_db()

# --- HELPER FUNCTIONS ---

def get_saved_test_intent(test_id: int):
    try:
        db_path = os.path.join("data", "db", "orchestrator.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT intent FROM saved_tests WHERE id = ?", (test_id,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return None

def decode_payload(arg: str) -> str:
    """
    Decodes the Base64 JSON payload from the UI
    OR returns the raw string if running from CLI manually.
    """
    try:
        # Try decoding as Base64 JSON
        decoded_bytes = base64.b64decode(arg)
        decoded_str = decoded_bytes.decode('utf-8')
        data = json.loads(decoded_str)

        # If successful JSON structure, format it for the Planner Prompt
        if "context" in data and "instructions" in data:
            return f"""
            CONTEXT:
            - Base URL: {data['context'].get('baseUrl')}
            - Role: {data['context'].get('role')}
            - Test Data: {data['context'].get('testData')}

            INSTRUCTIONS:
            {data['instructions']}
            """
        return arg # Fallback if not our specific schema
    except Exception:
        return arg

# --- MODE 1: SNIPER (Existing "Plan & Execute" Logic) ---
async def run_sniper_mode(raw_input: str, run_saved_id: int = None):
    print(f"🚀 Sniper Mode Started")

    # 1. Decode & Format Input
    formatted_intent = decode_payload(raw_input)

    # 2. PLAN
    plan = await generate_test_plan(formatted_intent)

    if not plan.steps:
        print("❌ No plan generated. Exiting.")
        return

    print(f"   📝 Generated {len(plan.steps)} steps.")

    # 3. EXECUTE
    runner = AutomationRunner()
    run_key = f"RUN-{run_saved_id if run_saved_id else 'AI'}-{asyncio.get_event_loop().time()}"

    await runner.execute_plan(plan, run_key)
    print(f"✅ Run Complete: {run_key}")

# --- MODE 2: SCOUT (New "Autonomous Crawler" Logic) ---
async def run_scout_mode(url: str, user: str = None, password: str = None):
    print(f"🕷️ Scout Mode Started on {url}")
    start_time = time.time()

    # Prepare Credentials
    creds = {"username": user, "password": password} if user and password else None

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        # 1. ADVANCED LAUNCH: Bypasses basic "Automation" flags
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars"
            ]
        )

        # 2. STEALTH CONTEXT: Masks User-Agent and Viewport
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )

        page = await context.new_page()

        # 3. JS MASKING: Removes the 'webdriver' property from navigator
        await page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver")

        # 4. INITIALIZE & RUN SCOUT
        scout = AutonomousCrawler(start_url=url, max_pages=15, credentials=creds)
        data = await scout.run(page)

        # 5. GENERATE REPORT
        duration = time.time() - start_time
        report_file = generate_report(data, total_time_seconds=duration)

        await browser.close()

    # 6. LOG TO HISTORY (DB)
    try:
        db_path = os.path.join("data", "db", "orchestrator.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crawl_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT,
                report_path TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("INSERT INTO crawl_history (url, report_path) VALUES (?, ?)", (url, report_file))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ History Log Failed: {e}")

    print(f"✅ Scout Mission Complete. Report: {report_file}")

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI QA Orchestrator")

    # Arguments
    parser.add_argument("input", nargs="?", help="Base64 Payload OR Raw Intent OR URL")
    parser.add_argument("--mode", choices=["sniper", "scout"], default="sniper", help="Operation Mode")
    parser.add_argument("--run-saved", type=int, help="ID of saved test to run")
    parser.add_argument("--user", help="Username for Scout Login")
    parser.add_argument("--password", help="Password for Scout Login")

    args = parser.parse_args()

    # ROUTING LOGIC
    if args.mode == "scout":
        if not args.input:
            print("❌ Error: Scout mode requires a URL as the input argument.")
            sys.exit(1)
        asyncio.run(run_scout_mode(args.input, args.user, args.password))

    elif args.run_saved:
        # Legacy support for running saved tests
        saved_intent = get_saved_test_intent(args.run_saved)
        if saved_intent:
            asyncio.run(run_sniper_mode(saved_intent, run_saved_id=args.run_saved))
        else:
            print(f"❌ Saved Test ID {args.run_saved} not found.")

    else:
        # Default to Sniper (UI Payload handling)
        if not args.input:
             print("Usage: python main.py \"<intent_or_base64>\" OR python main.py <url> --mode scout")
             sys.exit(1)
        asyncio.run(run_sniper_mode(args.input))
