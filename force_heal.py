import asyncio
from automation.core.runner import TestRunner
from ai.models import TestPlan, TestStep, ActionType, Role

async def run_poisoned_test():
    print("🧪 Injecting Poisoned Test Plan...")

    # 1. Manually build a plan with a GUARANTEED BROKEN selector
    # This selector ".fake-selector-123" definitely does not exist on SauceDemo.
    bad_step = TestStep(
        step_id=2,
        role=Role.CUSTOMER,
        action=ActionType.CLICK,
        selector=".fake-selector-123",
        value="",
        description="Click the Login Button (using BROKEN selector)"
    )

    # 2. Define the full plan
    plan = TestPlan(
        intent="Self-Healing Verification Test",
        steps=[
            TestStep(step_id=1, role=Role.CUSTOMER, action=ActionType.NAVIGATE, selector="", value="https://www.saucedemo.com/", description="Go to home"),
            bad_step, # <--- The Runner will blindly try to click this
        ]
    )

    # 3. Execute directly (Bypassing the AI Planner)
    runner = TestRunner(headless=False)

    # We use a custom ID so it appears in your Dashboard
    await runner.execute_plan(plan, "RUN-FORCE-HEAL-001")

if __name__ == "__main__":
    asyncio.run(run_poisoned_test())
