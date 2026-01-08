import logging
from typing import List, Dict
from data.supabase_client import db_bridge


logger = logging.getLogger("orchestrator.analyzer")


class RiskAnalyzer:
    """
    Predictive stability scoring based on historical execution telemetry.
    Algorithm: Risk = (FailureRate * 70%) + (HealRate * 30%)
    """

    async def generate_heatmap(self) -> List[Dict]:
        """
        Generate risk heatmap from execution logs.

        Returns:
            List of risk items sorted by score (highest first)
        """
        if not db_bridge.client:
            logger.warning("Supabase client unavailable. Returning empty heatmap.")
            return []

        try:
            # Fetch recent execution logs with run metadata
            response = db_bridge.client.table("execution_logs").select(
                "status, action, test_runs!inner(url)"
            ).limit(5000).execute()

            logs = response.data if response.data else []

            if not logs:
                logger.info("No telemetry found in database. Heatmap is empty.")
                return []

            stats: Dict[str, Dict[str, int]] = {}

            # Aggregate stats by URL
            for entry in logs:
                url = entry.get("test_runs", {}).get("url") if entry.get("test_runs") else None
                if not url:
                    continue

                if url not in stats:
                    stats[url] = {"total": 0, "fails": 0, "heals": 0}

                stats[url]["total"] += 1

                status = entry.get("status", "").upper()
                action = entry.get("action", "").lower()

                if status == "FAILED":
                    stats[url]["fails"] += 1

                if action == "healing" or "heal" in action:
                    stats[url]["heals"] += 1

            heatmap = []

            # Calculate risk scores
            for url, data in stats.items():
                total = data["total"]
                if total == 0:
                    continue

                fail_rate = (data["fails"] / total) * 100
                heal_rate = (data["heals"] / total) * 100

                # Weighted formula: failures more critical than heals
                risk_score = min(round((fail_rate * 0.7) + (heal_rate * 0.3), 1), 100.0)

                # Determine status and recommendation
                if risk_score > 65:
                    status = "CRITICAL"
                    recommendation = "🛑 Immediate Fix: Review Business Logic & Selector Stability"
                elif risk_score > 25:
                    status = "BRITTLE"
                    recommendation = "⚠️ Optimization Required: UI Selectors frequently healing"
                else:
                    status = "STABLE"
                    recommendation = "✅ Standard Maintenance: Flow performing as expected"

                heatmap.append({
                    "url": url,
                    "risk_score": risk_score,
                    "status": status,
                    "recommendation": recommendation,
                    "metrics": {
                        "total_interactions": total,
                        "failure_count": data["fails"],
                        "healing_events": data["heals"],
                    },
                })

            # Sort by highest risk first
            return sorted(heatmap, key=lambda x: x["risk_score"], reverse=True)

        except Exception as e:
            logger.error(f"Heatmap generation failed: {e}")
            return []
