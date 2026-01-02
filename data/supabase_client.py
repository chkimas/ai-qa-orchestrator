import logging
from typing import List, Dict, Any
from supabase import create_client, Client
from configs.settings import settings

logger = logging.getLogger("orchestrator.supabase")

class SupabaseBridge:
    def __init__(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.client: Client = create_client(url, key) if url and key else None

    def log_step(self, run_id: str, step_id: int = 0, role: str = "customer",
                 action: str = "info", status: str = "INFO", message: str = "", **kwargs):
        """
        Telemetry Hub: Writes real-time logs to Supabase.
        """
        if not self.client: return

        payload = {
            "run_id": run_id,
            "step_id": step_id,
            "role": role,
            "action": action,
            "status": status,
            "message": message,
            "url": kwargs.get("url"),
            "details": kwargs.get("details", ""),
            "selector": kwargs.get("selector"),
            "value": kwargs.get("value")
        }
        try:
            self.client.table("execution_logs").insert(payload).execute()
        except Exception as e:
            logger.error(f"Telemetry Failed: {e}")

    def save_fingerprint(self, user_id: str, url: str, selector: str, dna: Dict[str, Any]):
        """
        Aligned with public.element_fingerprints schema.
        Used by the Crawler to build the 'Reference Library'.
        """
        if not self.client: return
        payload = {
            "user_id": user_id,
            "url": url,
            "selector": selector,
            "tag_name": dna.get("tag"),
            "inner_text": dna.get("text"),
            "attributes": dna.get("attributes", {})
        }
        try:
            self.client.table("element_fingerprints").upsert(payload, on_conflict="url,selector").execute()
        except Exception as e:
            logger.error(f"Fingerprint storage failed: {e}")

    def start_run(self, run_id: str, mode: str):
        """NEW: Signal to Supabase that the mission is now active."""
        if not self.client: return False
        try:
            self.client.table("test_runs").update({
                "status": "RUNNING",
                "mode": mode
            }).eq("id", run_id).execute()
            return True
        except Exception: return False

    def update_run_status(self, run_id: str, status: str):
        """Aligned with public.test_runs status enum."""
        if not self.client: return
        valid_statuses = ["QUEUED", "PENDING", "RUNNING", "COMPLETED", "FAILED", "HEALED"]
        status_upper = status.upper() if status.upper() in valid_statuses else "FAILED"

        try:
            self.client.table("test_runs").update({"status": status_upper}).eq("id", run_id).execute()
        except Exception as e:
            logger.error(f"Run status update failed: {e}")

db_bridge = SupabaseBridge()
