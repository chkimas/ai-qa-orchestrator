import json
import logging
import re
from typing import Optional
from jsonschema import validate
from ai.prompts import PLANNER_SYSTEM_PROMPT
from ai.models import TestPlan, TestStep, ActionType, Role
from ai.provider import AIProvider
from ai.analyzer import RiskAnalyzer

logger = logging.getLogger("orchestrator.planner")

TEST_STEP_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "step_id": {"type": "integer"},
            "action": {"type": "string", "enum": ["navigate", "click", "input", "wait", "verify_text"]},
            "selector": {"type": "string"},
            "value": {"type": "string"},
            "description": {"type": "string"}
        },
        "required": ["action", "description"]
    }
}


def extract_json_from_text(text: str) -> list:
    """Extract JSON array from AI response with markdown fallback."""
    if not text:
        return []

    clean_text = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()

    try:
        result = json.loads(clean_text)
        return result if isinstance(result, list) else [result]
    except json.JSONDecodeError:
        pass

    match = re.search(r'\[\s*\{.*?\}\s*\]', clean_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return []


async def generate_test_plan(
    raw_input: str,
    system_prompt_override: str = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    encrypted_key: Optional[str] = None,
    target_url: str = ""
) -> TestPlan:
    """
    Generate AI-powered test plan with historical risk awareness.

    Consults stability analyzer to guide selector strategy for brittle pages.
    """
    analyzer = RiskAnalyzer()
    stability = await analyzer.get_url_stability_report(target_url)

    stability_hint = f"\n\nSTABILITY_CONTEXT: Target is {stability['status']} (Risk: {stability['score']}/100)."
    if stability['status'] == "BRITTLE":
        stability_hint += "\nADVISORY: Use strictly semantic selectors (data-testid, aria-label) to avoid failure."

    base_prompt = system_prompt_override or PLANNER_SYSTEM_PROMPT
    full_prompt = f"{base_prompt}{stability_hint}\n\nINTENT: {raw_input}"

    ACTION_MAP = {
        'goto': 'navigate',
        'type': 'input',
        'fill': 'input',
        'press': 'click',
        'check': 'verify_text',
        'assert': 'verify_text'
    }

    for attempt in range(3):
        try:
            response_text = await AIProvider.generate(
                prompt=full_prompt,
                provider=provider,
                model=model,
                encrypted_key=encrypted_key,
                json_mode=True
            )

            steps_data = extract_json_from_text(response_text)
            if not steps_data:
                raise ValueError("No JSON array found in AI response")

            validate(instance=steps_data, schema=TEST_STEP_SCHEMA)

            steps = [
                TestStep(
                    step_id=s.get('step_id', i + 1),
                    role=Role.CUSTOMER,
                    action=ActionType(ACTION_MAP.get(
                        str(s.get('action')).lower().strip(),
                        str(s.get('action')).lower().strip()
                    )),
                    selector=s.get('selector', ""),
                    value=str(s.get('value', "")),
                    description=s.get('description', f"Step {i+1}")
                )
                for i, s in enumerate(steps_data)
            ]

            return TestPlan(intent=raw_input, steps=steps)

        except Exception as e:
            logger.warning(f"Planning attempt {attempt + 1}/3 failed: {e}")
            if attempt == 2:
                logger.error("All planning attempts exhausted")

    return TestPlan(intent=raw_input, steps=[])
