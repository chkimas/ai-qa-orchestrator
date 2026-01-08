import asyncio
import json
import logging
import re
from typing import Set, List, Dict, Optional
from urllib.parse import urlparse, parse_qs, urlencode
from playwright.async_api import Page
from ai.prompts import CRAWLER_ANALYSIS_PROMPT
from ai.provider import generate_response
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.crawler")
logger.setLevel(logging.INFO)

class AutonomousCrawler:
    def __init__(self, start_url: str, run_id: str, max_pages: int = 20, credentials: Optional[Dict] = None):
        self.run_id = run_id
        self.start_url: str = start_url
        self.base_domain: str = urlparse(start_url).netloc.replace("www.", "")
        self.max_pages: int = max_pages
        self.credentials: Optional[Dict] = credentials

        self.visited: Set[str] = set()
        self.queue: List[str] = [start_url]
        self.report_data: List[Dict] = []
        self.is_logged_in: bool = False

    def _normalize_url(self, url: str) -> str:
        """Standardize URLs to prevent redundant crawling."""
        try:
            p = urlparse(url)
            q = {k: v for k, v in parse_qs(p.query).items() if not k.startswith(('utm_', 'ref', 'gclid'))}
            return f"{p.scheme}://{p.netloc}{p.path}?{urlencode(q, doseq=True)}".rstrip('?')
        except Exception:
            return url

    async def _handle_login(self, page: Page) -> bool:
        """Fuzzy login handler for autonomous authentication."""
        if not self.credentials or self.is_logged_in:
            return False
        try:
            # Anchor to the password field using a more robust check
            pw_field = page.locator("input[type='password'], input[name*='pass'], input[id*='pass']")
            if await pw_field.count() == 0:
                return False

            # Use the credentials from your Injection Data
            user_selector = "input[name*='user'], input[id*='user'], input[name*='email'], [placeholder*='Email']"
            await page.fill(user_selector, self.credentials['username'])
            await pw_field.fill(self.credentials['password'])

            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle")
            self.is_logged_in = True
            logger.info(f"🔑 Autonomous login successful for {self.base_domain}")
            return True
        except Exception:
            return False

    async def _analyze_page(self, page: Page, url: str):
        """AI-driven page classification and stability logging."""
        try:
            body_text = await page.evaluate("document.body.innerText.slice(0, 3000)")
            prompt = CRAWLER_ANALYSIS_PROMPT.format(url=url, body_text=body_text)

            resp = await generate_response(prompt)
            match = re.search(r"\{.*\}", resp, re.DOTALL)
            if not match:
                logger.warning(f"⚠️ Analysis result for {url} contained no JSON.")
                return

            data = json.loads(match.group(0))
            fingerprint = data.get("fingerprint", {})

            # Prepare report data for the Reporter
            report_entry = {
                "url": url,
                "page_type": data.get("page_type", "General"),
                "test_executed": data.get("test_name", "Autonomous Discovery"),
                "test_result": "PASS" if data.get("status") == "OK" else "FAIL",
                "dna": fingerprint,
                "timestamp": asyncio.get_event_loop().time()
            }
            self.report_data.append(report_entry)

            # LOG TO SUPABASE: Feeds the Risk Heatmap
            db_bridge.log_step(
                run_id=self.run_id,
                step_index=len(self.report_data),
                role="crawler",
                action="analysis",
                status="PASSED" if data.get("status") == "OK" else "FAILED",
                message=f"Analyzed {data.get('page_type')} - Status: {data.get('status')}",
                url=url,
                selector=fingerprint.get("selector") if fingerprint else None
            )

        except Exception as e:
            logger.warning(f"⚠️ Analysis failed for {url}: {e}")

    async def _discover_links(self, page: Page) -> List[str]:
        """Extract internal links to continue the crawl."""
        try:
            hrefs = await page.evaluate(
                "() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href)"
            )
            # Stay within the base domain
            return [self._normalize_url(h) for h in hrefs if self.base_domain in h]
        except Exception:
            return []

    async def run(self, page: Page) -> List[Dict]:
        """The Main Autonomous Execution Loop."""
        logger.info(f"🚀 Starting Autonomous Crawl on {self.start_url}")

        while self.queue and len(self.visited) < self.max_pages:
            url = self.queue.pop(0)
            if url in self.visited:
                continue
            self.visited.add(url)

            try:
                # wait_until="networkidle" is best for React/Next.js discovery
                response = await page.goto(url, wait_until="networkidle", timeout=15000)

                if not response or response.status >= 400:
                    logger.error(f"⚠️ Page Load Error {response.status if response else 'N/A'} at {url}")
                    continue

                # Handle login if we encounter a password field
                if not self.is_logged_in and self.credentials:
                    await self._handle_login(page)

                # Perform AI Analysis
                await self._analyze_page(page, url)

                # Discover and Queue new links
                new_links = await self._discover_links(page)
                for link in new_links:
                    if link not in self.visited:
                        self.queue.append(link)

            except Exception as e:
                logger.error(f"💥 Crawl stalled at {url}: {e}")

        logger.info(f"🏁 Crawl complete. Visited {len(self.visited)} pages.")
        return self.report_data
