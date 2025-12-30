import asyncio
import json
from ai.planner import generate_test_plan
from ai.prompts import CHAOS_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT

async def verify_chaos_logic():
    print("🧪 Testing AI Planner Personas...")

    test_intent = "Verify the login functionality of OrangeHRM"

    # 1. Test Sniper Mode (Standard)
    print("\n🎯 GENERATING SNIPER PLAN...")
    sniper_plan = await generate_test_plan(test_intent)
    for step in sniper_plan.steps:
        print(f"  [{step.step_id}] {step.description}")

    # Check for 'Happy Path' keywords
    sniper_keywords = ["login", "dashboard", "success", "verify"]
    is_sniper_valid = any(kw in str(sniper_plan.steps).lower() for kw in sniper_keywords)
    print(f"Result: {'✅ Valid Sniper Plan' if is_sniper_valid else '❌ Unclear Sniper Plan'}")

    print("-" * 50)

    # 2. Test Chaos Mode (Adversarial)
    print("\n🔥 GENERATING CHAOS PLAN...")
    chaos_plan = await generate_test_plan(test_intent, system_prompt_override=CHAOS_SYSTEM_PROMPT)
    for step in chaos_plan.steps:
        print(f"  [{step.step_id}] {step.description}")

    # Check for 'Destructive' keywords
    chaos_keywords = ["massive", "injection", "invalid", "stress", "spam", "long"]
    is_chaos_valid = any(kw in str(chaos_plan.steps).lower() for kw in chaos_keywords)
    print(f"Result: {'✅ Valid Chaos Plan' if is_chaos_valid else '❌ Chaos Mode did not trigger'}")

    if is_chaos_valid and is_sniper_valid:
        print("\n🏆 ARCHITECT VERIFIED: Planner successfully swaps personas based on override.")
    else:
        print("\n⚠️ VERIFICATION FAILED: Personas are leaking or identical.")

if __name__ == "__main__":
    asyncio.run(verify_chaos_logic())
