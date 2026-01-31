import asyncio
import time
import logging
from typing import Dict, Any

from ai.planner import generate_test_plan
from ai.reporter import QA_Reporter
from ai.crawler import AutonomousCrawler
from automation.core.runner import AutomationRunner
from data.supabase_client import db_bridge
from ai.prompts import CHAOS_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT

logger = logging.getLogger("orchestrator.main")

async def run_sniper_mode(payload_data: Dict[str, Any]):
    user_id = payload_data.get("user_id")
    instructions = payload_data.get("instructions", "")
    target_url = payload_data.get("context", {}).get("baseUrl")
    run_id = payload_data.get("run_id")
    provider = payload_data.get("provider", "groq")
    target_model = payload_data.get("model")
    mode = payload_data.get("mode", "sniper")
    api_key = payload_data.get("api_key")

    if not run_id:
        logger.error("❌ No run_id provided. Aborting.")
        return

    is_chaos = (mode == "chaos")
    if not db_bridge.start_run(run_id=run_id, mode=mode):
        return

    runner = None
    try:
        db_bridge.log_step(
            run_id, 0, "system", "planner", "RUNNING",
            f"🧠 Initializing {target_model} via {provider}..."
        )

        system_prompt = CHAOS_SYSTEM_PROMPT if is_chaos else PLANNER_SYSTEM_PROMPT

        plan = await generate_test_plan(
            raw_input=instructions,
            system_prompt_override=system_prompt,
            provider=provider,
            model=target_model,
            encrypted_key=api_key,
        )

        if not plan or not plan.steps:
            error_msg = f"UPLINK_FAILURE: {provider} returned an empty plan."
            db_bridge.log_step(run_id, 0, "system", "planner", "FAILED", error_msg)
            db_bridge.update_run_status(run_id, "FAILED")
            return

        runner = AutomationRunner(
            run_id=run_id,
            user_id=user_id,
            provider=provider,
            model=target_model,
            api_key=api_key,
            base_url=target_url
        )

        await runner.execute_plan(plan)

    except Exception as e:
        logger.error(f"💥 Sniper Mode Crash: {e}")
        db_bridge.log_step(run_id, 999, "system", "crash", "FAILED", f"CRITICAL_FAILURE: {str(e)}")
        db_bridge.update_run_status(run_id, "FAILED")
    finally:
        if runner:
            await runner.stop_browser()

async def run_scout_mode(payload_data: Dict[str, Any]):
    user_id = payload_data.get("user_id")
    start_url = payload_data.get("url") or payload_data.get("context", {}).get("baseUrl")
    run_id = payload_data.get("run_id")
    provider = payload_data.get("provider")
    target_model = payload_data.get("model")
    api_key = payload_data.get("api_key")
    credentials = payload_data.get("credentials")

    if not api_key:
        db_bridge.log_step(run_id, 0, "system", "scout", "FAILED", "ABORTED: API Key is missing.")
        db_bridge.update_run_status(run_id, "FAILED")
        return

    db_bridge.start_run(run_id=run_id, mode="scout")
    start_time = time.time()

    runner = None
    try:
        runner = AutomationRunner(
            run_id=run_id,
            user_id=user_id,
            provider=provider,
            model=target_model,
            api_key=api_key
        )

        db_bridge.log_step(run_id, 0, "system", "scout", "RUNNING", f"🚀 Launching Scout via {target_model}...")
        await runner.start_browser(headless=True)

        crawler = AutonomousCrawler(
            start_url=start_url,
            run_id=run_id,
            user_id=user_id,
            credentials=credentials,
            api_key=api_key,
            provider=provider,
            model=target_model
        )

        crawl_results = await crawler.run(runner.page)
        duration = time.time() - start_time

        report_path = await QA_Reporter.generate_report(
            crawl_data=crawl_results,
            total_time_seconds=duration,
            provider=provider,
            model=target_model,
            encrypted_key=api_key,
            run_id=run_id
        )

        if report_path.startswith("http"):
            db_bridge.client.table("test_runs").update({
                "report_url": report_path
            }).eq("id", run_id).execute()

        db_bridge.log_step(
            run_id, 999, "system", "scout", "COMPLETED",
            "Mission finalized. Executive Audit is now ready for review."
        )
        db_bridge.update_run_status(run_id, "COMPLETED")

    except Exception as e:
        db_bridge.log_step(run_id, 999, "system", "scout", "FAILED", f"SCOUT_HALTED: {str(e)}")
        db_bridge.update_run_status(run_id, "FAILED")
        logger.error(f"💥 Scout Mode Failed: {e}")
    finally:
        if runner:
            await runner.stop_browser()
