import json
import logging
import re
from typing import Dict, Optional

from playwright.async_api import Page
from ai.provider import AIProvider

logger = logging.getLogger("orchestrator.healer")


def extract_json_object(text: str) -> Optional[Dict]:
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'(\{[\s\S]*\})', text)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                return None
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
    AI-powered self-healing mechanism for broken selectors.

    Captures DOM snapshot, analyzes with AI, validates the suggested selector,
    and returns a corrected selector with reasoning.

    Args:
        page: Playwright Page object
        broken_selector: The selector that failed
        intent: Description of intended action
        provider: AI provider to use
        model: AI model to use
        encrypted_key: Encrypted API key

    Returns:
        Dict with 'selector' and 'reasoning', or None if healing failed
    """
    try:
        try:
            dom_html = await page.inner_html("body", timeout=5000)
        except Exception:
            dom_html = await page.content()

        if len(dom_html) > 55000:
            dom_html = dom_html[:55000] + "\n<!-- TRUNCATED -->"

        prompt = f"""TASK: Resolve a broken UI selector.

CONTEXT:
- Action: {intent}
- Failed Selector: {broken_selector}
- URL: {page.url}

DOM SNAPSHOT:
{dom_html}

INSTRUCTIONS:
1. Identify the element matching the intended action
2. Selector priority: [data-testid] > [aria-label] > [role] > [id] > [name] > CSS class
3. Return ONLY valid JSON (no markdown, no commentary)

REQUIRED FORMAT:
{{
    "selector": "your-selector-here",
    "reasoning": "Brief explanation",
    "found": true
}}

If no suitable element exists:
{{
    "selector": "",
    "reasoning": "No matching element found",
    "found": false
}}
""".strip()

        response = await AIProvider.generate(
            prompt=prompt,
            provider=provider,
            model=model,
            encrypted_key=encrypted_key,
            json_mode=True
        )

        if not response:
            logger.warning("Healer received empty AI response")
            return None

        result = extract_json_object(response)

        if not result or not result.get("found") or not result.get("selector"):
            logger.warning(f"Healer: No replacement found for '{broken_selector}'")
            return None

        new_selector = str(result["selector"]).strip()
        reasoning = str(result.get("reasoning", "AI-optimized selector"))

        try:
            is_visible = await page.is_visible(new_selector, timeout=3000)
            if not is_visible:
                logger.warning(f"Healer: Suggested selector '{new_selector}' exists but not visible")
                return None
        except Exception as e:
            logger.error(f"Healer: Invalid selector syntax '{new_selector}': {e}")
            return None

        logger.info(f"🩹 HEALED: '{broken_selector}' → '{new_selector}' | {reasoning}")

        return {
            "selector": new_selector,
            "reasoning": reasoning,
        }

    except Exception as e:
        logger.error(f"Healer failed: {e}", exc_info=True)
        return None
