import asyncio
import json
import logging
from typing import Set, List, Dict, Optional
from urllib.parse import urlparse, parse_qs, urlencode
from playwright.async_api import Page
from ai.prompts import CRAWLER_ANALYSIS_PROMPT
from ai.provider import AIProvider
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.crawler")


class AutonomousCrawler:
    """
    AI-powered autonomous web crawler with intelligent page analysis.
    Discovers and analyzes pages within a domain boundary.
    """

    def __init__(
        self,
        start_url: str,
        run_id: str,
        user_id: str,
        max_pages: int = 20,
        credentials: Optional[Dict] = None,
        api_key: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.run_id = run_id
        self.user_id = user_id
        self.start_url = start_url
        self.api_key = api_key
        self.provider = provider
        self.model = model
        self.base_domain = urlparse(start_url).netloc.replace("www.", "")
        self.max_pages = max_pages
        self.credentials = credentials
        self.visited: Set[str] = set()
        self.queue: List[str] = [start_url]
        self.report_data: List[Dict] = []
        self.is_logged_in = False

    def _normalize_url(self, url: str) -> str:
        """Remove tracking parameters and normalize URL structure."""
        try:
            p = urlparse(url)
            q = {
                k: v for k, v in parse_qs(p.query).items()
                if not k.startswith(('utm_', 'ref', 'gclid', 'fbclid'))
            }
            normalized = f"{p.scheme}://{p.netloc}{p.path}"
            if q:
                normalized += f"?{urlencode(q, doseq=True)}"
            return normalized
        except Exception:
            return url

    async def _handle_login(self, page: Page) -> bool:
        """Attempt automatic login if credentials provided."""
        if not self.credentials or self.is_logged_in:
            return False

        try:
            pw_field = page.locator("input[type='password'], input[name*='pass'], input[id*='pass']")
            if await pw_field.count() == 0:
                return False

            user_selector = "input[name*='user'], input[id*='user'], input[name*='email'], [placeholder*='Email']"
            await page.fill(user_selector, self.credentials['username'])
            await pw_field.fill(self.credentials['password'])
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle", timeout=10000)

            self.is_logged_in = True
            logger.info("✅ Automatic login successful")
            return True

        except Exception as e:
            logger.warning(f"Login attempt failed: {e}")
            return False

    async def _analyze_page(self, page: Page, url: str) -> bool:
        """Analyze page content using AI and log results."""
        try:
            body_text = await page.evaluate("document.body.innerText.slice(0, 10000)")
            prompt = CRAWLER_ANALYSIS_PROMPT.format(url=url, body_text=body_text)

            resp = await AIProvider.generate(
                prompt=prompt,
                provider=self.provider,
                model=self.model,
                encrypted_key=self.api_key,
                json_mode=True
            )

            if not resp:
                logger.warning(f"Empty AI response for {url}")
                return False

            data = json.loads(resp)

            if not all(k in data for k in ["page_type", "status"]):
                logger.warning(f"Incomplete AI response for {url}")
                return False

            report_entry = {
                "url": url,
                "page_type": data.get("page_type", "General"),
                "test_executed": data.get("test_name", "Autonomous Discovery"),
                "test_result": "PASS" if data.get("status") == "OK" else "FAIL",
                "actions": data.get("top_3_actions", []),
                "timestamp": asyncio.get_event_loop().time()
            }
            self.report_data.append(report_entry)

            db_bridge.log_step(
                run_id=self.run_id,
                step_id=len(self.report_data),
                role="crawler",
                action="analysis",
                status="PASSED" if data.get("status") == "OK" else "FAILED",
                message=f"[{data.get('page_type')}] {data.get('intelligence', '')}",
                url=url
            )

            return True

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed for {url}: {e}")
            return False
        except Exception as e:
            logger.error(f"Analysis failed for {url}: {e}")
            return False

    async def _discover_links(self, page: Page) -> List[str]:
        """Extract and normalize all in-domain links from current page."""
        try:
            hrefs = await page.evaluate(
                "() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href)"
            )
            return [
                self._normalize_url(h) for h in hrefs
                if self.base_domain in h and not h.endswith(('.pdf', '.zip', '.jpg', '.png'))
            ]
        except Exception as e:
            logger.warning(f"Link discovery failed: {e}")
            return []

    async def run(self, page: Page) -> List[Dict]:
        """Execute autonomous crawl and return collected data."""
        logger.info(f"🚀 Starting Autonomous Crawler on {self.base_domain}")
        consecutive_ai_failures = 0

        while self.queue and len(self.visited) < self.max_pages:
            url = self.queue.pop(0)

            if url in self.visited:
                continue

            self.visited.add(url)

            try:
                response = await page.goto(url, wait_until="networkidle", timeout=15000)

                if not response or response.status >= 400:
                    logger.warning(f"Skipping {url} (HTTP {response.status if response else 'timeout'})")
                    continue

                if not self.is_logged_in and self.credentials:
                    await self._handle_login(page)

                success = await self._analyze_page(page, url)

                if success and url == self.start_url:
                    try:
                        screenshot_bytes = await page.screenshot(type="png")
                        screenshot_url = db_bridge.upload_screenshot(screenshot_bytes)
                        db_bridge.client.table("test_runs").update({
                            "report_url": screenshot_url
                        }).eq("id", self.run_id).execute()
                    except Exception as e:
                        logger.warning(f"Scout entry capture failed: {e}")

                if success:
                    consecutive_ai_failures = 0
                else:
                    consecutive_ai_failures += 1

                if consecutive_ai_failures >= 3:
                    logger.error("⚠️ Neural uplink disconnected - aborting crawl")
                    db_bridge.log_step(
                        run_id=self.run_id,
                        step_id=999,
                        role="system",
                        action="scout",
                        status="FAILED",
                        message="CRITICAL: Neural Uplink disconnected after 3 consecutive failures"
                    )
                    break

                discovered = await self._discover_links(page)
                for link in discovered:
                    if link not in self.visited and link not in self.queue:
                        self.queue.append(link)

            except Exception as e:
                logger.error(f"Crawl error at {url}: {e}")
                continue

        logger.info(f"✅ Crawl complete: {len(self.visited)} pages analyzed")
        return self.report_data
