import asyncio
import logging
from typing import Optional, List
from playwright.async_api import async_playwright, Page, BrowserContext, expect

from ai.models import TestPlan, TestStep, ActionType, ElementFingerprint
from ai.healer import heal_selector
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.runner")

class AutomationRunner:
    def __init__(self, run_id: str, provider: str = None, api_key: str = None, base_url: str = None):
        self.run_id = run_id
        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url
        self.browser_context = None
        self.page = None
        self._playwright = None
        self.healing_audit: List[str] = [] # Mission debrief storage

    async def start_browser(self, headless: bool = True):
        self._playwright = await async_playwright().start()
        browser = await self._playwright.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        self.browser_context = await browser.new_context(viewport={"width": 1280, "height": 720})
        self.page = await self.browser_context.new_page()

    async def stop_browser(self):
        if self.browser_context: await self.browser_context.close()
        if self._playwright: await self._playwright.stop()

    async def execute_plan(self, plan: TestPlan):
        if not self.page: await self.start_browser(headless=True)

        try:
            for step in plan.steps:
                await self.execute_step(step)

            # FINAL MISSION DEBRIEF
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
            selector=step.selector, value=step.value
        )

        try:
            await self._perform_action(step.action, step.selector, step.value)

            db_bridge.log_step(
                run_id=self.run_id, role=role, action=action_val,
                status="PASSED", message="Verified successfully.",
                selector=step.selector, value=step.value
            )

        except Exception as e:
            logger.warning("Step failed. Attempting recovery...")
            db_bridge.log_step(
                run_id=self.run_id, role="system", action="healing",
                status="RUNNING", message=f"UI discrepancy at '{step.selector}'. Healing in progress..."
            )

            heal_result = await self._try_healing(step, e)

            if heal_result:
                self.healing_audit.append(heal_result['reasoning'])
                db_bridge.log_step(
                    run_id=self.run_id, role=role, action=action_val,
                    status="PASSED", message=f"Healed: {heal_result['reasoning']}",
                    selector=heal_result['selector'], value=step.value
                )
            else:
                raise e

    async def _try_healing(self, step: TestStep, original_error: Exception) -> Optional[dict]:
        heal_data = await heal_selector(
            self.page, step.selector, step.description,
            provider=self.provider, encrypted_key=self.api_key
        )
        if heal_data:
            await self._perform_action(step.action, heal_data['selector'], step.value)
            return heal_data
        return None

    async def _perform_action(self, action: ActionType, selector: str, value: str):
        timeout = 5000
        if action == ActionType.NAVIGATE:
            target = self.base_url if self.base_url and "example.com" in value else value
            await self.page.goto(target, wait_until="networkidle")
        elif action == ActionType.CLICK:
            await self.page.click(selector, timeout=timeout)
        elif action == ActionType.INPUT:
            await self.page.fill(selector, value, timeout=timeout)
        elif action == ActionType.WAIT:
            await self.page.wait_for_timeout(int(value) if value and value.isdigit() else 2000)
        elif action == ActionType.VERIFY_TEXT:
            await expect(self.page.locator("body")).to_contain_text(value, timeout=timeout)

    def _handle_final_crash(self, e: Exception):
        # Determine if it's a logic error (navigation) or a hard technical error
        err_msg = str(e)
        diagnosis = "MISSION_HALTED: "
        if "timeout" in err_msg.lower():
            diagnosis += "The required element was not found in the DOM. Ensure previous steps navigated to the correct state."
        else:
            diagnosis += err_msg

        db_bridge.log_step(
            run_id=self.run_id, role="system", action="crash_report",
            status="FAILED", message=diagnosis
        )
