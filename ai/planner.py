import json
import logging
import re
from ai.prompts import PLANNER_SYSTEM_PROMPT
from ai.models import TestPlan, TestStep, ActionType, Role
from ai.provider import generate_response

logger = logging.getLogger("orchestrator.planner")
logger.setLevel(logging.INFO)

def extract_json_from_text(text: str) -> str:
    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if match: return match.group(1)
    match = re.search(r"\[.*\]", text, re.DOTALL)
    return match.group(0) if match else text.strip()

def normalize_action(raw_action: str) -> str:
    mapping = {
        'goto': 'navigate', 'go': 'navigate', 'visit': 'navigate',
        'type': 'input', 'write': 'input', 'fill': 'input',
        'press': 'click', 'tap': 'click', 'submit': 'click',
        'check': 'verify_text', 'verify': 'verify_text', 'assert': 'verify_text',
        'sleep': 'wait', 'pause': 'wait'
    }
    return mapping.get(raw_action.lower().strip(), raw_action.lower().strip())

async def generate_test_plan(raw_input: str) -> TestPlan:
    logger.info("🧠 AI Planning...")
    full_prompt = f"{PLANNER_SYSTEM_PROMPT}\n\nREQUEST: {raw_input}"

    try:
        response_text = generate_response(full_prompt)
        steps_data = json.loads(extract_json_from_text(response_text))
    except Exception as e:
        logger.error(f"❌ Planning Failed: {e}")
        return TestPlan(intent=raw_input, steps=[])

    steps = []
    base_url_match = re.search(r"Base URL:\s*(https?://[^\s]+)", raw_input)
    forced_url = base_url_match.group(1) if base_url_match else ""

    for i, s in enumerate(steps_data):
        action = normalize_action(s.get('action', ''))
        value = s.get('value', "")

        if action == 'navigate' and forced_url: value = forced_url

        steps.append(TestStep(
            step_id=i + 1,
            role=Role.CUSTOMER if s.get('role', 'customer') == 'customer' else Role.SYSTEM,
            action=ActionType(action),
            selector=s.get('selector', "body" if action == 'verify_text' else ""),
            value=str(value),
            description=s.get('description', f"Step {i+1}")
        ))
    return TestPlan(intent=raw_input, steps=steps)
