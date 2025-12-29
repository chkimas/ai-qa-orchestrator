import json
import google.generativeai as genai
from groq import AsyncGroq
from configs.settings import settings
from ai.models import TestPlan, TestStep, ActionType, Role

# Configure Clients
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

async def generate_test_plan(intent: str) -> TestPlan:
    provider = settings.AI_PROVIDER
    print(f"   🧠 AI ({provider.upper()}) Thinking about: '{intent}'...")

    # Shared System Prompt
    system_prompt = """
    You are a QA Automation Architect.

    ⚠️ CRITICAL CONTEXT RULES:
    1. **Unified Context:** ALWAYS use "customer" for actions that happen in the browser.
    2. **NO 'system' for Browser Checks:** Do NOT use "system" for `verify_text`.
    3. **STRICT ACTIONS:** You must ONLY use these exact action names: 'navigate', 'click', 'input', 'wait', 'verify_text'. DO NOT use 'send_keys', 'type', or 'fill'.

    OUTPUT RULES:
    1. Return ONLY valid JSON. No markdown, no explanations.
    2. Schema: [{"step_id": 1, "role": "customer", "action": "navigate", "selector": "", "value": "url", "description": "desc"}]
    """

    user_prompt = f"""
    User Intent: "{intent}"
    TASK: Create a step-by-step test plan for a web automation robot using the rules above.
    """

    try:
        raw_text = ""

        # --- ENGINE A: GOOGLE GEMINI ---
        if provider == "google":
            # UPDATED: Now uses settings.GOOGLE_MODEL
            model = genai.GenerativeModel(settings.GOOGLE_MODEL)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = await model.generate_content_async(full_prompt)
            raw_text = response.text

        # --- ENGINE B: GROQ (LLAMA 3) ---
        elif provider == "groq":
            completion = await groq_client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                stream=False
            )
            raw_text = completion.choices[0].message.content

        clean_json = raw_text.replace("```json", "").replace("```", "").strip()
        steps_data = json.loads(clean_json)

    except Exception as e:
        print(f"   ❌ AI Planning Failed ({provider}): {e}")
        return TestPlan(intent=intent, steps=[])

    steps = []
    for s in steps_data:
        try:
            role_str = s.get('role', 'customer').lower()
            if role_str not in ['customer', 'system']: role_str = 'customer'

            step = TestStep(
                step_id=s['step_id'],
                role=Role(role_str),
                action=ActionType(s['action']),
                selector=s.get('selector', "") or "",
                value=s.get('value', "") or "",
                description=s.get('description', "No description")
            )
            steps.append(step)
        except Exception as e:
            print(f"   ⚠️ Skipping invalid step: {e}")

    return TestPlan(intent=intent, steps=steps)
