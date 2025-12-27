import sqlite3
from pathlib import Path
from datetime import datetime
from configs.settings import settings

class TestMemory:
    def __init__(self):
        self.db_path = Path(settings.DB_PATH)
        # 1. Ensure the folder exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        # 2. Automatically create tables if they are missing
        self._init_db()

    def _init_db(self):
        """Creates the database tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            # Enable Write-Ahead Logging for better concurrency handling
            conn.execute("PRAGMA journal_mode=WAL;")

            # 1. Runs Table
            conn.execute("""
            CREATE TABLE IF NOT EXISTS test_runs (
                run_id TEXT PRIMARY KEY,
                intent TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 2. Logs Table (With technical columns)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                step_id INTEGER,
                role TEXT,
                action TEXT,
                status TEXT,
                details TEXT,
                selector TEXT,
                value TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(run_id) REFERENCES test_runs(run_id)
            )
            """)

            # 3. Saved Tests Table (For Registry)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                intent TEXT NOT NULL,
                steps_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            conn.commit()

    def create_run(self, run_id: str, intent: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO test_runs (run_id, intent, status) VALUES (?, ?, ?)",
                (run_id, intent, "RUNNING")
            )
            conn.commit()

    def log_step(self, run_id: str, step_id: int, role: str, action: str, status: str, details: str, selector: str = "", value: str = ""):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
            INSERT INTO logs (run_id, step_id, role, action, status, details, selector, value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (run_id, step_id, role, action, status, details, selector, value))
            conn.commit()

    def update_run_status(self, run_id: str, status: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE test_runs SET status = ? WHERE run_id = ?",
                (status, run_id)
            )
            conn.commit()
