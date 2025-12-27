import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext
from ai.models import TestPlan, TestStep, ActionType, Role
from data.memory import TestMemory

class TestRunner:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.memory = TestMemory()
        self.browser = None
        self.context: dict[Role, BrowserContext] = {} # Store sequence of pages per role
        self.pages: dict[Role, Page] = {}

    async def start_session(self):
        """Launches the browser engine."""
        playwright = await async_playwright().start()
        # We launch a single browser instance to save resources (Cost Rule)
        self.browser = await playwright.chromium.launch(headless=self.headless)

    async def get_role_page(self, role: Role) -> Page:
        """
        Ensures each role (Admin vs Customer) has its own isolated browser context.
        This prevents cookies from leaking between users.
        """
        if role not in self.context:
            # Create a clean context (incognito window) for this role
            self.context[role] = await self.browser.new_context()
            self.pages[role] = await self.context[role].new_page()
            print(f"   👤 Created new browser session for: {role.value}")

        return self.pages[role]

    async def execute_step(self, step: TestStep, run_id: str):
        """Executes a single atomic step."""
        page = await self.get_role_page(step.role)

        print(f"   ▶ Executing Step {step.step_id}: {step.action.value} -> {step.description}")

        try:
            # --- THE SWITCH-CASE LOGIC ---
            if step.action == ActionType.NAVIGATE:
                await page.goto(step.value)

            elif step.action == ActionType.CLICK:
                # We wait for the element to be ready before clicking
                await page.wait_for_selector(step.selector, state="visible")
                await page.click(step.selector)

            elif step.action == ActionType.INPUT:
                await page.fill(step.selector, step.value)

            elif step.action == ActionType.VERIFY_TEXT:
                # Assert text is present
                await page.wait_for_selector(step.selector)
                content = await page.text_content(step.selector)
                assert step.value in content, f"Expected '{step.value}', found '{content}'"

            elif step.action == ActionType.EXTRACT_TEXT:
                # Save data to memory (SQLite)
                text = await page.text_content(step.selector)
                self.memory.save_context(run_id, step.key_to_extract, text.strip(), step.role.value)
                print(f"      💾 Saved memory: {step.key_to_extract} = {text.strip()}")

            elif step.action == ActionType.WAIT:
                await page.wait_for_timeout(int(step.value))

            elif step.action == ActionType.SCREENSHOT:
                path = f"data/artifacts/step_{step.step_id}.png"
                await page.screenshot(path=path)

        except Exception as e:
            print(f"      ❌ Step Failed: {e}")
            # Take error screenshot
            await page.screenshot(path=f"data/artifacts/error_step_{step.step_id}.png")
            raise e

    async def execute_plan(self, plan: TestPlan, run_id: str):
        """Orchestrates the full plan."""
        await self.start_session()

        # --- FIX: Register the run in the DB first! ---
        self.memory.create_run(run_id, plan.intent)

        try:
            for step in plan.steps:
                # Log start of step (optional, but good for debugging)
                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value, "RUNNING", step.description)

                await self.execute_step(step, run_id)

                # Log success
                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value, "PASSED", f"Completed: {step.description}")

            # Update run status to PASSED (Optional improvement for memory.py later)
            print("\n✅ Test Execution Completed Successfully!")

        except Exception as e:
            # Log failure
            print(f"      ❌ Critical Error: {e}")
            raise e
        finally:
            if self.browser:
                await self.browser.close()
