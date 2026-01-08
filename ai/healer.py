import json
import logging
import re
from typing import Dict, Optional

from playwright.async_api import Page
from ai.provider import AIProvider

logger = logging.getLogger("orchestrator.healer")


def extract_json_object(text: str) -> Optional[Dict[str, str]]:
    """
    Extract the first valid JSON object from a string.
    Handles extra text, markdown, and partial formatting.
    """
    match = re.search(r"\{(?:[^{}]|(?R))*\}", text, re.DOTALL)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


async def heal_selector(
    page: Page,
    broken_selector: str,
    intent: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    encrypted_key: Optional[str] = None,
) -> Optional[Dict[str, str]]:
    """
    Self-healing mechanism:
    1. Capture current DOM snapshot
    2. Send intent + broken selector + DOM to AI
    3. AI returns corrected selector with reasoning
    """

    try:
        dom_html = await page.content()

        if len(dom_html) > 50000:
            dom_html = dom_html[:50000] + "\n<!-- DOM TRUNCATED -->"

        prompt = f"""
            You are an expert UI test healer.

            A test step failed because the selector could not find the target element.

            Failed selector: {broken_selector}
            Intended action: {intent}
            Current page URL: {page.url}

            DOM Snapshot:
            BEGIN_DOM
            {dom_html}
            END_DOM

            Your task:
            1. Analyze the DOM and identify the correct element for the intended action.
            2. Provide a robust CSS or XPath selector that will reliably target that element.
            3. Prefer semantic selectors (aria-label, data-testid, role) over brittle or positional selectors.
            4. Explain your reasoning briefly.

            Response requirements (MANDATORY):
            - Respond ONLY with valid JSON
            - No markdown
            - No code blocks
            - No commentary
            - No trailing text
            - Use double quotes only
            - Must be parseable by Python json.loads()

            Required JSON format:
            {{"selector":"your-robust-selector-here","reasoning":"Brief explanation of why this selector is better"}}

            If no suitable element exists, return:
            {{"selector":"","reasoning":"No suitable element found"}}
            """.strip()

        ai = AIProvider(
            provider=provider or "gemini",
            model=model,
            api_key=encrypted_key,
        )

        response = await ai.generate(prompt)

        if not response:
            logger.error("Healer received empty response from AI")
            return None

        logger.debug(f"Raw AI response:\n{response}")

        result = extract_json_object(response)

        if not isinstance(result, dict):
            logger.error(f"Healer AI returned invalid JSON\nResponse:\n{response}")
            return None

        selector = result.get("selector")
        reasoning = result.get("reasoning", "AI-optimized selector")

        if not selector:
            logger.error("Healer AI did not provide a selector")
            return None

        logger.info(f"🩹 HEAL_SUCCESS: {reasoning} → {selector}")

        return {
            "selector": str(selector),
            "reasoning": str(reasoning),
        }

    except Exception as e:
        logger.error(f"Healer crashed: {e}", exc_info=True)
        return None
