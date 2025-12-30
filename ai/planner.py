import json
import logging
import re
from typing import Optional
from ai.prompts import PLANNER_SYSTEM_PROMPT
from ai.models import TestPlan, TestStep, ActionType, Role
from ai.provider import ModelGateway

logger = logging.getLogger("orchestrator.planner")

def extract_json_from_text(text: str) -> list:
    """Robust extraction for messy AI strings."""
    steps = []
    # Try to find an array first
    array_match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except: pass

    # Fallback to individual object extraction
    matches = re.findall(r"\{[^{}]*\}", text, re.DOTALL)
    for match in matches:
        try:
            obj_str = re.sub(r",\s*\}", "}", match)
            steps.append(json.loads(obj_str))
        except: continue
    return steps

async def generate_test_plan(
    raw_input: str,
    system_prompt_override: str = None,
    provider: Optional[str] = None,
    encrypted_key: Optional[str] = None
) -> TestPlan:
    """
    Platinum Planner: Supports dynamic AI providers and user-provided keys.
    """
    logger.info(f"🧠 AI Planning via {provider or 'Default'}...")
    base_prompt = system_prompt_override or PLANNER_SYSTEM_PROMPT

    # Added structural hints for the Multi-Model Gateway
    full_prompt = f"{base_prompt}\n\nREQUEST: {raw_input}\nOUTPUT JSON ONLY."

    try:
        response_text = ModelGateway.generate_response(
            prompt=full_prompt,
            provider=provider,
            encrypted_key=encrypted_key
        )

        steps_data = extract_json_from_text(response_text)

    except Exception as e:
        logger.error(f"❌ Planning Failed: {e}")
        return TestPlan(intent=raw_input, steps=[])

    steps = []
    for i, s in enumerate(steps_data):
        try:
            raw_act = s.get('action', 'click')
            clean_act = normalize_action(raw_act)

            steps.append(TestStep(
                step_id=i + 1,
                role=Role.CUSTOMER,
                action=ActionType(clean_act),
                selector=s.get('selector', ""),
                value=str(s.get('value', "")),
                description=s.get('description', f"Step {i+1}")
            ))
        except Exception as e:
            logger.warning(f"Skipping malformed step {i}: {e}")
            continue

    return TestPlan(intent=raw_input, steps=steps, is_chaos_mode=bool(system_prompt_override))

def normalize_action(raw_action: str) -> str:
    a = str(raw_action).lower().strip()
    mapping = {
        'goto': 'navigate',
        'type': 'input',
        'fill': 'input',
        'press': 'click',
        'check': 'verify_text',
        'assert': 'verify_text'
    }
    return mapping.get(a, a)
