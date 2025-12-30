import sys
import asyncio
import os
import base64
import json
from dotenv import load_dotenv

# Internal Modules
from ai.planner import generate_test_plan
from automation.core.runner import AutomationRunner
from data.supabase_client import db_bridge
from ai.prompts import CHAOS_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT

load_dotenv()

async def run_sniper_mode(payload_data: dict, is_chaos: bool = False):
    """Core logic to execute a test mission."""
    context = payload_data.get('context', {})
    instructions = payload_data.get('instructions', "")
    base_url = context.get('baseUrl', "AUTO")
    user_id = payload_data.get('user_id', "system-user")

    run_id = db_bridge.start_run(
        user_id=user_id,
        url=base_url,
        intent=instructions,
        mode="chaos" if is_chaos else "sniper"
    )

    if not run_id:
        print("❌ Failed to initialize run in Supabase.")
        return

    runner = None
    try:
        prompt_override = CHAOS_SYSTEM_PROMPT if is_chaos else PLANNER_SYSTEM_PROMPT
        plan = await generate_test_plan(str(payload_data), system_prompt_override=prompt_override)

        if not plan.steps:
            db_bridge.update_run_status(run_id, "FAILED")
            return

        runner = AutomationRunner(run_id=run_id)
        await runner.execute_plan(plan)
        db_bridge.update_run_status(run_id, "COMPLETED")

    except Exception as e:
        db_bridge.update_run_status(run_id, "FAILED")
        print(f"❌ Run Failed: {e}")
    finally:
        if runner:
            await runner.stop_browser()
