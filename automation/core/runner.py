import asyncio
import logging
from typing import Optional
from playwright.async_api import async_playwright, Page, BrowserContext
from ai.models import TestPlan, TestStep, ActionType, Role
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
        """Executes a single step with Self-Healing capabilities."""
        logger.info(f"▶ Step {step.step_id}: {step.action.value}")

        if not self.page:
            raise ValueError("Browser not initialized")

        try:
            # 🟢 ATTEMPT 1: Execute normally
            await self._perform_action(step.action, step.selector, step.value)

        except Exception as e:
            # If it's a verification or wait failure, we don't heal. We only heal interaction failures.
            if step.action not in [ActionType.CLICK, ActionType.INPUT]:
                raise e

            logger.warning(f"⚠️ Step failed ({e}). Initiating Self-Healing for: {step.selector}")

            # 🟠 ATTEMPT 2: Self-Healing
            new_selector = await heal_selector(
                self.page,
                step.selector,
                step.description or f"{step.action.value} on {step.selector}"
            )

            if new_selector and new_selector != step.selector:
                try:
                    logger.info(f"🩹 Retrying with Healed Selector: {new_selector}")

                    # Retry the action with the new selector
                    await self._perform_action(step.action, new_selector, step.value)

                    # ✅ LOG THE HEAL EVENT (So it shows in Dashboard)
                    save_run_log(
                        run_id=run_id,
                        step_id=step.step_id,
                        role="system",
                        action="heal",
                        status="HEALED",
                        details=f"Healed: '{step.selector}' -> '{new_selector}'",
                        selector=new_selector,
                        value=step.value
                    )

                    # Update the step object in memory so subsequent logs use the correct selector
                    step.selector = new_selector
                    return # Exit successfully

                except Exception as retry_error:
                    logger.error(f"💀 Healed selector also failed: {retry_error}")
                    raise retry_error # Raise the *retry* error

            # If healing returned None or failed to find a better selector, raise original error
            raise e

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
