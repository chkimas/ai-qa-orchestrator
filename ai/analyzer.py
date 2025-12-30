import sqlite3
import os

class RiskAnalyzer:
    def __init__(self, db_path="data/db/orchestrator.db"):
        self.db_path = db_path

    def generate_heatmap(self):
        """Analyzes logs to predict which URLs are most likely to break."""
        if not os.path.exists(self.db_path): return []

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Risk = (Failures * 2 + Heals) normalized by Complexity
        query = """
            SELECT url,
                   COUNT(*) as total_actions,
                   SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failures,
                   SUM(CASE WHEN status = 'HEALED' THEN 1 ELSE 0 END) as heals,
                   AVG(complexity_score) as avg_complexity
            FROM logs
            WHERE url IS NOT NULL AND url != ''
            GROUP BY url
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()

        heatmap = []
        for url, total, fails, heals, complexity in rows:
            # Algorithm: Higher complexity + higher failure rate = Exponential Risk
            failure_rate = (fails / total) if total > 0 else 0
            heal_rate = (heals / total) if total > 0 else 0

            # Weighted Score (0-100)
            base_risk = (failure_rate * 70) + (heal_rate * 30)
            complexity_modifier = 1.2 if complexity > 10 else 1.0
            risk_score = min(round(base_risk * complexity_modifier, 1), 100.0)

            heatmap.append({
                "url": url,
                "risk_score": risk_score,
                "status": "CRITICAL" if risk_score > 60 else "BRITTLE" if risk_score > 25 else "STABLE",
                "recommendation": "Redesign Selectors" if heals > fails else "Fix Logic"
            })

        return sorted(heatmap, key=lambda x: x['risk_score'], reverse=True)
