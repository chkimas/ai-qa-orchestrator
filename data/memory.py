import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# Define path relative to project root
DB_PATH = Path("data/db/orchestrator.db")

class TestMemory:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Idempotent database initialization."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Table: Test Runs (Tracks a full execution session)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_runs (
                run_id TEXT PRIMARY KEY,
                intent TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Table: Context Variables (Shared memory between roles)
        # Example: run_id='run_1', key='order_id', value='ORD-555'
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS context_vars (
                run_id TEXT,
                key TEXT,
                value TEXT,
                role_source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (run_id, key)
            )
        """)

        # Table: Logs (Detailed execution logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                step_id INTEGER,
                role TEXT,
                action TEXT,
                status TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    def create_run(self, run_id: str, intent: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO test_runs (run_id, intent, status) VALUES (?, ?, ?)",
                (run_id, intent, "PENDING")
            )

    def save_context(self, run_id: str, key: str, value: Any, role: str):
        """Saves a variable (like an Order ID) for later use."""
        # Convert non-string values to JSON string for storage
        if not isinstance(value, str):
            value = json.dumps(value)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO context_vars (run_id, key, value, role_source) VALUES (?, ?, ?, ?)",
                (run_id, key, value, role)
            )

    def get_context(self, run_id: str, key: str) -> Optional[str]:
        """Retrieves a variable."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT value FROM context_vars WHERE run_id = ? AND key = ?",
                (run_id, key)
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def log_step(self, run_id: str, step_id: int, role: str, action: str, status: str, details: str = ""):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO logs (run_id, step_id, role, action, status, details)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (run_id, step_id, role, action, status, details)
            )
