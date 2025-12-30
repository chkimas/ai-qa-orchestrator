from fastapi import FastAPI, BackgroundTasks, Request
import base64
import json
import uvicorn
from main import run_sniper_mode

app = FastAPI()

@app.get("/")
async def health_check():
    return {"status": "online", "service": "vanguard-orchestrator"}

@app.post("/predict")
async def trigger_test(request: Request, background_tasks: BackgroundTasks):
    """Endpoint for Next.js Server Actions."""
    try:
        body = await request.json()
        # Gradio-style payload format
        payload_str = body.get("data", [""])[0]

        if not payload_str:
            return {"status": "error", "message": "Empty payload"}

        decoded = json.loads(base64.b64decode(payload_str).decode('utf-8'))

        # Determine mode
        is_chaos = decoded.get("mode") == "chaos"

        # Offload to background so API returns 200 immediately
        background_tasks.add_task(run_sniper_mode, decoded, is_chaos)

        return {
            "status": "queued",
            "run_id": decoded.get("run_id"),
            "message": "Mission dispatched to background worker"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
