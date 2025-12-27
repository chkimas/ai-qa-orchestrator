import os
from dotenv import load_dotenv
from ai.planner import TestPlanner

# Load environment variables (API Key)
load_dotenv()

def test_ai_planning():
    # 1. Check for API Key
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ ERROR: GOOGLE_API_KEY not found in .env file.")
        return

    print("🧠 Initializing AI Planner (Gemini)...")
    planner = TestPlanner()

    # 2. Define a sample intent
    intent = "Customer logs in, searches for 'Laptop', and adds the first item to cart."
    print(f"\n📋 Intent: {intent}")

    # 3. Generate Plan
    try:
        plan = planner.generate_plan(intent)

        # 4. Display Result
        print("\n✅ AI Plan Generated Successfully!")
        print("-" * 40)
        for step in plan.steps:
            print(f"Step {step.step_id} [{step.role.upper()}]: {step.action} -> {step.description}")
            if step.selector:
                print(f"   Target: {step.selector}")
            if step.value:
                print(f"   Value: {step.value}")
        print("-" * 40)

    except Exception as e:
        print(f"\n❌ AI Generation Failed: {e}")

if __name__ == "__main__":
    test_ai_planning()
