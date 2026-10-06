from __future__ import annotations

import logging
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db import database as db
from app.db.schemas import DocumentOut, DocumentToolRequest, DocumentToolResponse
from app.services import vector_store
from app.services.embeddings import EmbeddingError, embed_texts
from app.services.llm_service import LLMError, complete
from app.services.pdf_service import PdfExtractionError, chunk_text, extract_text

logger = logging.getLogger("JARVIS.documents")
router = APIRouter(prefix="/documents", tags=["documents"])

VALID_COLLECTIONS = {"aktu", "sr_institute", "user_pdfs"}


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form(...),
    category: str = Form("other"),
):
    if collection not in VALID_COLLECTIONS:
        raise HTTPException(
            status_code=400, detail=f"collection must be one of {sorted(VALID_COLLECTIONS)}"
        )
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are supported right now")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        try:
            text = extract_text(tmp_path)
        except PdfExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        chunks = chunk_text(text)
        if not chunks:
            raise HTTPException(status_code=422, detail="No content could be chunked from this PDF")

        try:
            embeddings = await embed_texts(chunks)
        except EmbeddingError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        record = db.create_document(collection, file.filename, category, len(chunks))
        vector_store.add_chunks(collection, record["id"], file.filename, category, chunks, embeddings)
        logger.info(
            "Indexed '%s' into '%s' (%d chunks, category=%s)",
            file.filename, collection, len(chunks), category,
        )
        return record
    finally:
        os.unlink(tmp_path)


@router.get("", response_model=list[DocumentOut])
def get_documents(collection: str | None = None):
    if collection and collection not in VALID_COLLECTIONS:
        raise HTTPException(
            status_code=400, detail=f"collection must be one of {sorted(VALID_COLLECTIONS)}"
        )
    return db.list_documents(collection)


@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    record = db.get_document(doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    vector_store.delete_document(record["collection"], doc_id)
    db.delete_document_record(doc_id)
    return {"status": "deleted"}


def _get_document_or_404(doc_id: str) -> dict:
    record = db.get_document(doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    return record


def _document_text(record: dict, max_chunks: int = 40) -> str:
    """Pulls indexed chunks back out in order and joins them, capped so we
    don't blow past a local model's context window on large PDFs."""
    chunks = vector_store.get_all_chunks(record["collection"], record["id"])
    if not chunks:
        raise HTTPException(status_code=422, detail="No indexed content found for this document")
    return "\n\n".join(chunks[:max_chunks])


async def _run_tool(record: dict, instruction: str) -> str:
    document_text = _document_text(record)
    messages = [
        {
            "role": "system",
            "content": (
                "You are JARVIS's document assistant. Work only from the document "
                "excerpt provided. Format your answer clearly with Markdown."
            ),
        },
        {
            "role": "user",
            "content": f"Document: {record['filename']}\n\n{instruction}\n\n---\n{document_text}",
        },
    ]
    try:
        return await complete(messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/{doc_id}/summarize", response_model=DocumentToolResponse)
async def summarize_document(doc_id: str):
    record = _get_document_or_404(doc_id)
    result = await _run_tool(
        record, "Write a clear, well-structured summary of this document, organized by section."
    )
    return {"doc_id": doc_id, "result": result}


@router.post("/{doc_id}/notes", response_model=DocumentToolResponse)
async def generate_notes(doc_id: str):
    record = _get_document_or_404(doc_id)
    result = await _run_tool(
        record,
        "Generate concise study notes from this document as nested Markdown bullet "
        "points, grouped under headings for each topic/unit covered.",
    )
    return {"doc_id": doc_id, "result": result}


@router.post("/{doc_id}/mcqs", response_model=DocumentToolResponse)
async def generate_mcqs(doc_id: str, body: DocumentToolRequest):
    record = _get_document_or_404(doc_id)
    result = await _run_tool(
        record,
        f"Generate {body.count} multiple-choice questions covering this document. "
        "For each: the question, four labeled options (A-D), the correct answer, "
        "and a one-line explanation. Format as Markdown.",
    )
    return {"doc_id": doc_id, "result": result}


@router.post("/{doc_id}/flashcards", response_model=DocumentToolResponse)
async def generate_flashcards(doc_id: str, body: DocumentToolRequest):
    record = _get_document_or_404(doc_id)
    result = await _run_tool(
        record,
        f"Generate {body.count} flashcards from this document as a Markdown table "
        "with columns 'Front' (question/term) and 'Back' (answer/definition).",
    )
    return {"doc_id": doc_id, "result": result}


@router.post("/{doc_id}/important-questions", response_model=DocumentToolResponse)
async def important_questions(doc_id: str, body: DocumentToolRequest):
    record = _get_document_or_404(doc_id)
    result = await _run_tool(
        record,
        f"Identify the {body.count} most important/likely-to-be-asked questions from "
        "this document, ranked roughly by importance, each with a brief note on why "
        "it matters or a short model answer.",
    )
    return {"doc_id": doc_id, "result": result}
