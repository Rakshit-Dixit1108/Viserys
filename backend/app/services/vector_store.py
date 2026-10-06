"""
Thin wrapper around a persistent ChromaDB client.

Collections map to knowledge bases:
  - "aktu"          -> AKTU syllabus, papers, calendar, circulars, etc.
  - "sr_institute"   -> SR Institute departments, faculty, notices, etc.
  - "user_pdfs"      -> ad-hoc PDFs uploaded for one-off Q&A/summarization

Chroma calls are synchronous; this app is single-user/desktop-scale so we
call them directly from async route handlers rather than adding thread-pool
plumbing for a bottleneck that doesn't really exist here.
"""
from __future__ import annotations

from typing import Optional

import chromadb

from app.core.config import get_settings

settings = get_settings()
_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)

VALID_COLLECTIONS = {"aktu", "sr_institute", "user_pdfs"}


def get_collection(name: str):
    if name not in VALID_COLLECTIONS:
        raise ValueError(f"Unknown collection '{name}'. Valid: {sorted(VALID_COLLECTIONS)}")
    return _client.get_or_create_collection(name)


def add_chunks(
    collection_name: str,
    doc_id: str,
    filename: str,
    category: str,
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:
    if not chunks:
        return
    coll = get_collection(collection_name)
    ids = [f"{doc_id}::{i}" for i in range(len(chunks))]
    metadatas = [
        {"doc_id": doc_id, "filename": filename, "category": category, "chunk_index": i}
        for i in range(len(chunks))
    ]
    coll.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)


def query(
    collection_name: str,
    query_embedding: list[float],
    top_k: int = 5,
    doc_id: Optional[str] = None,
) -> list[dict]:
    coll = get_collection(collection_name)
    where = {"doc_id": doc_id} if doc_id else None
    result = coll.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    hits = []
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]
    for doc, meta, dist in zip(documents, metadatas, distances):
        hits.append({"text": doc, "metadata": meta, "distance": dist})
    return hits


def get_all_chunks(collection_name: str, doc_id: str) -> list[str]:
    coll = get_collection(collection_name)
    result = coll.get(where={"doc_id": doc_id}, include=["documents", "metadatas"])
    pairs = list(zip(result.get("documents", []), result.get("metadatas", [])))
    pairs.sort(key=lambda p: p[1].get("chunk_index", 0))
    return [text for text, _ in pairs]


def get_chunks_for_category(collection_name: str, category: str) -> list[dict]:
    """Used by exam analysis: pull every chunk tagged with a given category
    (e.g. 'previous_year_paper') across all documents in a collection."""
    coll = get_collection(collection_name)
    result = coll.get(where={"category": category}, include=["documents", "metadatas"])
    documents = result.get("documents", [])
    metadatas = result.get("metadatas", [])
    return [{"text": t, "metadata": m} for t, m in zip(documents, metadatas)]


def delete_document(collection_name: str, doc_id: str) -> None:
    coll = get_collection(collection_name)
    coll.delete(where={"doc_id": doc_id})
