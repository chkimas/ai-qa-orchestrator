import asyncio
import json
import logging
import re
import sys
from typing import Set, List, Dict, Optional
from urllib.parse import urlparse, parse_qs, urlencode
from playwright.async_api import Page
from ai.prompts import CRAWLER_ANALYSIS_PROMPT
from ai.provider import generate_response

logger = logging.getLogger("orchestrator.crawler")
logger.setLevel(logging.INFO)

class AutonomousCrawler:
    def __init__(self, start_url: str, max_pages: int = 20, credentials: Optional[Dict] = None):
        self.start_url = start_url
        self.base_domain = urlparse(start_url).netloc.replace("www.", "")
        self.max_pages = max_pages
        self.credentials = credentials
        self.visited, self.queue, self.report_data = set(), [start_url], []
        self.is_logged_in = False

    def _normalize_url(self, url: str) -> str:
        try:
            p = urlparse(url)
            q = {k: v for k, v in parse_qs(p.query).items() if not k.startswith(('utm_', 'ref', 'gclid'))}
            return f"{p.scheme}://{p.netloc}{p.path}?{urlencode(q, doseq=True)}".rstrip('?')
        except: return url

    async def _handle_login(self, page: Page) -> bool:
        if not self.credentials or self.is_logged_in or await page.locator("input[type='password']").count() == 0: return False
        try:
            await page.click("input[name*='user'], input[placeholder*='user'], input[id*='user']")
            await page.keyboard.type(self.credentials['username'], delay=50)
            await page.click("input[type='password']")
            await page.keyboard.type(self.credentials['password'], delay=50)
            await page.keyboard.press("Enter")
            await asyncio.sleep(3)
            self.is_logged_in = True
            return True
        except: return False

    async def _analyze_page(self, page: Page, url: str):
        body_text = await page.evaluate("document.body.innerText.slice(0, 1000)")
        prompt = CRAWLER_ANALYSIS_PROMPT.format(url=url, body_text=body_text)

        try:
            resp = generate_response(prompt)
            data = json.loads(re.search(r"\{.*\}", resp, re.DOTALL).group(0))

            # Capturing the "Fingerprint" of the main CTA for the report
            # This allows the 'Healer' to know what the button looked like when it was WORKING.
            fingerprint = data.get('fingerprint')

            self.report_data.append({
                "url": url,
                "type": data.get('page_type', 'General'),
                "test_executed": data.get('test_name'),
                "test_result": "✅ PASS" if data.get('status') == "OK" else "❌ FAIL",
                "dna": fingerprint
            })
        except Exception as e:
            logger.warning(f"⚠️ Analysis Failed: {e}")

    async def _discover_links(self, page: Page) -> List[str]:
        hrefs = await page.evaluate("() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href)")
        return [self._normalize_url(h) for h in hrefs if self.base_domain in h]

    async def run(self, page: Page):
        while self.queue and len(self.visited) < self.max_pages:
            url = self.queue.pop(0)
            if url in self.visited: continue
            self.visited.add(url)

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=10000)
                if await self._handle_login(page): continue
                await self._analyze_page(page, url)
                for link in await self._discover_links(page):
                    if link not in self.visited: self.queue.append(link)
            except Exception as e:
                logger.error(f"⚠️ Failed {url}: {e}")
        return self.report_data
