import json
import logging
import re
from ai.prompts import PLANNER_SYSTEM_PROMPT
from ai.models import TestPlan, TestStep, ActionType, Role
from ai.provider import generate_response

logger = logging.getLogger("orchestrator.planner")

def extract_json_from_text(text: str) -> list:
    """
    Robust extraction that finds individual JSON objects.
    This bypasses 'delimiter' errors caused by messy AI strings.
    """
    steps = []
    matches = re.findall(r"\{[^{}]*\}", text, re.DOTALL)

    for match in matches:
        try:
            # Clean up common AI syntax errors per object
            obj_str = re.sub(r",\s*\}", "}", match)
            steps.append(json.loads(obj_str))
        except:
            # If an individual object is truly broken, skip just that one
            continue
    return steps

async def generate_test_plan(raw_input: str, system_prompt_override: str = None) -> TestPlan:
    logger.info("🧠 AI Planning...")
    base_prompt = system_prompt_override or PLANNER_SYSTEM_PROMPT

    safety = "\nIMPORTANT: Wrap values in single quotes if they contain double quotes. Output valid JSON."
    full_prompt = f"{base_prompt}{safety}\n\nREQUEST: {raw_input}"

    try:
        response_text = generate_response(full_prompt)
        steps_data = extract_json_from_text(response_text)

        if not steps_data:
            match = re.search(r"\[.*\]", response_text, re.DOTALL)
            if match:
                steps_data = json.loads(match.group(0))

    except Exception as e:
        logger.error(f"❌ Planning Failed: {e}")
        return TestPlan(intent=raw_input, steps=[])

    steps = []
    for i, s in enumerate(steps_data):
        try:
            raw_act = s.get('action', 'click')
            # Use the existing normalize logic
            clean_act = normalize_action(raw_act)

            steps.append(TestStep(
                step_id=i + 1,
                role=Role.CUSTOMER,
                action=ActionType(clean_act),
                selector=s.get('selector', ""),
                value=str(s.get('value', "")),
                description=s.get('description', f"Step {i+1}")
            ))
        except: continue

    return TestPlan(intent=raw_input, steps=steps, is_chaos_mode=bool(system_prompt_override))

def normalize_action(raw_action: str) -> str:
    a = str(raw_action).lower().strip()
    mapping = {'goto': 'navigate', 'type': 'input', 'press': 'click', 'check': 'verify_text'}
    return mapping.get(a, a)
