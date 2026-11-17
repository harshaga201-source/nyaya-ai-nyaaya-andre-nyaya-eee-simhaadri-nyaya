import sqlite3
import json
import threading
from pathlib import Path
from contextlib import contextmanager
from typing import Generator
from backend.config import DB_PATH, LAWYERS_SEED_PATH

_thread_local = threading.local()

def get_db_connection() -> sqlite3.Connection:
    if not hasattr(_thread_local, "conn") or _thread_local.conn is None:
        conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
        except Exception:
            pass
        _thread_local.conn = conn
    return _thread_local.conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Legal chunks for RAG
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS legal_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_name TEXT NOT NULL,
                act_name TEXT NOT NULL,
                section_number TEXT NOT NULL,
                title TEXT,
                content TEXT NOT NULL,
                embedding TEXT NOT NULL, -- JSON array of floats
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. Query cache (exact and semantic)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS query_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE NOT NULL, -- normalized (q + lang)
                question TEXT NOT NULL,
                language TEXT NOT NULL,
                answer TEXT NOT NULL,
                citations TEXT NOT NULL, -- JSON array of strings
                is_general_knowledge INTEGER DEFAULT 1,
                embedding TEXT, -- JSON array of floats for semantic cache
                hit_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Lawyers directory
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lawyers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                area TEXT DEFAULT '',
                pincode TEXT DEFAULT '',
                address TEXT DEFAULT '',
                court TEXT DEFAULT '',
                languages TEXT NOT NULL, -- JSON array
                practice_area TEXT NOT NULL,
                years_experience INTEGER NOT NULL,
                bar_council_no TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                status TEXT DEFAULT 'verified',
                is_sample INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Existing databases predate the locality fields: add them in place.
        existing_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(lawyers)").fetchall()}
        for column, ddl in (
            ("area", "TEXT DEFAULT ''"),
            ("pincode", "TEXT DEFAULT ''"),
            ("address", "TEXT DEFAULT ''"),
            ("court", "TEXT DEFAULT ''"),
        ):
            if column not in existing_columns:
                cursor.execute(f"ALTER TABLE lawyers ADD COLUMN {column} {ddl}")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lawyers_status ON lawyers(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lawyers_city ON lawyers(city)")
        
        # 4. Lawyer consultation requests
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lawyer_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lawyer_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_phone TEXT NOT NULL,
                user_email TEXT,
                issue_summary TEXT NOT NULL,
                consent_given INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 5. User Feedback
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rating INTEGER NOT NULL,
                category TEXT NOT NULL,
                comment TEXT,
                message_id TEXT,
                is_flagged INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 6. Chat logs and response telemetry
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                language TEXT NOT NULL,
                cached INTEGER DEFAULT 0,
                response_time_ms REAL DEFAULT 0,
                user_feedback TEXT, -- 'thumbs_up' or 'thumbs_down'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Demo profiles are owned by the seed file. Refresh them on every boot so
        # existing installations receive the expanded/corrected directory, while
        # leaving citizen-submitted (is_sample = 0) profiles untouched.
        if LAWYERS_SEED_PATH.exists():
            with open(LAWYERS_SEED_PATH, "r", encoding="utf-8") as f:
                lawyers = json.load(f)
            cursor.execute("DELETE FROM lawyers WHERE is_sample = 1")
            for l in lawyers:
                cursor.execute("""
                    INSERT OR REPLACE INTO lawyers (
                        id, name, city, state, area, pincode, address, court,
                        languages, practice_area, years_experience, bar_council_no,
                        phone, email, status, is_sample
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """, (
                    l["id"], l["name"], l["city"], l["state"],
                    l.get("area", ""), l.get("pincode", ""),
                    l.get("address", ""), l.get("court", ""),
                    json.dumps(l["languages"]), l["practice_area"],
                    l["years_experience"], l["bar_council_no"],
                    l.get("phone", ""), l.get("email", ""),
                    l.get("status", "verified"),
                ))

        # Enrolment numbers must be unique across the directory. Keep this
        # best-effort so legacy databases with duplicate rows still start.
        try:
            cursor.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_lawyers_bar_unique "
                "ON lawyers(bar_council_no COLLATE NOCASE)"
            )
        except sqlite3.IntegrityError:
            pass
        conn.commit()
