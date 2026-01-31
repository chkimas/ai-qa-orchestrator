import logging
from typing import List, Dict, Optional
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.analyzer")


class RiskAnalyzer:
    """
    Predictive stability scoring engine using historical execution telemetry.
    Provides URL-specific risk assessment and fleet-wide heatmap generation.
    """

    async def get_url_stability_report(self, url: str) -> Dict:
        """
        Fetch historical stability metrics for a specific URL.

        Returns risk score and status to guide test plan generation.
        """
        if not db_bridge.client:
            return {"status": "UNKNOWN", "score": 0}

        try:
            res = db_bridge.client.table("execution_logs")\
                .select("status")\
                .eq("url", url)\
                .execute()

            logs = res.data or []
            if not logs:
                return {"status": "NEW", "score": 0}

            total = len(logs)
            fails = sum(1 for log in logs if log["status"] == "FAILED")

            score = round((fails / total) * 100, 1)

            return {
                "score": score,
                "status": "BRITTLE" if score > 25 else "STABLE",
                "total_runs": total
            }

        except Exception as e:
            logger.error(f"Stability check failed for {url}: {e}")
            return {"status": "ERROR", "score": 0}

    async def generate_heatmap(self) -> List[Dict]:
        """
        Generate fleet-wide risk heatmap from recent execution history.

        Returns sorted list of URLs by risk score (highest first).
        """
        if not db_bridge.client:
            return []

        try:
            response = db_bridge.client.table("execution_logs")\
                .select("status, url")\
                .order("created_at", desc=True)\
                .limit(2000)\
                .execute()

            logs = response.data or []
            if not logs:
                return []

            # Aggregate stats by URL
            stats = {}
            for entry in logs:
                url = entry.get("url")
                if not url:
                    continue

                if url not in stats:
                    stats[url] = {"total": 0, "fails": 0}

                stats[url]["total"] += 1
                if entry["status"] == "FAILED":
                    stats[url]["fails"] += 1

            # Calculate risk scores
            heatmap = []
            for url, data in stats.items():
                fail_rate = (data["fails"] / data["total"]) * 100
                risk_score = round(min(fail_rate, 100.0), 1)

                heatmap.append({
                    "url": url,
                    "riskscore": risk_score,
                    "status": self._get_status(risk_score),
                    "recommendation": self._get_recommendation(risk_score),
                    "metrics": {
                        "total_runs": data["total"],
                        "failures": data["fails"],
                        "success_rate": round(100 - fail_rate, 1)
                    }
                })

            return sorted(heatmap, key=lambda x: x["riskscore"], reverse=True)

        except Exception as e:
            logger.error(f"Heatmap generation failed: {e}")
            return []

    def _get_status(self, score: float) -> str:
        """Classify risk level based on score."""
        if score > 60:
            return "CRITICAL"
        if score > 25:
            return "BRITTLE"
        return "STABLE"

    def _get_recommendation(self, score: float) -> str:
        """Generate actionable recommendation based on risk score."""
        if score > 60:
            return "🛑 Immediate selector audit required"
        if score > 25:
            return "⚠️ Optimize selectors for resilience"
        return "✅ Performance stable"
