import asyncio
import time
import logging
from typing import Dict, Any

from ai.planner import generate_test_plan
from ai.crawler import AutonomousCrawler
from ai.reporter import QA_Reporter
from automation.core.runner import AutomationRunner
from data.supabase_client import db_bridge
from ai.prompts import CHAOS_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT

logger = logging.getLogger("orchestrator.main")

async def run_sniper_mode(payload_data: Dict[str, Any]):
    """
    Sniper/Chaos/Replay Mode: Executes human intent or replay paths.
    """
    instructions = payload_data.get("instructions", "")
    target_url = payload_data.get("context", {}).get("baseUrl")
    run_id = payload_data.get("run_id")
    provider = payload_data.get("provider")
    target_model = payload_data.get("model")
    mode = payload_data.get("mode", "sniper")
    api_key = payload_data.get("api_key")

    if not run_id:
        logger.error("❌ No run_id provided. Aborting.")
        return

    # Initialize Run in Supabase
    is_chaos = (mode == "chaos")
    if not db_bridge.start_run(run_id=run_id, mode=mode):
        logger.error(f"❌ Failed to initialize run {run_id} in Supabase.")
        return

    runner = None
    try:
        # Strategic Planning: Select prompt based on Chaos status
        system_prompt = CHAOS_SYSTEM_PROMPT if is_chaos else PLANNER_SYSTEM_PROMPT

        logger.info(f"🧠 Generating plan using {target_model} (Mode: {mode})")

        plan = await generate_test_plan(
            raw_input=instructions,
            system_prompt_override=system_prompt,
            provider=provider,
            model=target_model,
            encrypted_key=api_key,
        )

        if not plan or not plan.steps:
            db_bridge.update_run_status(run_id, "FAILED")
            db_bridge.log_step(run_id, 0, "system", "planner", "FAILED", "AI failed to generate a valid plan.")
            return

        # Execution: Pass the specific model to the runner for self-healing logic
        runner = AutomationRunner(
            run_id=run_id,
            provider=provider,
            model=target_model,
            api_key=api_key,
            base_url=target_url
        )

        await runner.execute_plan(plan)

        # 4. Finalize
        db_bridge.update_run_status(run_id, "COMPLETED")

    except Exception as e:
        logger.error(f"💥 Sniper Mode Crash: {e}")
        db_bridge.update_run_status(run_id, "FAILED")
        db_bridge.log_step(run_id, 999, "system", "crash", "ERROR", f"Critical Failure: {str(e)}")
    finally:
        if runner:
            await runner.stop_browser()

async def run_scout_mode(payload_data: Dict[str, Any]):
    """
    Scout Mode: Autonomous Discovery.
    """
    start_url = payload_data.get("url") or payload_data.get("context", {}).get("baseUrl")
    run_id = payload_data.get("run_id")
    provider = payload_data.get("provider")
    target_model = payload_data.get("model")
    api_key = payload_data.get("api_key")
    credentials = payload_data.get("credentials")

    db_bridge.start_run(run_id=run_id, mode="scout")
    start_time = time.time()

    # Runner for Scout doesn't necessarily need the planner, but needs the browser
    runner = AutomationRunner(
        run_id=run_id,
        provider=provider,
        model=target_model,
        api_key=api_key
    )

    try:
        await runner.start_browser(headless=True)

        crawler = AutonomousCrawler(
            start_url=start_url,
            run_id=run_id,
            credentials=credentials
        )
        # Scout logic now has access to the chosen Neural Engine
        crawl_results = await crawler.run(runner.page)

        # Generate Executive Audit
        duration = time.time() - start_time
        report_path = await QA_Reporter.generate_report(crawl_results, duration)

        db_bridge.log_step(
            run_id, 0, "system", "scout", "COMPLETED",
            f"Crawl finished. Report generated at: {report_path}"
        )
        db_bridge.update_run_status(run_id, "COMPLETED")

    except Exception as e:
        db_bridge.update_run_status(run_id, "FAILED")
        logger.error(f"💥 Scout Mode Failed: {e}")
    finally:
        await runner.stop_browser()
