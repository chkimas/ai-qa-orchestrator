import sqlite3
import webbrowser
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from configs.settings import settings

class ReportGenerator:
    def __init__(self):
        self.db_path = settings.DB_PATH
        self.template_dir = Path("reports/templates")
        self.output_dir = Path("reports/output")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, run_id: str):
        """Generates an HTML report for a specific run."""

        # 1. Fetch Data
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Get Run Details
            run = conn.execute(
                "SELECT * FROM test_runs WHERE run_id = ?", (run_id,)
            ).fetchone()

            # Get Logs
            logs = conn.execute(
                "SELECT * FROM logs WHERE run_id = ? ORDER BY step_id ASC", (run_id,)
            ).fetchall()

        if not run:
            print(f"❌ Report Error: Run ID {run_id} not found.")
            return

        # 2. Render Template
        env = Environment(loader=FileSystemLoader(self.template_dir))
        template = env.get_template("report.html")

        html_content = template.render(
            run=dict(run),
            logs=[dict(log) for log in logs]
        )

        # 3. Save File
        output_file = self.output_dir / f"report_{run_id}.html"
        output_file.write_text(html_content, encoding="utf-8")

        print(f"\n📊 Report Generated: {output_file.absolute()}")

        # 4. Open automatically (optional)
        webbrowser.open(f"file://{output_file.absolute()}")
