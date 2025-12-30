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

load_dotenv()

from ai.planner import generate_test_plan
from automation.core.runner import AutomationRunner
from data.memory import init_db
from ai.crawler import AutonomousCrawler
from ai.reporter import generate_report
from data.ingestor import BehavioralIngestor
from ai.prompts import CHAOS_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT

init_db()

# --- HELPERS ---

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
    try:
        decoded_bytes = base64.b64decode(arg)
        decoded_str = decoded_bytes.decode('utf-8')
        data = json.loads(decoded_str)

        if "context" in data and "instructions" in data:
            return f"""
            CONTEXT:
            - Base URL: {data['context'].get('baseUrl')}
            - Role: {data['context'].get('role')}
            - Test Data: {data['context'].get('testData')}

            INSTRUCTIONS:
            {data['instructions']}
            """
        return arg
    except Exception:
        return arg

# --- MODE 1: SNIPER (Plan & Execute) ---
async def run_sniper_mode(raw_input: str, run_saved_id: int = None, is_chaos: bool = False):
    mode_label = "🔥 CHAOS" if is_chaos else "🎯 SNIPER"
    print(f"🚀 {mode_label} Mode Started")

    formatted_intent = decode_payload(raw_input)

    prompt_override = CHAOS_SYSTEM_PROMPT if is_chaos else PLANNER_SYSTEM_PROMPT
    plan = await generate_test_plan(formatted_intent, system_prompt_override=prompt_override)

    if not plan.steps:
        print("❌ No plan generated. Exiting.")
        return

    plan.is_chaos_mode = is_chaos
    print(f"   📝 Generated {len(plan.steps)} steps.")

    runner = AutomationRunner()
    run_key = f"RUN-{'CHAOS' if is_chaos else 'SNIPER'}-{run_saved_id if run_saved_id else 'AI'}-{int(time.time())}"

    try:
        await runner.execute_plan(plan, run_key)
        print(f"✅ Run Complete: {run_key}")
    finally:
        await runner.stop_browser()

# --- MODE 2: SCOUT (Autonomous Crawler) ---
async def run_scout_mode(url: str, user: str = None, password: str = None):
    print(f"🕷️ Scout Mode Started on {url}")
    start_time = time.time()
    creds = {"username": user, "password": password} if user and password else None

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )

        page = await context.new_page()
        await page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver")

        scout = AutonomousCrawler(start_url=url, max_pages=15, credentials=creds)
        data = await scout.run(page)

        duration = time.time() - start_time
        report_file = generate_report(data, total_time_seconds=duration)

        await browser.close()

    try:
        db_path = os.path.join("data", "db", "orchestrator.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO crawl_history (url, report_path) VALUES (?, ?)", (url, report_file))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ History Log Failed: {e}")

    print(f"✅ Scout Mission Complete. Report: {report_file}")

    try:
        from ai.analyzer import RiskAnalyzer
        analyzer = RiskAnalyzer()
        heatmap = analyzer.generate_heatmap()

        if heatmap:
            top = heatmap[0]
            if top['risk_score'] > 25:
                print(f"⚠️  PREDICTIVE ALERT: Potential Fragility detected at {top['url']}")
                print(f"   Risk Score: {top['risk_score']}% | Status: {top['status']}")
    except Exception as e:
        print(f"💡 Analyzer skipped: {e}")

# --- MODE 3: REPLAY (Behavioral Log Replay) ---
async def run_replay_mode(file_path: str):
    """Ingests user session logs and triggers a targeted Sniper run."""
    print(f"🔄 Replay Mode Started: {file_path}")

    if not os.path.exists(file_path):
        print(f"❌ Error: Session file {file_path} not found.")
        return

    with open(file_path, "r") as f:
        urls = [line.strip() for line in f if line.strip()]

    ingestor = BehavioralIngestor()
    intent = ingestor.logs_to_intent(urls)

    await run_sniper_mode(intent)

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI QA Orchestrator")

    parser.add_argument("input", nargs="?", help="Base64 Payload OR Raw Intent OR URL")
    parser.add_argument("--mode", choices=["sniper", "scout", "replay"], default="sniper", help="Operation Mode")
    parser.add_argument("--run-saved", type=int, help="ID of saved test to run")
    parser.add_argument("--user", help="Username for Scout Login")
    parser.add_argument("--password", help="Password for Scout Login")
    parser.add_argument("--chaos", action="store_true", help="Enable Chaos Monkey mode")
    parser.add_argument("--file", help="Path to session file for replay mode")

    args = parser.parse_args()

    if args.mode == "scout":
        if not args.input:
            print("❌ Error: Scout mode requires a URL.")
            sys.exit(1)
        asyncio.run(run_scout_mode(args.input, args.user, args.password))

    elif args.mode == "replay":
        target_file = args.file or args.input
        if not target_file:
            print("❌ Error: Replay mode requires a file path.")
            sys.exit(1)
        asyncio.run(run_replay_mode(target_file))

    elif args.run_saved:
        saved_intent = get_saved_test_intent(args.run_saved)
        if saved_intent:
            asyncio.run(run_sniper_mode(saved_intent, run_saved_id=args.run_saved, is_chaos=args.chaos))
        else:
            print(f"❌ Saved Test ID {args.run_saved} not found.")

    else:
        if not args.input:
             print("Usage: python main.py \"<intent>\" [--chaos]")
             sys.exit(1)
        asyncio.run(run_sniper_mode(args.input, is_chaos=args.chaos))
