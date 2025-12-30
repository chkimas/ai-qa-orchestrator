import asyncio
from playwright.async_api import async_playwright
from ai.crawler import AutonomousCrawler
from ai.reporter import generate_report

async def main():
    target_url = "https://www.saucedemo.com/"  # Or any site you want to map

    creds = {"username": "standard_user", "password": "secret_sauce"}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        scout = AutonomousCrawler(start_url=target_url, max_pages=15, credentials=creds)
        data = await scout.run(page)

        generate_report(data)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
