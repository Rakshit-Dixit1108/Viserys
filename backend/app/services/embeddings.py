"""
Embeddings client for RAG. Uses Ollama's /api/embeddings endpoint by
default (model configured via EMBEDDING_MODEL, e.g. "nomic-embed-text"),
which keeps the whole RAG pipeline local and free -- no external API key
required to index and search AKTU/SR Institute documents.
"""
from __future__ import annotations

import httpx

from app.core.config import get_settings

settings = get_settings()


class EmbeddingError(RuntimeError):
    pass


async def embed_text(text: str) -> list[float]:
    url = f"{settings.ollama_host.rstrip('/')}/api/embeddings"
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                url, json={"model": settings.embedding_model, "prompt": text}
            )
            if resp.status_code != 200:
                raise EmbeddingError(
                    f"Ollama embeddings returned {resp.status_code}: {resp.text}"
                )
            data = resp.json()
            embedding = data.get("embedding")
            if not embedding:
                raise EmbeddingError(f"Ollama embeddings response missing 'embedding': {data}")
            return embedding
    except httpx.ConnectError as exc:
        raise EmbeddingError(
            f"Could not reach Ollama at {settings.ollama_host} for embeddings. "
            f"Is Ollama running and is the embedding model pulled "
            f"(`ollama pull {settings.embedding_model}`)?"
        ) from exc


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embeds a list of chunks sequentially. Kept simple and sequential
    (rather than parallel) so we don't overwhelm a locally-running Ollama
    instance, which typically serves one request at a time per model."""
    return [await embed_text(t) for t in texts]
