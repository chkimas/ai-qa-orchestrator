import logging
from ai.provider import generate_response  # Ensure this imports your main LLM function

logger = logging.getLogger("orchestrator.healer")

async def heal_selector(page, failed_selector: str, original_intent: str) -> str:
    """
    Scrapes the DOM to find a better selector when the original fails.
    """
    logger.warning(f"🩹 Healing triggered for: {failed_selector}")

    try:
        # 1. SNAPSHOT THE DOM 📸
        # We strip scripts/styles/svgs to keep the token count low and focus on structure
        dom_snapshot = await page.evaluate("""() => {
            const clean = document.body.cloneNode(true);
            const rubbish = clean.querySelectorAll('script, style, svg, path, noscript');
            rubbish.forEach(el => el.remove());
            // Return first 15k chars to avoid token limits
            return clean.innerHTML.slice(0, 15000);
        }""")

        # 2. ASK THE AI 🧠
        prompt = f"""
        I am an automated tester. I failed to find an element.

        FAILED SELECTOR: "{failed_selector}"
        USER INTENT: "{original_intent}"

        Here is the CLEANED HTML of the current page:
        ```html
        {dom_snapshot}
        ```

        TASK:
        Analyze the HTML. Find the one true robust selector (ID, data-test, name, or placeholder) that matches the User Intent.

        RULES:
        1. Return ONLY the selector string.
        2. No markdown, no json, no explanations.
        3. If multiple exist, prioritize: `[placeholder]`, then `[data-test]`, then `[id]`.
        """

        # Call your LLM
        new_selector = generate_response(prompt).strip()

        # Cleanup response just in case
        new_selector = new_selector.replace("`", "").replace('"', '').replace("'", "")

        logger.info(f"✅ Healed Selector: {new_selector}")
        return new_selector

    except Exception as e:
        logger.error(f"❌ Healing failed: {e}")
        return None
