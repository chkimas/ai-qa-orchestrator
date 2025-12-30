import json
from pathlib import Path
from ai.models import TestPlan, TestStep, ActionType, Role

class BehavioralIngestor:
    def __init__(self):
        pass

    def logs_to_intent(self, log_entries: list) -> str:
        """
        Converts raw URL paths into a structured intent string for the Planner.
        Example Input: ["/home", "/product/123", "/cart", "/checkout"]
        """
        steps = "\n".join([f"- Visit {url}" for url in log_entries])
        return f"REPLAY ACTUAL USER SESSION:\n{steps}\n\nTask: Verify this critical user path for regressions."

    def sitemap_to_priorities(self, sitemap_urls: list) -> str:
        """Prioritizes the first 10 pages of a sitemap for a deep-scan Sniper run."""
        steps = "\n".join([f"- Audit {url}" for url in sitemap_urls[:10]])
        return f"CRITICAL SITEMAP AUDIT:\n{steps}"
