import json
import logging
import re
from typing import Optional, List
from jsonschema import validate, ValidationError
from ai.prompts import PLANNER_SYSTEM_PROMPT
from ai.models import TestPlan, TestStep, ActionType, Role
from ai.provider import AIProvider

logger = logging.getLogger("orchestrator.planner")

# --- THE AUDITOR'S CONTRACT ---
TEST_STEP_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "step_id": {"type": "integer"},
            "action": {
                "type": "string",
                "enum": ["navigate", "click", "input", "wait", "verify_text"]
            },
            "selector": {"type": "string"},
            "value": {"type": "string"},
            "description": {"type": "string"}
        },
        "required": ["action", "description"]
    }
}

def extract_json_from_text(text: str) -> list:
    """
    Strips markdown and conversational text to find the raw JSON array.
    """
    if not text:
        return []

    clean_text = re.sub(r"```json|```", "", text)
    start_idx = clean_text.find("[")
    end_idx = clean_text.rfind("]")

    if start_idx != -1 and end_idx != -1:
        clean_text = clean_text[start_idx : end_idx + 1]

    try:
        return json.loads(clean_text)
    except json.JSONDecodeError:
        steps = []
        matches = re.findall(r"\{[^{}]*\}", clean_text, re.DOTALL)
        for match in matches:
            try:
                obj_str = re.sub(r",\s*\}", "}", match)
                steps.append(json.loads(obj_str))
            except:
                continue
        return steps

async def generate_test_plan(
    raw_input: str,
    system_prompt_override: str = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    encrypted_key: Optional[str] = None
) -> TestPlan:
    """
    Generates a test plan using the specified provider and model.
    """
    base_prompt = system_prompt_override or PLANNER_SYSTEM_PROMPT
    full_prompt = f"{base_prompt}\n\nINTENT: {raw_input}"

    ACTION_MAP = {
        'goto': 'navigate', 'type': 'input', 'fill': 'input',
        'press': 'click', 'check': 'verify_text', 'assert': 'verify_text'
    }

    attempts = 0
    max_retries = 3
    last_error_feedback = ""

    while attempts < max_retries:
        try:
            current_prompt = full_prompt
            if last_error_feedback:
                current_prompt += f"\n\n⚠️ REPAIR INSTRUCTION: Your previous output was invalid:\n{last_error_feedback}\nFix the JSON structure."

            # PASSING THE MODEL DOWN TO THE GATEWAY
            response_text = await AIProvider.generate_response(
                prompt=current_prompt,
                provider=provider,
                model=model,
                encrypted_key=encrypted_key
            )

            steps_data = extract_json_from_text(response_text)
            if not steps_data:
                raise ValueError("No JSON array found in AI response.")

            validate(instance=steps_data, schema=TEST_STEP_SCHEMA)

            steps = []
            for i, s in enumerate(steps_data):
                raw_act = str(s.get('action', 'click')).lower().strip()
                clean_act = ACTION_MAP.get(raw_act, raw_act)

                steps.append(TestStep(
                    step_id=s.get('step_id', i + 1),
                    role=Role.CUSTOMER,
                    action=ActionType(clean_act),
                    selector=s.get('selector', ""),
                    value=str(s.get('value', "")),
                    description=s.get('description', f"Step {i+1}")
                ))

            return TestPlan(intent=raw_input, steps=steps)

        except Exception as e:
            attempts += 1
            last_error_feedback = str(e)
            continue

    return TestPlan(intent=raw_input, steps=[])
