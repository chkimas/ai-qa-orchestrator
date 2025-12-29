import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext, TimeoutError as PlaywrightTimeoutError, expect
import google.generativeai as genai
from groq import AsyncGroq
from ai.models import TestPlan, TestStep, ActionType, Role
from data.memory import TestMemory
from configs.settings import settings

if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

class TestRunner:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.memory = TestMemory()
        self.browser = None
        self.context: dict[Role, BrowserContext] = {}
        self.pages: dict[Role, Page] = {}
        settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async def start_session(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=self.headless,
            slow_mo=500,
            args=["--start-maximized", "--disable-web-security"]
        )

    async def get_role_page(self, role: Role) -> Page:
        if role not in self.context:
            self.context[role] = await self.browser.new_context(
                no_viewport=True, ignore_https_errors=True
            )
            self.pages[role] = await self.context[role].new_page()
        return self.pages[role]

    async def capture_screenshot(self, page: Page, run_id: str, step_id: int, status: str) -> str:
        filename = f"{run_id}_step_{step_id}_{status}.png"
        filepath = settings.SCREENSHOTS_DIR / filename
        try:
            await page.screenshot(path=filepath, full_page=True)
            print(f"      📸 Screenshot saved: {filename}")
        except Exception:
            print("      ⚠️ Could not save screenshot")
        return filename

    async def heal_selector(self, page: Page, invalid_selector: str, description: str) -> str | None:
        print(f"      🩹 Self-Healing: {description}...")
        try:
            # 🔥 FIX: Get BODY only (skip Head/CSS) to ensure AI sees the elements
            # Increased limit to 20k to cover longer pages
            html_content = await page.evaluate("document.body.outerHTML")
            clean_html = html_content[:20000]

            prompt = f"""
            I need the CSS selector for: "{description}"
            Current invalid selector: "{invalid_selector}"

            HTML CONTEXT:
            {clean_html}

            RULES:
            1. Look for the element in the HTML.
            2. Return ONLY the CSS selector string.
            3. Preference: ID (#) > specific class (.) > data-test attribute.
            4. Do NOT invent 'data-test' attributes if they are not in the HTML.
            5. Check for underscores (_) vs dashes (-).
            """

            if settings.AI_PROVIDER == "google":
                model = genai.GenerativeModel(settings.GOOGLE_MODEL)
                response = await model.generate_content_async(prompt)
                new_selector = response.text.strip().strip('"\'')
            else:  # groq
                completion = await groq_client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1
                )
                new_selector = completion.choices[0].message.content.strip().strip('"\'')

            # Validate
            if await page.locator(new_selector).count() > 0:
                print(f"      ✨ HEALED: '{invalid_selector}' → '{new_selector}'")
                return new_selector
            else:
                print(f"      ❌ Invalid heal: '{new_selector}' not found in DOM")

        except Exception as e:
            print(f"      ⚠️ Healing failed: {e}")
        return None

    async def execute_step(self, step: TestStep, run_id: str):
        page = await self.get_role_page(step.role)
        print(f"   ▶ Step {step.step_id}: {step.action.value}")

        TIMEOUT_MS = 10000

        for attempt in range(2):
            try:
                await page.wait_for_load_state("domcontentloaded", timeout=10000)

                if step.action == ActionType.NAVIGATE:
                    await page.goto(step.value, wait_until="domcontentloaded", timeout=TIMEOUT_MS)

                elif step.action == ActionType.CLICK:
                    locator = page.locator(step.selector)
                    await expect(locator).to_be_visible(timeout=TIMEOUT_MS)
                    await locator.click(timeout=TIMEOUT_MS)

                elif step.action == ActionType.INPUT:
                    locator = page.locator(step.selector)
                    await expect(locator).to_be_visible(timeout=TIMEOUT_MS)
                    await locator.fill(step.value, timeout=TIMEOUT_MS)

                elif step.action == ActionType.VERIFY_TEXT:
                    target_selector = step.selector or "body"
                    locator = page.locator(target_selector)
                    await expect(locator).to_contain_text(step.value, timeout=TIMEOUT_MS)

                elif step.action == ActionType.WAIT:
                    await page.wait_for_timeout(int(step.value))
                break

            except (PlaywrightTimeoutError, AssertionError):
                if attempt == 0:
                    print(f"      ⚠️ Healing: {step.selector}")
                    new_selector = await self.heal_selector(page, step.selector, step.description)
                    if new_selector:
                        step.selector = new_selector
                        self.memory.log_step(run_id, step.step_id, "system", "heal", "HEALED",
                                           f"Healed: '{step.selector}' → '{new_selector}'")
                        continue
                await self.capture_screenshot(page, run_id, step.step_id, "FAILED")
                raise

            except Exception as e:
                print(f"      ❌ Error: {e}")
                await self.capture_screenshot(page, run_id, step.step_id, "ERROR")
                raise

    async def execute_plan(self, plan: TestPlan, run_id: str):
        await self.start_session()
        self.memory.create_run(run_id, plan.intent)

        try:
            for step in plan.steps:
                safe_selector = step.selector or ""
                safe_value = step.value or ""
                print(f"   📝 Step {step.step_id}: '{safe_selector}' | '{safe_value}'")

                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value,
                                   "RUNNING", step.description, safe_selector, safe_value)
                await self.execute_step(step, run_id)
                self.memory.log_step(run_id, step.step_id, step.role.value, step.action.value,
                                   "PASSED", step.description, safe_selector, safe_value)

            if plan.steps:
                last_role = plan.steps[-1].role
                last_page = await self.get_role_page(last_role)
                await self.capture_screenshot(last_page, run_id, 999, "SUCCESS")

            print("\n✅ PRODUCTION TEST COMPLETE! 🎉")

        except Exception as e:
            print(f"\n💥 FAILED: {e}")
            raise
        finally:
            if self.browser:
                await self.browser.close()
