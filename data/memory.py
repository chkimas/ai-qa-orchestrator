import sqlite3
from pathlib import Path
from configs.settings import settings

DB_PATH = Path(settings.DB_PATH)

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")

        # 1. Runs Summary
        conn.execute("""
        CREATE TABLE IF NOT EXISTS test_runs (
            run_id TEXT PRIMARY KEY,
            intent TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        # 2. Detailed Logs (Unified for Sniper & Scout)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT,
            url TEXT,
            step_id INTEGER,
            role TEXT,
            action TEXT,
            status TEXT, -- PASSED, FAILED, HEALED
            details TEXT,
            selector TEXT,
            value TEXT,
            complexity_score INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        conn.commit()

def save_run_log(run_id, step_id, role, action, status, details, selector="", value="", url="", complexity=0):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
        INSERT INTO logs (run_id, step_id, role, action, status, details, selector, value, url, complexity_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (run_id, step_id, role, action, status, details, selector, value, url, complexity))
        conn.commit()
