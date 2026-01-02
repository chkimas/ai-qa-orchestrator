from fastapi import FastAPI, BackgroundTasks, Request
import base64
import json
import uvicorn
from main import run_sniper_mode, run_scout_mode

app = FastAPI()

@app.get("/")
async def health_check():
    return {"status": "online", "service": "argus-orchestrator"}

@app.post("/predict")
async def trigger_test(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
        payload_str = body.get("data", [""])[0]
        if not payload_str: return {"status": "error", "message": "Empty payload"}

        decoded = json.loads(base64.b64decode(payload_str).decode('utf-8'))
        mode = decoded.get("mode") # sniper, scout, chaos, or replay
        run_id = decoded.get("run_id")

        print(f"📦 MISSION DISPATCHED: {run_id} | MODE: {mode}")

        # --- LOGIC GATE: ROUTE TO CORRECT NEURAL MODULE ---
        if mode == "scout":
            # Direct to the All-Seeing Eye (Crawler)
            background_tasks.add_task(run_scout_mode, decoded)
        else:
            # Direct to the Sniper (Standard/Chaos/Replay)
            is_chaos = mode == "chaos"
            background_tasks.add_task(run_sniper_mode, decoded, is_chaos)

        return {
            "status": "queued",
            "run_id": run_id,
            "mode": mode,
            "message": f"Watchman deployed in {mode} mode."
        }
    except Exception as e:
        print(f"❌ API Trigger Error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
