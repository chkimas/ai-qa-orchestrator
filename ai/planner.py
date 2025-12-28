import json
import google.generativeai as genai
from configs.settings import settings
from ai.models import TestPlan, TestStep, ActionType, Role

# Configure the AI Key
genai.configure(api_key=settings.GOOGLE_API_KEY)

async def generate_test_plan(intent: str) -> TestPlan:
    print(f"   🧠 AI Thinking about: '{intent}'...")

    # 1. The Prompt (Updated with 'Unified Context' Rules)
    prompt = f"""
    You are a QA Automation Architect.
    User Intent: "{intent}"

    TASK: Create a step-by-step test plan for a web automation robot.

    ⚠️ CRITICAL CONTEXT RULES:
    1. **Unified Context:** ALWAYS use "customer" for actions that happen in the browser (navigate, click, input, verify_text, wait).
    2. **NO 'system' for Browser Checks:** Do NOT use "system" for `verify_text` or `wait`. If the user is logged in, the verification MUST happen as "customer" to see the page.
    3. Only use "system" if you need a completely clean, fresh browser window (unlikely).

    OUTPUT RULES:
    1. Return ONLY valid JSON. No markdown, no text.
    2. Use this schema for steps:
       [
         {{
           "step_id": 1,
           "role": "customer",  <-- ALMOST ALWAYS "customer"
           "action": "navigate" | "click" | "input" | "verify_text" | "wait",
           "selector": "css_selector_here" (use "" for navigate/wait),
           "value": "url_or_text_value",
           "description": "human readable explanation"
         }}
       ]
    3. For 'navigate', value is the URL.
    4. For 'click', selector is required.
    5. For 'input', selector and value (text to type) are required.
    6. For 'verify_text', selector is the element to check, value is the expected text.
    """

    # 2. Call Gemini
    try:
        model = genai.GenerativeModel(settings.MODEL_NAME)
        response = await model.generate_content_async(prompt)

        # 3. Clean and Parse JSON
        # Handle potential markdown wrappers if the AI forgets the rule
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        steps_data = json.loads(raw_text)

    except Exception as e:
        print(f"   ❌ AI Planning Failed: {e}")
        return TestPlan(intent=intent, steps=[])

    # 4. Convert JSON to Pydantic Models
    steps = []
    for s in steps_data:
        try:
            # Safe role conversion (default to customer if AI hallucinates)
            role_str = s.get('role', 'customer').lower()
            if role_str not in ['customer', 'system', 'admin']:
                role_str = 'customer'

            step = TestStep(
                step_id=s['step_id'],
                role=Role(role_str),
                action=ActionType(s['action']),
                selector=s.get('selector', "") or "",
                value=s.get('value', "") or "",
                description=s.get('description', "No description provided")
            )
            steps.append(step)
        except Exception as e:
            print(f"   ⚠️ Skipping invalid step: {e}")

    return TestPlan(intent=intent, steps=steps)
