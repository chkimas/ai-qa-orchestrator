import logging
import uuid
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from configs.settings import settings

logger = logging.getLogger("orchestrator.supabase")

class SupabaseBridge:
    def __init__(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.telemetry_cache: Dict[str, bool] = {}

        if not url or not key:
            logger.warning("Supabase credentials missing. Database operations will be skipped.")
            self.client: Optional[Client] = None
        else:
            self.client = create_client(url, key)

    def upload_screenshot(self, screenshot_bytes: bytes) -> Optional[str]:
        if not self.client: return None
        try:
            filename = f"trace_{uuid.uuid4()}.png"
            self.client.storage.from_("screenshots").upload(
                path=filename,
                file=screenshot_bytes,
                file_options={"content-type": "image/png"}
            )
            return self.client.storage.from_("screenshots").get_public_url(filename)
        except Exception as e:
            logger.error(f"Screenshot upload failed: {e}")
            return None

    def _should_log_sensitive(self, run_id: str) -> bool:
        if not self.client:
            return False

        if run_id in self.telemetry_cache:
            return self.telemetry_cache[run_id]

        try:
            run_query = self.client.table("test_runs")\
                .select("user_id")\
                .eq("id", run_id)\
                .maybe_single()\
                .execute()

            if not run_query.data:
                logger.warning(f"Run {run_id} not found - defaulting to PRIVATE")
                self.telemetry_cache[run_id] = False
                return False

            user_id = run_query.data["user_id"]
            settings_query = self.client.table("user_settings")\
                .select("telemetry_enabled")\
                .eq("user_id", user_id)\
                .maybe_single()\
                .execute()

            is_enabled = settings_query.data.get("telemetry_enabled", True) if settings_query.data else True

            self.telemetry_cache[run_id] = is_enabled
            return is_enabled

        except Exception as e:
            logger.error(f"❌ PRIVACY_CHECK_FAILED for run {run_id}: {e}")
            self.telemetry_cache[run_id] = False
            return False

    def init_run(self, run_id: str, user_id: str, url: str, mode: str, intent: str) -> bool:
        if not self.client: return False
        try:
            payload = {
                "id": run_id,
                "user_id": user_id,
                "url": url,
                "mode": mode,
                "intent": intent,
                "status": "RUNNING"
            }
            self.client.table("test_runs").upsert(payload).execute()
            return True
        except Exception as e:
            logger.error(f"[RunInit] Failed to initialize run {run_id} for user {user_id}: {e}")
            return False

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
        if not self.client:
            return False

        telemetry_enabled = self._should_log_sensitive(run_id)

        payload = {
            "run_id": run_id,
            "step_id": step_id,
            "role": role,
            "action": action,
            "status": status,
            "message": message,
            "url": kwargs.get("url"),
            "details": kwargs.get("details", ""),
        }

        if not telemetry_enabled:
            if action in ["analysis", "fingerprint"]:
                logger.info(f"🛡️ [Privacy Active] Suppressed Cloud Log: {action} at {kwargs.get('url')}")
                return True

            payload["selector"] = None
            payload["value"] = None
        else:
            payload["selector"] = kwargs.get("selector")
            payload["value"] = kwargs.get("value")

        try:
            self.client.table("execution_logs").insert(payload).execute()
            return True
        except Exception as e:
            logger.error(f"[Telemetry] Failed to log step {step_id} for run {run_id}: {e}")
            return False

    def save_fingerprint(
        self, user_id: str, url: str, selector: str, dna: Dict[str, Any]
    ) -> bool:
        if not self.client:
            return False

        try:
            sq = self.client.table("user_settings").select("telemetry_enabled").eq("user_id", user_id).maybe_single().execute()
            if sq.data and not sq.data.get("telemetry_enabled", True):
                logger.info(f"🛡️ [Privacy Active] DNA storage blocked for {url}")
                return True

            payload = {
                "user_id": user_id,
                "url": url,
                "selector": selector,
                "tag_name": dna.get("tag"),
                "inner_text": dna.get("text"),
                "attributes": dna.get("attributes", {}),
            }

            self.client.table("element_fingerprints").upsert(
                payload,
                on_conflict="user_id,url,selector"
            ).execute()
            return True
        except Exception as e:
            logger.error(f"[Fingerprint] Storage failed for {url} > {selector}: {e}")
            return False

    def start_run(self, run_id: str, mode: str) -> bool:
        if not self.client: return False
        try:
            self.client.table("test_runs").update(
                {"status": "RUNNING", "mode": mode}
            ).eq("id", run_id).execute()
            return True
        except Exception as e:
            logger.error(f"[RunStart] Failed to start run {run_id}: {e}")
            return False

    def update_run_status(self, run_id: str, status: str) -> bool:
        if not self.client: return False
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

db_bridge = SupabaseBridge()
