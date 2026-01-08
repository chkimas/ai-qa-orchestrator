import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from configs.settings import settings


logger = logging.getLogger("orchestrator.supabase")


class SupabaseBridge:
    def __init__(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        
        if not url or not key:
            logger.warning("Supabase credentials missing. Database operations will be skipped.")
            self.client: Optional[Client] = None
        else:
            self.client = create_client(url, key)

    def log_step(
        self,
        run_id: str,
        step_id: int = 0,
        role: str = "customer",
        action: str = "info",
        status: str = "INFO",
        message: str = "",
        **kwargs
    ) -> bool:
        """
        Write execution telemetry to Supabase for real-time monitoring.

        Args:
            run_id: UUID of the test run
            step_id: Sequential step number
            role: Actor performing the action (customer/admin/system)
            action: Type of action (click/input/navigate/etc)
            status: Execution status (INFO/PASSED/FAILED/RUNNING)
            message: Human-readable description
            **kwargs: Additional fields (url, details, selector, value)

        Returns:
            bool: True if log written successfully, False otherwise
        """
        if not self.client:
            return False

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
            "value": kwargs.get("value"),
        }

        try:
            self.client.table("execution_logs").insert(payload).execute()
            return True
        except Exception as e:
            logger.error(f"[Telemetry] Failed to log step {step_id} for run {run_id}: {e}")
            return False

    def save_fingerprint(
        self, user_id: str, url: str, selector: str, dna: Dict[str, Any]
    ) -> bool:
        """
        Store UI element fingerprint for self-healing reference library.

        Args:
            user_id: Clerk user ID
            url: Page URL where element was found
            selector: CSS/XPath selector
            dna: Element metadata (tag, text, attributes)

        Returns:
            bool: True if fingerprint saved successfully
        """
        if not self.client:
            return False

        payload = {
            "user_id": user_id,
            "url": url,
            "selector": selector,
            "tag_name": dna.get("tag"),
            "inner_text": dna.get("text"),
            "attributes": dna.get("attributes", {}),
        }

        try:
            self.client.table("element_fingerprints").upsert(
                payload, on_conflict="url,selector"
            ).execute()
            return True
        except Exception as e:
            logger.error(f"[Fingerprint] Storage failed for {url} > {selector}: {e}")
            return False

    def start_run(self, run_id: str, mode: str) -> bool:
        """
        Mark test run as active in database.

        Args:
            run_id: UUID of the test run
            mode: Execution mode (sniper/scout/chaos/replay)

        Returns:
            bool: True if status updated successfully
        """
        if not self.client:
            return False

        try:
            self.client.table("test_runs").update(
                {"status": "RUNNING", "mode": mode}
            ).eq("id", run_id).execute()
            return True
        except Exception as e:
            logger.error(f"[RunStart] Failed to start run {run_id}: {e}")
            return False

    def update_run_status(self, run_id: str, status: str) -> bool:
        """
        Update test run final status.

        Args:
            run_id: UUID of the test run
            status: Final status (COMPLETED/FAILED/HEALED)

        Returns:
            bool: True if status updated successfully
        """
        if not self.client:
            return False

        valid_statuses = ["QUEUED", "PENDING", "RUNNING", "COMPLETED", "FAILED", "HEALED"]
        status_upper = status.upper() if status.upper() in valid_statuses else "FAILED"

        try:
            self.client.table("test_runs").update({"status": status_upper}).eq(
                "id", run_id
            ).execute()
            return True
        except Exception as e:
            logger.error(f"[RunStatus] Failed to update run {run_id} to {status_upper}: {e}")
            return False


# Global singleton instance
db_bridge = SupabaseBridge()
