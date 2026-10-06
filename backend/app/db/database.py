"""
Lightweight synchronous SQLite access layer (no ORM).

Kept deliberately simple and dependency-free beyond the stdlib so the
project has as few moving parts as possible to install and run.
"""
from __future__ import annotations

import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

from app.core.config import get_settings

_settings = get_settings()
_local = threading.local()

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT 'New chat',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at);
"""


def _get_connection() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(_settings.sqlite_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        _local.conn = conn
    return conn


def init_db() -> None:
    conn = _get_connection()
    conn.executescript(SCHEMA)
    conn.commit()


@contextmanager
def get_cursor() -> Iterator[sqlite3.Cursor]:
    conn = _get_connection()
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

def create_conversation(title: str = "New chat") -> dict:
    conv_id = str(uuid.uuid4())
    ts = _now()
    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (conv_id, title, ts, ts),
        )
    return {"id": conv_id, "title": title, "created_at": ts, "updated_at": ts}


def list_conversations() -> list[dict]:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM conversations ORDER BY updated_at DESC")
        return [dict(row) for row in cur.fetchall()]


def get_conversation(conversation_id: str) -> Optional[dict]:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def rename_conversation(conversation_id: str, title: str) -> None:
    with get_cursor() as cur:
        cur.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title, _now(), conversation_id),
        )


def touch_conversation(conversation_id: str) -> None:
    with get_cursor() as cur:
        cur.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (_now(), conversation_id),
        )


def delete_conversation(conversation_id: str) -> None:
    with get_cursor() as cur:
        cur.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def add_message(conversation_id: str, role: str, content: str) -> dict:
    msg_id = str(uuid.uuid4())
    ts = _now()
    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (msg_id, conversation_id, role, content, ts),
        )
    touch_conversation(conversation_id)
    return {"id": msg_id, "conversation_id": conversation_id, "role": role,
            "content": content, "created_at": ts}


def list_messages(conversation_id: str) -> list[dict]:
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        return [dict(row) for row in cur.fetchall()]


def search_conversations(query: str) -> list[dict]:
    """Search conversation titles and message contents, return matching conversations."""
    like = f"%{query}%"
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT c.* FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.title LIKE ? OR m.content LIKE ?
            ORDER BY c.updated_at DESC
            """,
            (like, like),
        )
        return [dict(row) for row in cur.fetchall()]
