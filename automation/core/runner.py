import asyncio
import logging
from typing import Optional
from playwright.async_api import async_playwright, Page, BrowserContext, expect

from ai.models import TestPlan, TestStep, ActionType, ElementFingerprint
from ai.healer import heal_selector
from data.supabase_client import db_bridge
from configs.settings import settings

logger = logging.getLogger("orchestrator.runner")

class AutomationRunner:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.browser_context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None

    async def start_browser(self, headless: bool = True):
        """Starts Playwright with stealth settings."""
        self._playwright = await async_playwright().start()
        browser = await self._playwright.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )

        self.browser_context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir="dashboard/public/videos/"
        )
        self.page = await self.browser_context.new_page()
        logger.info("Browser started successfully")

    async def stop_browser(self):
        if self.browser_context:
            await self.browser_context.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser stopped")

    async def execute_plan(self, plan: TestPlan):
        """Main execution loop with live cloud streaming."""
        if not self.page:
            await self.start_browser(headless=True)

        logger.info(f"Starting Run: {self.run_id} | Steps: {len(plan.steps)}")

        try:
            for step in plan.steps:
                await self.execute_step(step)

            db_bridge.update_run_status(self.run_id, "PASSED")
        except Exception as e:
            logger.error(f"Plan execution halted: {e}")
            db_bridge.update_run_status(self.run_id, "FAILED")
        finally:
            await self.stop_browser()

    async def execute_step(self, step: TestStep):
        """Executes a step with 3-tier fallback: Primary -> Fingerprint -> AI Heal."""
        role = step.role.value
        action_val = step.action.value

        db_bridge.log_step(
            run_id=self.run_id, role=role, action=action_val,
            status="RUNNING", details=step.description,
            selector=step.selector, value=step.value
        )

        try:
            await self._perform_action(step.action, step.selector, step.value)

            # Capture Fingerprint for future self-healing
            if step.selector and step.action in [ActionType.CLICK, ActionType.INPUT]:
                step.fingerprint = await self._capture_fingerprint(step.selector)

            db_bridge.log_step(
                run_id=self.run_id, role=role, action=action_val,
                status="PASSED", details="Successfully executed",
                selector=step.selector, value=step.value
            )

        except Exception as e:
            logger.warning(f"Step failed. Starting healing protocol...")
            db_bridge.log_step(
                run_id=self.run_id, role="system", action="healing",
                status="RUNNING", details=f"Selector {step.selector} failed. Healing..."
            )

            healed_selector = await self._try_healing(step, e)

            if healed_selector:
                db_bridge.log_step(
                    run_id=self.run_id, role=role, action=action_val,
                    status="PASSED", details=f"Healed using: {healed_selector}",
                    selector=healed_selector, value=step.value
                )
            else:
                self._handle_failure(step, e)
                raise e

    async def _try_healing(self, step: TestStep, original_error: Exception) -> Optional[str]:
        """Tries Fingerprint match then AI Healing."""
        # Fingerprint Fallback
        if step.fingerprint:
            found_selector = await self._find_by_fingerprint(step.fingerprint)
            if found_selector:
                await self._perform_action(step.action, found_selector, step.value)
                return found_selector

        # AI Healing Fallback
        new_selector = await heal_selector(self.page, step.selector, step.description)
        if new_selector:
            await self._perform_action(step.action, new_selector, step.value)
            return new_selector

        return None

    async def _perform_action(self, action: ActionType, selector: str, value: str):
        timeout = 5000 # 5s timeout to trigger healing faster

        if action == ActionType.NAVIGATE:
            await self.page.goto(value, wait_until="networkidle")
        elif action == ActionType.CLICK:
            await self.page.click(selector, timeout=timeout)
        elif action == ActionType.INPUT:
            await self.page.fill(selector, value, timeout=timeout)
        elif action == ActionType.WAIT:
            await self.page.wait_for_timeout(int(value or 1000))
        elif action == ActionType.VERIFY_TEXT:
            await expect(self.page.locator("body")).to_contain_text(value, timeout=timeout)

    async def _capture_fingerprint(self, selector: str) -> Optional[ElementFingerprint]:
        try:
            el = self.page.locator(selector).first
            box = await el.bounding_box()
            return ElementFingerprint(
                tag=await el.evaluate("el => el.tagName"),
                text=await el.inner_text(),
                location={"x": box['x'], "y": box['y']} if box else {"x": 0, "y": 0},
                attributes=await el.evaluate("el => Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value]))")
            )
        except: return None

    async def _find_by_fingerprint(self, fp: ElementFingerprint) -> Optional[str]:
        try:
            await self.page.mouse.click(fp.location['x'] + 5, fp.location['y'] + 5)
            return f"coordinates:{fp.location['x']},{fp.location['y']}"
        except: return None

    def _handle_failure(self, step: TestStep, e: Exception):
        db_bridge.log_step(
            run_id=self.run_id, role=step.role.value, action=step.action.value,
            status="FAILED", details=str(e),
            selector=step.selector, value=step.value
        )
