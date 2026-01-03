from fastapi import FastAPI, BackgroundTasks, Request, HTTPException
import base64
import json
import uvicorn
import logging
from main import run_sniper_mode, run_scout_mode

# Configure Tactical Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("argus-worker")

app = FastAPI(title="Argus Neural Worker", version="1.2.0")

@app.get("/")
async def health_check():
    """System heartbeat for Vercel/Railway health monitoring."""
    return {
        "status": "online",
        "service": "argus-orchestrator",
        "workload": "idle"
    }

@app.post("/")
@app.post("/mission")
async def trigger_test(request: Request, background_tasks: BackgroundTasks):
    """
    MISSION DISPATCH ENDPOINT
    Receives encrypted base64 payload from Vercel/Next.js and
    routes it to the appropriate AI agent.
    """
    try:
        body = await request.json()

        # Transport Layer: Extract the base64 string from the data array
        payload_str = body.get("data", [""])[0]
        if not payload_str:
            logger.error("Empty payload received.")
            return {"status": "error", "message": "Empty payload"}

        # Decoding Layer: Convert transport string back to Mission JSON
        try:
            decoded_bytes = base64.b64decode(payload_str)
            decoded = json.loads(decoded_bytes.decode('utf-8'))
        except Exception as decode_err:
            logger.error(f"Failed to decode mission payload: {decode_err}")
            return {"status": "error", "message": "Malformed mission payload"}

        # Parameter Extraction
        mode = decoded.get("mode", "sniper") # sniper, scout, chaos, or replay
        run_id = decoded.get("run_id")
        target_model = decoded.get("model", "llama-3.1-70b-versatile")

        logger.info(f"🚀 MISSION_RECEIVED: {run_id}")
        logger.info(f"📡 NEURAL_MODE: {mode.upper()}")
        logger.info(f"🧠 TARGET_MODEL: {target_model}")

        # --- LOGIC GATE: ROUTE TO AGENT MODULES ---
        if mode == "scout":
            # Deploy the All-Seeing Eye (Crawler)
            background_tasks.add_task(run_scout_mode, decoded)
        else:
            # Deploy the Sniper (Standard, Chaos, or Replay)
            # The 'mode' is passed in so 'run_sniper_mode' can swap prompts
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
