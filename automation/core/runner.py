import asyncio
import logging
import json
import re
from typing import Optional, List, Any
from playwright.async_api import async_playwright, Page, BrowserContext, expect

from ai.models import TestPlan, TestStep, ActionType
from ai.healer import heal_selector
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.runner")

class AutomationRunner:
    def __init__(self, run_id: str, provider: str = None, model: str = None, api_key: str = None, base_url: str = None):
        self.run_id = run_id
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.browser_context = None
        self.page = None
        self._playwright = None
        self.healing_audit: List[str] = []

    async def start_browser(self, headless: bool = True):
        self._playwright = await async_playwright().start()
        browser = await self._playwright.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        )
        self.browser_context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        self.page = await self.browser_context.new_page()

    async def stop_browser(self):
        try:
            if self.browser_context: await self.browser_context.close()
            if self._playwright: await self._playwright.stop()
        except Exception as e:
            logger.error(f"Error during browser teardown: {e}")

    def _extract_selector_string(self, selector: Any) -> str:
        """
        Surgical Extraction: Ensures Playwright only ever receives a raw string.
        Handles dicts, stringified JSON, and Markdown residue.
        """
        if not selector:
            return ""

        # Case 1: Real Dictionary
        if isinstance(selector, dict):
            return str(selector.get('selector', selector)).strip()

        # Case 2: Stringified JSON or Hallucinated Object
        if isinstance(selector, str):
            trimmed = selector.strip()
            # Check if it's a JSON-like string (starts with { and contains "selector")
            if trimmed.startswith("{") and "selector" in trimmed:
                try:
                    # Replace single quotes with double quotes for valid JSON parsing
                    clean_json = trimmed.replace("'", '"')
                    data = json.loads(clean_json)
                    return str(data.get('selector', trimmed)).strip()
                except:
                    # Regex fallback if json.loads fails (AI often misses quotes)
                    match = re.search(r'["\']selector["\']\s*:\s*["\']([^"\']+)["\']', trimmed)
                    if match:
                        return match.group(1)

            # Final fallback: strip any quotes the AI might have added to the raw string
            return trimmed.replace('"', '').replace("'", "")

        return str(selector).strip()

    async def execute_plan(self, plan: TestPlan):
        if not self.page: await self.start_browser(headless=True)

        try:
            for step in plan.steps:
                await self.execute_step(step)

            summary = "✅ Mission Successful."
            if self.healing_audit:
                summary += f" Self-healing resolved {len(self.healing_audit)} UI discrepancies."

            db_bridge.log_step(
                run_id=self.run_id, role="system", action="summary",
                status="COMPLETED", message=summary
            )
            db_bridge.update_run_status(self.run_id, "PASSED")

        except Exception as e:
            self._handle_final_crash(e)
            db_bridge.update_run_status(self.run_id, "FAILED")
        finally:
            await self.stop_browser()

    async def execute_step(self, step: TestStep):
        role = step.role.value
        action_val = step.action.value

        db_bridge.log_step(
            run_id=self.run_id, role=role, action=action_val,
            status="RUNNING", message=step.description,
            url=self.page.url if self.page else self.base_url,
            selector=step.selector, value=step.value
        )

        try:
            await self._perform_action(step.action, step.selector, step.value)

            db_bridge.log_step(
                run_id=self.run_id, role=role, action=action_val,
                status="PASSED", message="Step completed.",
                url=self.page.url, selector=step.selector, value=step.value
            )

        except Exception as e:
            logger.warning(f"Step failure: {e}. Initiating Self-Healing...")

            heal_result = await self._try_healing(step, e)

            if heal_result:
                # extraction of the target selector string
                target_selector = self._extract_selector_string(heal_result)
                reasoning = heal_result.get('reasoning', 'UI Optimized.')
                self.healing_audit.append(reasoning)

                # Retry with cleaned selector
                await self._perform_action(step.action, target_selector, step.value)

                db_bridge.log_step(
                    run_id=self.run_id, role=role, action=action_val,
                    status="PASSED", message=f"🩹 HEAL_SUCCESS: {reasoning}",
                    url=self.page.url, selector=target_selector, value=step.value
                )
            else:
                raise e

    async def _try_healing(self, step: TestStep, original_error: Exception) -> Optional[dict]:
        try:
            heal_data = await heal_selector(
                self.page, step.selector, step.description,
                provider=self.provider, model=self.model, encrypted_key=self.api_key
            )
            if isinstance(heal_data, str):
                return {"selector": heal_data, "reasoning": "Simple string recovery."}
            return heal_data
        except Exception as he:
            logger.error(f"Healer failure: {he}")
            return None

    async def _perform_action(self, action: ActionType, raw_selector: Any, value: str):
        """Playwright Execution Node. Sanitizes selector before any browser call."""

        selector = self._extract_selector_string(raw_selector)
        timeout = 10000 # 10s for high-latency Docker/HF environments

        if action == ActionType.NAVIGATE:
            target = self.base_url if self.base_url and "example.com" in (value or "") else value
            await self.page.goto(target, wait_until="networkidle")

        elif action == ActionType.CLICK:
            await self.page.click(selector, timeout=timeout)

        elif action == ActionType.INPUT:
            await self.page.fill(selector, value, timeout=timeout)

        elif action == ActionType.WAIT:
            await self.page.wait_for_timeout(int(value) if str(value).isdigit() else 2000)

        elif action == ActionType.VERIFY_TEXT:
            await expect(self.page.locator("body")).to_contain_text(value, timeout=timeout)

        elif action == ActionType.EXTRACT_TEXT:
            content = await self.page.inner_text(selector, timeout=timeout)
            logger.info(f"DATA_EXTRACTED: {content}")

    def _handle_final_crash(self, e: Exception):
        err_msg = str(e)
        diagnosis = "MISSION_HALTED: "

        if "timeout" in err_msg.lower():
            diagnosis += "Target UI element timed out. Possible DOM change or slow render."
        elif "Unsupported token" in err_msg or "{" in err_msg:
            diagnosis += "Neural Selector Error: Failed to flatten JSON into a string selector."
        else:
            diagnosis += err_msg

        db_bridge.log_step(
            run_id=self.run_id, role="system", action="crash_report",
            status="FAILED", message=diagnosis
        )
