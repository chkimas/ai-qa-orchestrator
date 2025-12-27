import asyncio
import sys
import json
import sqlite3
from typing import List

# Import your modules
from ai.planner import generate_test_plan
from automation.core.runner import TestRunner
from configs.settings import settings
from ai.models import TestPlan, TestStep, ActionType, Role

def load_saved_plan(test_id: int) -> TestPlan:
    """Fetches a saved test from DB and reconstructs the Plan object."""
    print(f"📂 Loading Saved Test ID: {test_id}...")

    with sqlite3.connect(settings.DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM saved_tests WHERE id = ?", (test_id,)).fetchone()

        if not row:
            raise ValueError(f"Test ID {test_id} not found in registry.")

        name = row['name']
        steps_data = json.loads(row['steps_json'])

        steps = []
        for s in steps_data:
            # FIX: Use the specific 'selector' and 'value' fields from the JSON
            # We use .get() to be safe, defaulting to empty string
            step = TestStep(
                step_id=s['step_id'],
                role=Role(s['role']),
                action=ActionType(s['action']),
                selector=s.get('selector', "") or "", # <--- READ CORRECT FIELD
                value=s.get('value', "") or "",       # <--- READ CORRECT FIELD
                description=s.get('description', f"Replay step {s['step_id']}")
            )
            steps.append(step)

        return TestPlan(intent=f"Replay: {name}", steps=steps)

async def run_orchestrator(intent: str, saved_test_id: int = None):
    print("\n🚀 AI-QA Orchestrator Initialized")
    print("====================================")

    try:
        if saved_test_id:
            # --- MODE A: REPLAY SAVED TEST ---
            plan = load_saved_plan(saved_test_id)
            print(f"   ✅ Loaded '{plan.intent}' with {len(plan.steps)} steps.")
        else:
            # --- MODE B: AI GENERATION ---
            print("\n🧠 Generating Test Plan via Gemini 2.0...")
            plan = await generate_test_plan(intent)
            print("   ✅ Plan Created!")

        # Execute
        print("\n🤖 Executing Automation...")
        runner = TestRunner(headless=False) # Run visible for demo
        await runner.execute_plan(plan, f"RUN-{saved_test_id or 'AI'}-{asyncio.get_event_loop().time()}")

    except Exception as e:
        print(f"\n❌ Execution Failed: {e}")
        # Show full traceback for debugging
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Simple Argument Parsing
    # Usage 1: python main.py "Buy a laptop"
    # Usage 2: python main.py --run-saved 1

    arg_intent = None
    arg_saved_id = None

    args = sys.argv[1:]
    if len(args) > 0:
        if args[0] == "--run-saved":
            if len(args) > 1:
                arg_saved_id = int(args[1])
        else:
            arg_intent = args[0]

    if not arg_intent and not arg_saved_id:
        print("Usage: python main.py '<intent>' OR python main.py --run-saved <ID>")
        exit()

    try:
        asyncio.run(run_orchestrator(arg_intent, arg_saved_id))
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user.")
