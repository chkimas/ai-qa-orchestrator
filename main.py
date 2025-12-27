import asyncio
import sys
import uuid
import logging
from typing import Optional
import warnings
from reports.generator import ReportGenerator

# Suppress the specific Windows pipe warnings
warnings.filterwarnings("ignore", category=ResourceWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)

# Suppress the noisy Windows cleanup warnings
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from ai.planner import TestPlanner
from automation.core.runner import TestRunner

# Configure logging to show only important info
logging.basicConfig(level=logging.INFO, format='%(message)s')

async def run_orchestrator(intent: Optional[str] = None):
    print("\n🚀 AI-QA Orchestrator Initialized")
    print("====================================")

    # 1. Get Intent
    if not intent:
        print("Describe your test case (e.g. 'Customer adds laptop to cart'):")
        intent = input(">> ").strip()

    if not intent:
        print("❌ No intent provided. Exiting.")
        return

    # 2. Generate Plan (The Brain)
    print("\n🧠 Generating Test Plan via Gemini 2.0...")
    try:
        planner = TestPlanner()
        plan = planner.generate_plan(intent)
        print("   ✅ Plan Created!")
    except Exception as e:
        print(f"   ❌ Planning Failed: {e}")
        return

    # 3. Execute Plan (The Hands)
    print("\n🤖 Executing Automation...")
    run_id = str(uuid.uuid4())
    runner = TestRunner(headless=False) # Headless=False to see it run

    try:
        await runner.execute_plan(plan, run_id)

        # --- Update DB Status to PASSED ---
        # (For now, we assume if no exception was raised, it passed)
        #Ideally, TestMemory should have an update_status method,
        # but we can rely on logs for now.

        print(f"\n✅ SUCCESS! Run ID: {run_id}")

        # --- GENERATE REPORT ---
        print("📝 Generating HTML Report...")
        reporter = ReportGenerator()
        reporter.generate(run_id)

    except Exception as e:
        print(f"\n❌ Execution Failed: {e}")

if __name__ == "__main__":
    # Allow passing intent as a command line argument
    arg_intent = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        asyncio.run(run_orchestrator(arg_intent))
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user.")
    except Exception as e:
        # Only hide the specific Windows pipe error, SHOW everything else!
        if "closed pipe" in str(e):
            pass
        else:
            # This will verify if imports or paths are wrong
            print(f"\n❌ FATAL ERROR: {e}")
            import traceback
            traceback.print_exc()
