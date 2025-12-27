import asyncio
import uuid
from ai.planner import TestPlanner
from automation.core.runner import TestRunner

# We hardcode a specific intent that works on the demo site
INTENT = """
Customer navigates to 'https://www.saucedemo.com/'.
Customer inputs 'standard_user' into selector '#user-name'.
Customer inputs 'secret_sauce' into selector '#password'.
Customer clicks the button '#login-button'.
Customer verifies the text 'Products' exists in selector '.title'.
"""

async def run_demo():
    # 1. Plan (AI)
    print("🧠 1. AI is Planning...")
    planner = TestPlanner()
    plan = planner.generate_plan(INTENT)

    # 2. Execute (Runner)
    print("\n🤖 2. Runner is Executing...")
    # Set headless=False so you can SEE the browser open!
    runner = TestRunner(headless=False)

    run_id = str(uuid.uuid4())
    await runner.execute_plan(plan, run_id)

if __name__ == "__main__":
    asyncio.run(run_demo())
