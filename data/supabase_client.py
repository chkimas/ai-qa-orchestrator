import os
import logging
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("orchestrator.supabase")

class SupabaseBridge:
    """
    Platinum-Grade Bridge for Supabase.
    Handles cloud-based test registration and live log streaming.
    """

    def __init__(self):
        url: str = os.getenv("SUPABASE_URL", "")
        key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        if not url or not key:
            logger.error("❌ SUPABASE_URL or SERVICE_ROLE_KEY missing from .env")
            self.client = None
        else:
            try:
                self.client: Client = create_client(url, key)
            except Exception as e:
                logger.error(f"❌ Failed to connect to Supabase: {e}")
                self.client = None

    def start_run(self, user_id: str, url: str, intent: str, mode: str = "sniper") -> str:
        """Initializes a test run and returns the UUID."""
        if not self.client: return ""
        try:
            # We use the 'test_runs' table we created in the migration
            response = self.client.table("test_runs").insert({
                "user_id": user_id,
                "url": url,
                "intent": intent,
                "mode": mode,
                "status": "RUNNING"
            }).execute()
            return response.data[0]['id']
        except Exception as e:
            logger.error(f"Failed to create test run record: {e}")
            return ""

    def log_step(self, run_id: str, step_id: int, role: str, action: str, status: str, description: str, details: str = "", selector: str = "", value: str = ""):
        """
        Sends a log entry to Supabase.
        Matches the strict typing required by Next.js LiveLogViewer.
        """
        if not self.client: return
        try:
            self.client.table("execution_logs").insert({
                "run_id": run_id,
                "step_id": step_id,
                "role": role,
                "action": action,
                "status": status,
                "description": description,
                "details": details,
                "selector": selector,
                "value": value,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to stream log to cloud: {e}")

    def update_run_status(self, run_id: str, status: str):
        """Finalizes the run status (COMPLETED or FAILED)."""
        if not self.client: return
        try:
            self.client.table("test_runs").update({"status": status}).eq("id", run_id).execute()
        except Exception as e:
            logger.error(f"Failed to update run status: {e}")

# Global singleton instance for the app
db_bridge = SupabaseBridge()
