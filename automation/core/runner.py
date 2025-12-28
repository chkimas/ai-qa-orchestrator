import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext, TimeoutError as PlaywrightTimeoutError
import google.generativeai as genai
from groq import AsyncGroq
from ai.models import TestPlan, TestStep, ActionType, Role
from data.memory import TestMemory
from configs.settings import settings

# Configure Google (if available)
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

# Configure Groq
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

class TestRunner:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.memory = TestMemory()
        self.browser = None
        self.context: dict[Role, BrowserContext] = {}
        self.pages: dict[Role, Page] = {}

        # Ensure Screenshot Directory Exists
        settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async def start_session(self):
        playwright = await async_playwright().start()
        # --- SPEED UPDATE: slow_mo reduced from 2000 to 500 ---
        self.browser = await playwright.chromium.launch(
            headless=False,
            slow_mo=500,  # <--- THE SPEED FIX (0.5s delay)
            args=["--start-maximized"]
        )

    async def get_role_page(self, role: Role) -> Page:
        if role not in self.context:
            self.context[role] = await self.browser.new_context(no_viewport=True)
            self.pages[role] = await self.context[role].new_page()
        return self.pages[role]

    async def capture_screenshot(self, page: Page, run_id: str, step_id: int, status: str) -> str:
        filename = f"{run_id}_step_{step_id}_{status}.png"
        filepath = settings.SCREENSHOTS_DIR / filename
        try:
            await page.screenshot(path=filepath)
            print(f"      📸 Screenshot saved: {filepath}")
        except Exception:
            print("      ⚠️ Could not save screenshot (browser might be closed)")
        return filename

    async def heal_selector(self, page: Page, invalid_selector: str, description: str) -> str | None:
        print(f"      🩹 Initiating Self-Healing for: {description}...")
        try:
            html_content = await page.evaluate("document.body.outerHTML")
            cleaned_html = html_content[:15000] # Truncate for token limits

            prompt = f"""
            I am a Test Automation Agent. I failed to find an element.
            GOAL: {description}
            OLD SELECTOR: {invalid_selector}
            CONTEXT: HTML snippet below.
            TASK: Return ONLY the best CSS selector string. No quotes, no markdown.
            HTML: {cleaned_html}
            """

            new_selector = ""

            # --- HEALING ENGINE SWITCH ---
            if settings.AI_PROVIDER == "google":
                model = genai.GenerativeModel(settings.GOOGLE_MODEL)
                response = await model.generate_content_async(prompt)
                new_selector = response.text.strip()

            elif settings.AI_PROVIDER == "groq":
                completion = await groq_client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a CSS selector expert. Return only the selector string."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1
                )
                new_selector = completion.choices[0].message.content.strip()

            print(f"      ✨ AI Suggested Fix: {new_selector}")
            return new_selector

        except Exception as e:
            print(f"      ⚠️ Healing Failed: {e}")
            return None

    async def execute_step(self, step: TestStep, run_id: str):
        page = await self.get_role_page(step.role)
        print(f"   ▶ Executing Step {step.step_id}: {step.action.value}")

        TIMEOUT_MS = 15000

        attempts = 2
        for attempt in range(attempts):
            try:
                if step.action == ActionType.NAVIGATE:
                    await page.goto(step.value, timeout=TIMEOUT_MS)
                elif step.action == ActionType.CLICK:
                    await page.wait_for_selector(step.selector, state="visible", timeout=TIMEOUT_MS)
                    await page.click(step.selector, timeout=TIMEOUT_MS)
                elif step.action == ActionType.INPUT:
                    await page.wait_for_selector(step.selector, state="visible", timeout=TIMEOUT_MS)
                    await page.fill(step.selector, step.value, timeout=TIMEOUT_MS)
                elif step.action == ActionType.VERIFY_TEXT:
                    await page.wait_for_selector(step.selector, state="visible", timeout=TIMEOUT_MS)
                    content = await page.text_content(step.selector, timeout=TIMEOUT_MS)
                    assert step.value in content, f"Expected '{step.value}', found '{content}'"
                elif step.action == ActionType.WAIT:
                    await page.wait_for_timeout(int(step.value))
                break

            except PlaywrightTimeoutError:
                if attempt == 0:
                    print(f"      ⚠️ Element not found: {step.selector}. Attempting to heal...")
                    new_selector = await self.heal_selector(page, step.selector, step.description)
                    if new_selector:
                        self.memory.log_step(run_id, step.step_id, "system", "heal", "WARNING", f"Selector healed! '{step.selector}' -> '{new_selector}'")
                        step.selector = new_selector
                        continue
                raise
            except Exception as e:
                print(f"      ❌ Step Failed: {e}")
                await self.capture_screenshot(page, run_id, step.step_id, "FAILED")
                raise e

    async def execute_plan(self, plan: TestPlan, run_id: str):
        await self.start_session()
        self.memory.create_run(run_id, plan.intent)

        try:
            for step in plan.steps:
                safe_selector = step.selector if step.selector else ""
                safe_value = step.value if step.value else ""
                print(f"   📝 Logging Step {step.step_id}: Sel='{safe_selector}' Val='{safe_value}'")

                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value, "RUNNING", step.description, safe_selector, safe_value)
                await self.execute_step(step, run_id)
                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value, "PASSED", step.description, safe_selector, safe_value)

            # --- VICTORY SCREENSHOT LOGIC ---
            print("   📸 Taking Final Victory Screenshot...")
            if plan.steps:
                last_role = plan.steps[-1].role
                last_page = await self.get_role_page(last_role)
                final_img = await self.capture_screenshot(last_page, run_id, 999, "SUCCESS")
                self.memory.log_step(run_id, 999, "system", "screenshot", "PASSED", f"Final State | IMG:{final_img}")

            print("   ⏳ Holding browser open for 5 seconds to admire the work...")
            await asyncio.sleep(5) # Reduced wait time at end too
            print("\n✅ Test Execution Completed Successfully!")

        except Exception as e:
            print(f"      ❌ Critical Error: {e}")
            print("      ⏳ CRASH DETECTED! Holding browser open for 60 seconds so you can see why...")
            await asyncio.sleep(60)
            raise e
        finally:
            if self.browser:
                await self.browser.close()
