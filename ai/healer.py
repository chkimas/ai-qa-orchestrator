import logging
from ai.provider import generate_response

logger = logging.getLogger("orchestrator.healer")

async def heal_selector(
    page,
    failed_selector: str,
    original_intent: str,
    provider=None,
    model=None,
    encrypted_key=None
):
    logger.warning(f"🩹 Healing triggered for: {failed_selector}")

    try:
        # Optimized DOM snapshot focusing only on interactive/text elements
        dom_snapshot = await page.evaluate("""() => {
            const clean = document.body.cloneNode(true);
            const rubbish = clean.querySelectorAll('script, style, svg, path, noscript, iframe, link');
            rubbish.forEach(el => el.remove());
            // Filter to keep attributes that matter for testing (id, class, data-*)
            return clean.innerHTML.slice(0, 15000);
        }""")

        prompt = f"""
        MISSION: SELF-HEALING RECOVERY
        I am an automated tester. I failed to find an element using the previous selector.

        FAILED SELECTOR: "{failed_selector}"
        USER INTENT: "{original_intent}"
        CURRENT DOM CONTEXT: {dom_snapshot}

        TASK:
        1. Analyze the DOM to find a robust, Playwright-compatible selector that satisfies the USER INTENT.
        2. Briefly explain why the original failed (e.g., 'ID changed', 'React re-render', 'Dynamic class').

        OUTPUT FORMAT: SELECTOR | REASONING
        Example: [data-testid='login-btn'] | Original ID 'submit' is missing; found matching test-id.
        """

        # PASSING THE MODEL: Healing now uses the same neural engine as the Planner
        raw_response = await generate_response(
            prompt,
            provider=provider,
            model=model,
            encrypted_key=encrypted_key
        )

        if not raw_response:
            return None

        if "|" in str(raw_response):
            parts = str(raw_response).split("|")
            new_selector = parts[0].strip().replace("`", "").replace('"', '').replace("'", "")
            reasoning = parts[1].strip()
        else:
            new_selector = str(raw_response).strip().replace("`", "").replace('"', '').replace("'", "")
            reasoning = "Selector optimized for visual/semantic match."

        logger.info(f"✅ HEAL_SUCCESS: {new_selector} | LOG: {reasoning}")
        return {"selector": new_selector, "reasoning": reasoning}

    except Exception as e:
        logger.error(f"❌ Healing failed: {e}")
        return None
