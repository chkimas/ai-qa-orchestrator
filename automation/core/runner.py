import asyncio
import logging
from typing import Optional
from playwright.async_api import async_playwright, Page, BrowserContext
from ai.models import TestPlan, TestStep, ActionType, ElementFingerprint
from ai.healer import heal_selector
from data.memory import create_run, save_run_log, update_run_status
from configs.settings import settings

# Setup Logger
logger = logging.getLogger("orchestrator.runner")

class AutomationRunner:
    def __init__(self):
        self.browser_context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None

    async def start_browser(self, headless: bool = False):
        self._playwright = await async_playwright().start()
        # Launch headed so you can see the browser open
        browser = await self._playwright.chromium.launch(headless=headless, slow_mo=500)

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

    async def execute_plan(self, plan: TestPlan, run_id: str):
        create_run(run_id, plan.intent)

        if not self.page:
            await self.start_browser(headless=False)

        logger.info(f"Starting Run: {run_id} | Steps: {len(plan.steps)}")

        run_failed = False

        for step in plan.steps:
            try:
                await self.execute_step(step, run_id)

                save_run_log(
                    run_id=run_id,
                    step_id=step.step_id,
                    role=step.role.value,
                    action=step.action.value,
                    status="PASSED",
                    details=step.description,
                    selector=step.selector,
                    value=step.value
                )

            except Exception as e:
                logger.error(f"Step {step.step_id} Failed: {e}")
                run_failed = True

                # --- 📸 FIX: Use Absolute Path from Settings ---
                screenshot_name = f"{run_id}_step_{step.step_id}_FAILED.png"
                # Use the Path object from settings to guarantee correct location
                screenshot_path = settings.SCREENSHOTS_DIR / screenshot_name

                logger.info(f"   📸 Saving screenshot to: {screenshot_path}")
                await self.page.screenshot(path=str(screenshot_path))

                # Log failure
                save_run_log(
                    run_id=run_id,
                    step_id=step.step_id,
                    role=step.role.value,
                    action=step.action.value,
                    status="FAILED",
                    details=f"Error: {str(e)}",
                    selector=step.selector,
                    value=step.value
                )

                # Log the screenshot reference so UI can find it
                save_run_log(
                    run_id=run_id,
                    step_id=step.step_id + 999,
                    role="system",
                    action="screenshot",
                    status="PASSED",
                    details=f"IMG: {screenshot_name}",
                    selector="",
                    value=""
                )
                break

        final_status = "FAILED" if run_failed else "PASSED"
        update_run_status(run_id, final_status)

        await self.stop_browser()

    async def execute_step(self, step: TestStep, run_id: str):
        logger.info(f"▶ Step {step.step_id}: {step.action.value}")

        try:
            await self._perform_action(step.action, step.selector, step.value)

            # Record fingerprint after successful interaction for future healing
            if step.selector and step.action in [ActionType.CLICK, ActionType.INPUT]:
                step.fingerprint = await self._capture_fingerprint(step.selector)

        except Exception as e:
            if step.action not in [ActionType.CLICK, ActionType.INPUT]:
                raise e

            if step.fingerprint:
                logger.warning(f"🩹 Primary selector failed. Attempting Fingerprint match...")
                found_selector = await self._find_by_fingerprint(step.fingerprint)
                if found_selector:
                    await self._perform_action(step.action, found_selector, step.value)
                    return

            # 🔴 ATTEMPT 3: Full AI Healing
            new_selector = await heal_selector(self.page, step.selector, step.description)
            if new_selector:
                await self._perform_action(step.action, new_selector, step.value)
                step.selector = new_selector
            else:
                raise e

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
        """Finds element by visual coordinates if ID/CSS changed."""
        try:
            # Try to click at the exact last known X/Y coordinates
            await self.page.mouse.click(fp.location['x'] + 5, fp.location['y'] + 5)
            return f"point:{fp.location['x']},{fp.location['y']}"
        except: return None

    async def _perform_action(self, action: ActionType, selector: str, value: str):
        """Helper to run the actual Playwright command. Used by execute_step and the healer."""

        # Short timeout for the initial try so we trigger healing faster (e.g., 4s instead of 30s)
        # But we default to standard timeout if not specified
        timeout = 5000

        if action == ActionType.NAVIGATE:
            await self.page.goto(value)

        elif action == ActionType.CLICK:
            await self.page.click(selector, timeout=timeout)

        elif action == ActionType.INPUT:
            await self.page.fill(selector, value, timeout=timeout)

        elif action == ActionType.WAIT:
            await self.page.wait_for_timeout(int(value or 1000))

        elif action == ActionType.VERIFY_TEXT:
            if selector and selector != 'body':
                content = await self.page.text_content(selector)
            else:
                content = await self.page.content()

            if value not in (content or ""):
                raise AssertionError(f"Expected text '{value}' not found")
