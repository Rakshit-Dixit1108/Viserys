"""
Smoke tests for the core API surface.

Run with:  pytest  (from the backend/ directory, with dev deps installed)

The LLM call is monkeypatched so these tests do not require Ollama, an
OpenAI key, or network access -- they only verify the FastAPI layer and
SQLite persistence behave correctly.
"""
import os
import tempfile

import pytest


@pytest.fixture()
def client(monkeypatch):
    # Point the app at a throwaway SQLite file for this test run.
    tmp_dir = tempfile.mkdtemp()
    monkeypatch.setenv("SQLITE_PATH", os.path.join(tmp_dir, "test.db"))

    from app.core.config import get_settings

    get_settings.cache_clear()

    import app.db.database as db_module

    db_module._settings = get_settings()
    db_module._local = __import__("threading").local()

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()


def test_health(client):
    resp = client.get("/api/system/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_conversation_crud(client):
    create = client.post("/api/conversations", json={"title": "Test chat"})
    assert create.status_code == 200
    conv_id = create.json()["id"]

    listed = client.get("/api/conversations")
    assert any(c["id"] == conv_id for c in listed.json())

    renamed = client.patch(f"/api/conversations/{conv_id}", json={"title": "Renamed"})
    assert renamed.json()["title"] == "Renamed"

    messages = client.get(f"/api/conversations/{conv_id}/messages")
    assert messages.status_code == 200
    assert messages.json() == []

    deleted = client.delete(f"/api/conversations/{conv_id}")
    assert deleted.status_code == 200


def test_chat_stream_with_mocked_llm(client, monkeypatch):
    async def fake_stream(_messages):
        for chunk in ["Hello", " there", "!"]:
            yield chunk

    import app.api.routes.chat as chat_module

    monkeypatch.setattr(chat_module, "stream_chat", fake_stream)

    resp = client.post("/api/chat/stream", json={"conversation_id": None, "message": "Hi"})
    assert resp.status_code == 200
    body = resp.text
    assert "event: meta" in body
    assert "event: token" in body
    assert "event: done" in body
    assert "Hello" in body
