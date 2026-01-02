import asyncio
import logging
from typing import List, Dict
from data.supabase_client import db_bridge

logger = logging.getLogger("orchestrator.analyzer")

class RiskAnalyzer:
    def __init__(self):
        """
        Analyzer initialized. Data is pulled dynamically from
        Supabase to ensure cross-team intelligence.
        """
        pass

    async def generate_heatmap(self) -> List[Dict]:
        """
        Industry-standard Predictive Stability Scoring.
        Algorithm: Score = ((FailureRate * 0.7) + (HealRate * 0.3)) * ComplexityModifier
        """
        try:
            # Fetch historical telemetry from public.execution_logs
            logs = await db_bridge.fetch_all_logs(limit=5000)

            if not logs:
                logger.info("📡 No telemetry found in Supabase. Heatmap is empty.")
                return []

            stats = {}

            # Process logs into URL-based statistics
            for entry in logs:
                # In your schema, URL is often passed via kwargs/details
                # or is present in the telemetry payload.
                url = entry.get("url") or "Global/System"

                if url not in stats:
                    stats[url] = {
                        "total": 0,
                        "fails": 0,
                        "heals": 0,
                        "complexity_sum": 0
                    }

                stats[url]["total"] += 1

                # Check status based on public.execution_logs status column
                if entry.get("status") == "FAILED":
                    stats[url]["fails"] += 1

                # Healing is identified by the 'action' column
                if entry.get("action") == "healing":
                    stats[url]["heals"] += 1

                # Use details to find complexity or default to 5
                stats[url]["complexity_sum"] += entry.get("complexity_score", 5)

            heatmap = []

            # Calculate Risk Scores
            for url, data in stats.items():
                total = data["total"]
                fail_rate = data["fails"] / total
                heal_rate = data["heals"] / total
                avg_complexity = data["complexity_sum"] / total

                # Weighted Logic: Failures are more critical than heals
                # Heals indicate 'Brittle' code, Failures indicate 'Broken' code
                base_risk = (fail_rate * 70) + (heal_rate * 30)

                # Apply complexity modifier (Scale of 1.0 to 2.0)
                risk_score = min(round(base_risk * (1 + avg_complexity / 10), 1), 100.0)

                # Determine Executive Status & Actionable Recommendation
                if risk_score > 65:
                    status = "CRITICAL"
                    recommendation = "🛑 Immediate Fix: Review Business Logic & Selector Stability"
                elif risk_score > 25:
                    status = "BRITTLE"
                    recommendation = "⚠️ Optimization Required: UI Selectors are frequently healing"
                else:
                    status = "STABLE"
                    recommendation = "✅ Standard Maintenance: Flow is performing as expected"

                heatmap.append({
                    "url": url,
                    "risk_score": risk_score,
                    "status": status,
                    "recommendation": recommendation,
                    "metrics": {
                        "total_interactions": total,
                        "failure_count": data["fails"],
                        "healing_events": data["heals"]
                    }
                })

            # Sort by highest risk first (Standard Executive Requirement)
            return sorted(heatmap, key=lambda x: x["risk_score"], reverse=True)

        except Exception as e:
            logger.error(f"❌ Supabase Heatmap Generation Failed: {e}")
            return []
