import asyncio
import logging
import json
import re
from typing import Optional, List, Any, Dict
from playwright.async_api import async_playwright, Page, BrowserContext, expect

from ai.models import TestPlan, TestStep, ActionType
from ai.healer import heal_selector
from data.supabase_client import db_bridge


logger = logging.getLogger("orchestrator.runner")


class AutomationRunner:
    def __init__(
        self,
        run_id: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.run_id = run_id
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.browser_context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None
        self.healing_audit: List[str] = []

    async def start_browser(self, headless: bool = True):
        """Launch Chromium browser with stealth configuration."""
        self._playwright = await async_playwright().start()
        browser = await self._playwright.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        )
        self.browser_context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        )
        self.page = await self.browser_context.new_page()
        self.page.on("dialog", lambda dialog: asyncio.create_task(dialog.dismiss()))

    async def stop_browser(self):
        """Clean up browser resources."""
        try:
            if self.browser_context:
                await self.browser_context.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            logger.error(f"Browser teardown error: {e}")

    def _extract_selector_string(self, selector: Any) -> str:
        """
        Extract clean selector string from various input formats.
        Handles JSON objects, markdown blocks, and plain strings.
        """
        if not selector:
            return ""

        s = str(selector).strip()

        # Remove markdown code blocks
        s = re.sub(r'```(?:json)?\s*|\s*```', '', s).strip()

        # Handle JSON objects with selector property
        if s.startswith("{") and "selector" in s:
            try:
                data = json.loads(s.replace("'", '"'))
                s = str(data.get("selector", s))
            except json.JSONDecodeError:
                # Fallback to regex extraction
                match = re.search(r'["\']selector["\']\s*:\s*["\']([^"\']+)["\']', s)
                if match:
                    s = match.group(1)

        # Handle simple ID-like strings (assume they're IDs or name attributes)
        if re.match(r"^[a-zA-Z0-9_-]+$", s):
            return f"#{s}, [name='{s}'], [placeholder*='{s}' i], [aria-label*='{s}' i]"

        return s.strip("'\"")

    async def execute_plan(self, plan: TestPlan):
        """Execute full test plan with self-healing capabilities."""
        if not self.page:
            await self.start_browser(headless=True)

        try:
            for step in plan.steps:
                await self.execute_step(step)

            summary = "✅ Mission Successful."
            if self.healing_audit:
                summary += f" Self-healing resolved {len(self.healing_audit)} UI discrepancies."

            db_bridge.log_step(
                run_id=self.run_id,
                role="system",
                action="summary",
                status="COMPLETED",
                message=summary,
            )
            db_bridge.update_run_status(self.run_id, "COMPLETED")

        except Exception as e:
            self._handle_final_crash(e)
            db_bridge.update_run_status(self.run_id, "FAILED")
        finally:
            await self.stop_browser()

    async def execute_step(self, step: TestStep):
        """Execute single test step with automatic healing on failure."""
        role = step.role.value
        action_val = step.action.value

        db_bridge.log_step(
            run_id=self.run_id,
            role=role,
            action=action_val,
            status="RUNNING",
            message=step.description,
            url=self.page.url if self.page else self.base_url,
            selector=step.selector,
            value=step.value,
        )

        try:
            await self._perform_action(step.action, step.selector, step.value)

            db_bridge.log_step(
                run_id=self.run_id,
                role=role,
                action=action_val,
                status="PASSED",
                message="Step completed.",
                url=self.page.url if self.page else None,
                selector=step.selector,
                value=step.value,
            )

        except Exception as e:
            logger.warning(f"Step failure: {e}. Initiating Self-Healing...")

            heal_result = await self._try_healing(step, e)

            if heal_result and isinstance(heal_result, dict):
                target_selector = self._extract_selector_string(heal_result.get("selector"))
                reasoning = heal_result.get("reasoning", "UI Optimized.")
                self.healing_audit.append(reasoning)

                # Retry with healed selector
                await self._perform_action(step.action, target_selector, step.value)

                db_bridge.log_step(
                    run_id=self.run_id,
                    role=role,
                    action=action_val,
                    status="PASSED",
                    message=f"🩹 HEAL_SUCCESS: {reasoning}",
                    url=self.page.url if self.page else None,
                    selector=target_selector,
                    value=step.value,
                )
            else:
                raise e

    async def _try_healing(
        self, step: TestStep, original_error: Exception
    ) -> Optional[Dict[str, str]]:
        """Attempt to heal broken selector using AI."""
        try:
            heal_data = await heal_selector(
                self.page,
                step.selector or "",
                step.description,
                provider=self.provider,
                model=self.model,
                encrypted_key=self.api_key,
            )

            if isinstance(heal_data, str):
                return {"selector": heal_data, "reasoning": "Simple string recovery."}

            return heal_data if isinstance(heal_data, dict) else None

        except Exception as he:
            logger.error(f"Healer failure: {he}")
            return None

    async def _perform_action(
        self, action: ActionType, raw_selector: Any, value: Optional[str]
    ):
        """
        Execute Playwright action with semantic waiting and actionability checks.
        """
        if not self.page:
            raise RuntimeError("Browser page not initialized")

        selector = self._extract_selector_string(raw_selector)
        timeout = 15000

        if action == ActionType.NAVIGATE:
            target = value or self.base_url
            if not target or target.lower() in ["", "url", "target", "base_url"]:
                target = self.base_url

            if not target:
                raise ValueError("No navigation target URL provided")

            logger.info(f"🚀 NAVIGATING TO: {target}")
            await self.page.goto(target, wait_until="networkidle", timeout=30000)

        elif action == ActionType.CLICK:
            await self.page.wait_for_selector(selector, state="visible", timeout=timeout)
            await self.page.click(selector, timeout=timeout)

        elif action == ActionType.INPUT:
            if not value:
                logger.warning("INPUT action called with empty value")
                return

            await self.page.wait_for_selector(selector, state="visible", timeout=timeout)
            await self.page.fill(selector, value, timeout=timeout)

        elif action == ActionType.WAIT:
            wait_time = int(value) if value and value.isdigit() else 2000
            await self.page.wait_for_timeout(wait_time)

        elif action == ActionType.VERIFY_TEXT:
            if not value:
                logger.warning("VERIFY_TEXT action called with empty value")
                return

            is_negative = any(
                x in value.lower() for x in ["not contain", "does not", "should not"]
            )

            clean_value = (
                value.replace("does not contain", "")
                .replace("not contain", "")
                .replace("'", "")
                .strip()
            )

            if is_negative:
                await expect(self.page.locator("body")).not_to_contain_text(
                    clean_value, timeout=timeout
                )
            else:
                await expect(self.page.locator("body")).to_contain_text(
                    value, timeout=timeout
                )

        elif action == ActionType.EXTRACT_TEXT:
            await self.page.wait_for_selector(selector, state="attached", timeout=timeout)
            content = await self.page.inner_text(selector, timeout=timeout)
            logger.info(f"DATA_EXTRACTED: {content}")

    def _handle_final_crash(self, e: Exception):
        """Log final crash report with diagnostic information."""
        err_msg = str(e)
        diagnosis = "MISSION_HALTED: "

        if "timeout" in err_msg.lower():
            diagnosis += "Target UI element timed out. Possible DOM change or slow render."
        elif "selector" in err_msg.lower():
            diagnosis += "Selector resolution failed. Element not found in DOM."
        else:
            diagnosis += err_msg

        db_bridge.log_step(
            run_id=self.run_id,
            role="system",
            action="crash_report",
            status="FAILED",
            message=diagnosis,
        )
