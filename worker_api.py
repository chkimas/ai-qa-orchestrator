from fastapi import FastAPI, BackgroundTasks, Request, HTTPException
import base64
import json
import uvicorn
import logging
from main import run_sniper_mode, run_scout_mode
from data.supabase_client import db_bridge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("argus-worker")

app = FastAPI(title="Argus Neural Worker", version="1.2.0")

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "argus-orchestrator",
        "workload": "idle"
    }

@app.post("/")
@app.post("/mission")
async def trigger_test(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
        payload_str = body.get("data", [""])[0]

        if not payload_str:
            logger.error("Empty payload received.")
            return {"status": "error", "message": "Empty payload"}

        try:
            decoded_bytes = base64.b64decode(payload_str)
            decoded = json.loads(decoded_bytes.decode('utf-8'))
        except Exception as decode_err:
            logger.error(f"Failed to decode mission payload: {decode_err}")
            return {"status": "error", "message": "Malformed mission payload"}

        mode = decoded.get("mode", "sniper")
        run_id = decoded.get("run_id")
        user_id = decoded.get("user_id") # Extracted for RLS propagation
        target_url = decoded.get("url")
        intent = decoded.get("intent", "Neural Execution")
        target_model = decoded.get("model", "llama-3.1-70b-versatile")

        if not run_id or not user_id:
            raise HTTPException(status_code=400, detail="Missing run_id or user_id")

        # Initialize the database record with user_id to prevent 404 in dashboard
        db_bridge.init_run(
            run_id=run_id,
            user_id=user_id,
            url=target_url,
            mode=mode.lower(),
            intent=intent
        )

        logger.info(f"🚀 MISSION_RECEIVED: {run_id}")
        logger.info(f"📡 NEURAL_MODE: {mode.upper()}")
        logger.info(f"🧠 TARGET_MODEL: {target_model}")

        if mode == "scout":
            background_tasks.add_task(run_scout_mode, decoded)
        else:
            background_tasks.add_task(run_sniper_mode, decoded)

        return {
            "status": "queued",
            "run_id": run_id,
            "mode": mode,
            "engine": target_model,
            "message": f"Watchman deployed in {mode} mode using {target_model}."
        }

    except Exception as e:
        logger.error(f"❌ CRITICAL_SYSTEM_ERROR: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
