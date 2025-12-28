import asyncio
import time  # <--- Import time to generate unique IDs
from automation.core.runner import TestRunner
from ai.models import TestPlan, TestStep, ActionType, Role

async def run_manual_test():
    # 1. Force Headless=False
    runner = TestRunner(headless=False)

    # 2. Define the Plan (With corrected Roles!)
    manual_plan = TestPlan(
        intent="Manual Validation Run",
        steps=[
            TestStep(step_id=1, role=Role.CUSTOMER, action=ActionType.NAVIGATE, value="https://www.saucedemo.com/", description="Go to home"),
            TestStep(step_id=2, role=Role.CUSTOMER, action=ActionType.INPUT, selector="#user-name", value="standard_user", description="Type User"),
            TestStep(step_id=3, role=Role.CUSTOMER, action=ActionType.INPUT, selector="#password", value="secret_sauce", description="Type Password"),
            TestStep(step_id=4, role=Role.CUSTOMER, action=ActionType.CLICK, selector="#login-button", value="", description="Click Login"),

            # Everyone is a CUSTOMER now (Fixes the blank tab issue)
            TestStep(step_id=5, role=Role.CUSTOMER, action=ActionType.WAIT, value="3000", description="Wait for transition"),
            TestStep(step_id=6, role=Role.CUSTOMER, action=ActionType.VERIFY_TEXT, selector="span.title", value="Products", description="Check Title"),
            TestStep(step_id=7, role=Role.CUSTOMER, action=ActionType.CLICK, selector="#add-to-cart-sauce-labs-backpack", value="", description="Add Backpack"),
        ]
    )

    # 3. Generate a Unique ID based on the current time
    unique_id = f"MANUAL-TEST-{int(time.time())}"
    print(f"🤖 Starting Manual Run: {unique_id} (No API Quota Used)...")

    try:
        await runner.execute_plan(manual_plan, unique_id)

        print("\n✅ Run Finished! Keeping browser open for 30 seconds...")
        await asyncio.sleep(30)

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_manual_test())
