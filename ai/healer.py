import logging
from ai.provider import generate_response

logger = logging.getLogger("orchestrator.healer")

async def heal_selector(page, failed_selector: str, original_intent: str, provider=None, encrypted_key=None):
    logger.warning(f"🩹 Healing triggered for: {failed_selector}")

    try:
        dom_snapshot = await page.evaluate("""() => {
            const clean = document.body.cloneNode(true);
            const rubbish = clean.querySelectorAll('script, style, svg, path, noscript');
            rubbish.forEach(el => el.remove());
            return clean.innerHTML.slice(0, 15000);
        }""")

        prompt = f"""
        I am an automated tester. I failed to find an element.
        FAILED SELECTOR: "{failed_selector}"
        USER INTENT: "{original_intent}"
        HTML Snapshot: {dom_snapshot}

        TASK:
        1. Find a robust selector for the intent.
        2. Briefly explain why the original failed (e.g., 'ID changed' or 'Dynamic class').

        OUTPUT FORMAT: SELECTOR | REASONING
        Example: [data-test='login'] | Original placeholder 'User' changed to 'Email/User'
        """

        raw_response = await generate_response(prompt, provider=provider, encrypted_key=encrypted_key)

        if "|" in str(raw_response):
            parts = str(raw_response).split("|")
            new_selector = parts[0].strip().replace("`", "").replace('"', '').replace("'", "")
            reasoning = parts[1].strip()
        else:
            new_selector = str(raw_response).strip().replace("`", "").replace('"', '').replace("'", "")
            reasoning = "Selector optimized for visual/semantic match."

        logger.info(f"✅ Healed Selector: {new_selector} ({reasoning})")
        return {"selector": new_selector, "reasoning": reasoning}

    except Exception as e:
        logger.error(f"❌ Healing failed: {e}")
        return None
