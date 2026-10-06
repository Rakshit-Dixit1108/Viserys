"""
PDF text extraction and chunking for the RAG pipeline.
"""
from __future__ import annotations

from pypdf import PdfReader


class PdfExtractionError(RuntimeError):
    pass


def extract_text(path: str) -> str:
    try:
        reader = PdfReader(path)
    except Exception as exc:  # noqa: BLE001
        raise PdfExtractionError(f"Could not open PDF: {exc}") from exc

    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 - a single bad page shouldn't fail the whole doc
            pages.append("")
    text = "\n\n".join(pages).strip()
    if not text:
        raise PdfExtractionError(
            "No extractable text found in this PDF. It may be a scanned "
            "image without OCR -- OCR support isn't wired in yet."
        )
    return text


def chunk_text(text: str, chunk_words: int = 220, overlap_words: int = 40) -> list[str]:
    """Simple sliding-window word chunker. Good enough for syllabi, notices,
    and question papers, which are mostly plain running text or short
    structured entries rather than dense multi-column layouts."""
    words = text.split()
    if not words:
        return []

    step = max(chunk_words - overlap_words, 1)
    chunks = []
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_words])
        if chunk.strip():
            chunks.append(chunk.strip())
        if start + chunk_words >= len(words):
            break
    return chunks
