"""
Tests for the Phase 2 RAG endpoints. Embeddings and LLM calls are mocked
so these don't require Ollama running -- but they do exercise a real
(temporary, on-disk) ChromaDB instance, so `chromadb` must be installed.
"""
import io

import pytest


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))

    from app.core.config import get_settings

    get_settings.cache_clear()

    import app.db.database as db_module
    import app.services.vector_store as vs_module

    db_module._settings = get_settings()
    db_module._local = __import__("threading").local()
    vs_module.settings = get_settings()
    vs_module._client = __import__("chromadb").PersistentClient(path=vs_module.settings.chroma_persist_dir)

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()


def test_upload_rejects_non_pdf(client):
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
        data={"collection": "aktu", "category": "syllabus"},
    )
    assert resp.status_code == 400


def test_upload_rejects_bad_collection(client):
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("syllabus.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        data={"collection": "not_real", "category": "syllabus"},
    )
    assert resp.status_code == 400


def test_upload_index_and_summarize_flow(client, monkeypatch):
    async def fake_embed_texts(chunks):
        return [[0.1, 0.2, 0.3] for _ in chunks]

    async def fake_embed_text(text):
        return [0.1, 0.2, 0.3]

    async def fake_complete(messages):
        return "A mocked summary of the document."

    import app.api.routes.documents as documents_module

    monkeypatch.setattr(documents_module, "embed_texts", fake_embed_texts)
    monkeypatch.setattr(documents_module, "extract_text", lambda path: "Unit 1: Data Structures. " * 50)
    monkeypatch.setattr(documents_module, "complete", fake_complete)

    upload = client.post(
        "/api/documents/upload",
        files={"file": ("syllabus.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        data={"collection": "aktu", "category": "syllabus"},
    )
    assert upload.status_code == 200
    doc = upload.json()
    assert doc["filename"] == "syllabus.pdf"
    assert doc["chunk_count"] > 0

    listed = client.get("/api/documents", params={"collection": "aktu"})
    assert any(d["id"] == doc["id"] for d in listed.json())

    summarize = client.post(f"/api/documents/{doc['id']}/summarize")
    assert summarize.status_code == 200
    assert "mocked summary" in summarize.json()["result"]

    deleted = client.delete(f"/api/documents/{doc['id']}")
    assert deleted.status_code == 200


def test_exam_analysis_requires_indexed_papers(client):
    resp = client.post(
        "/api/exam-analysis",
        json={"collection": "aktu", "category": "previous_year_paper"},
    )
    assert resp.status_code == 422
