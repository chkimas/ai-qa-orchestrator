"""
Argus QA Reporter: Executive audit generation with AI-driven risk analysis.
Consumes crawl data and historical stability intelligence to produce actionable markdown reports.
"""

import json
import datetime
import re
import asyncio
import logging
from typing import List, Dict, Optional

from ai.provider import AIProvider
from ai.analyzer import RiskAnalyzer

logger = logging.getLogger("orchestrator.reporter")


class QA_Reporter:
    """
    Executive QA Audit Generator (2026 Standard).
    Synthesizes crawl data, historical risk intelligence, and AI analysis into production-readiness reports.
    """

    @staticmethod
    async def generate_report(
        crawl_data: List[Dict],
        total_time_seconds: float = 0.0,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None
    ) -> str:
        """
        Generate an executive QA audit report from crawl data.

        Args:
            crawl_data: List of page analysis results from autonomous crawler
            total_time_seconds: Total execution time of the test run
            provider: AI provider override (optional)
            model: Specific model override (optional)
            encrypted_key: Encrypted API key from user vault (optional)

        Returns:
            Filename of the generated markdown report
        """
        if not crawl_data:
            logger.warning("⚠️ No data collected to generate report")
            return "No data collected to generate report."

        total_pages = len(crawl_data)
        total_tests = len([d for d in crawl_data if d.get('test_executed')])
        
        passed = len([
            d for d in crawl_data 
            if str(d.get('test_result', '')).upper() == "PASS" or d.get('test_result') is True
        ])
        failed = total_tests - passed
        pass_rate = round((passed / total_tests * 100), 1) if total_tests > 0 else 0

        try:
            analyzer = RiskAnalyzer()
            heatmap_data = analyzer.generate_heatmap()
            
            crawl_urls = {c.get('url', '') for c in crawl_data}
            relevant_risk = [
                item for item in heatmap_data 
                if any(crawl_url in item.get('url', '') for crawl_url in crawl_urls)
            ]
            
            logger.info(f"📊 Retrieved {len(relevant_risk)} relevant risk items from historical data")
        except Exception as e:
            logger.warning(f"⚠️ Could not retrieve risk heatmap: {e}")
            relevant_risk = []

        run_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        target_url = crawl_data[0].get('url', 'N/A') if crawl_data else 'N/A'

        prompt = f"""
         You are a Principal SDET Architect. Generate a high-level Executive QA Audit.

         ### DATA SUMMARY
         - Target: {target_url}
         - Metrics: {total_pages} pages analyzed, {total_tests} tests executed, {pass_rate}% Pass Rate
         - Duration: {total_time_seconds:.2f}s
         - Historical Risk Intelligence: {json.dumps(relevant_risk[:5], indent=2)}
         - Execution Details: {json.dumps(crawl_data, indent=2)}

         ### REQUIRED MARKDOWN STRUCTURE:
         1. # 🛡️ Executive QA Audit ({run_date})
         2. ## 📊 Key Metrics
            (Markdown Table format:)
            | Metric | Value |
            |--------|-------|
            | Pages Analyzed | {total_pages} |
            | Tests Executed | {total_tests} |
            | Pass Rate | {pass_rate}% |
            | Duration | {total_time_seconds:.2f}s |

         3. ## 🌡️ Predictive Stability Heatmap
            (List the top risky URLs from Historical Intelligence. For each URL, explain:)
            - WHY it is brittle (based on failure/heal rates from historical data)
            - What specific elements tend to break
            - Recommended stabilization actions

         4. ## 🔍 Critical Findings
            (Bullet points identifying:)
            - Blockers discovered in this run
            - Bot-walls or access restrictions encountered
            - UI inconsistencies or broken workflows
            - Authentication issues
            - High-risk page types requiring attention

         5. ## 🧪 Execution Log
            (Markdown Table format:)
            | URL | Page Type | Test Case | Status |
            |-----|-----------|-----------|--------|
            (One row per crawl_data entry with actual values)

         6. ## ⚠️ Final Risk Assessment
            (Principal-level insight:)
            - Is the build stable for Production? (Yes/No with confidence level)
            - Critical blockers that must be addressed before release
            - Recommended next actions for the QA and Engineering teams
            - Overall stability score (0-100)

         ### CONSTRAINTS:
         - Output ONLY valid Markdown (no JSON, no code blocks around the markdown)
         - Use actual data from the summaries provided
         - Be authoritative and data-driven
         - Avoid generic statements; reference specific URLs and failure patterns
         """.strip()

        try:
            logger.info("🤖 Generating AI-driven executive report...")
            
            report_content = await AIProvider.generate(
                prompt,
                provider=provider,
                model=model,
                encrypted_key=encrypted_key
            )

            if not report_content or len(report_content.strip()) < 100:
                logger.error("⚠️ AI returned insufficient report content")
                return "Failed to generate report: AI response was empty or too short."

            report_content = re.sub(r'^```markdown\s*', '', report_content, flags=re.MULTILINE)
            report_content = re.sub(r'\s*```$', '', report_content, flags=re.MULTILINE)

        except Exception as e:
            logger.exception(f"💥 Failed to generate AI report: {e}")
            return f"Failed to generate report: {str(e)}"

        domain = re.sub(r'https?://(www\.)?', '', target_url).split('/')[0].replace('.', '_')
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"QA_REPORT_{domain}_{timestamp}.md"

        try:
            with open(filename, "w", encoding="utf-8") as f:
                f.write(report_content)
            
            logger.info(f"✅ Report generated: {filename} ({len(report_content)} chars)")
            return filename

        except Exception as e:
            logger.exception(f"💥 Failed to write report file: {e}")
            return f"Failed to write report: {str(e)}"


async def generate_qa_report(
    crawl_data: List[Dict],
    total_time_seconds: float = 0.0,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    encrypted_key: Optional[str] = None
) -> str:
    """Convenience wrapper for QA_Reporter.generate_report."""
    return await QA_Reporter.generate_report(
        crawl_data,
        total_time_seconds,
        provider,
        model,
        encrypted_key
    )
