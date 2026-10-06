from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db.schemas import ExamAnalysisRequest, ExamAnalysisResponse
from app.services import vector_store
from app.services.llm_service import LLMError, complete

router = APIRouter(prefix="/exam-analysis", tags=["exam-analysis"])

DISCLAIMER = (
    "This analysis is based on patterns found in the previous papers you've indexed. "
    "It highlights historical trends only and is **not** a guarantee of what will "
    "appear in any future exam."
)

MAX_CHUNKS = 60  # cap context size for locally-hosted models


@router.post("", response_model=ExamAnalysisResponse)
async def analyze(body: ExamAnalysisRequest):
    if body.collection not in ("aktu", "sr_institute"):
        raise HTTPException(status_code=400, detail="collection must be 'aktu' or 'sr_institute'")

    items = vector_store.get_chunks_for_category(body.collection, body.category)
    if not items:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No documents indexed under collection='{body.collection}', "
                f"category='{body.category}' yet. Upload previous papers with that "
                "category first."
            ),
        )

    doc_ids = {i["metadata"].get("doc_id") for i in items}
    context = "\n\n---\n\n".join(
        f"[{i['metadata'].get('filename')}]\n{i['text']}" for i in items[:MAX_CHUNKS]
    )
    subject_line = f"Focus on the subject: {body.subject_hint}\n\n" if body.subject_hint else ""

    messages = [
        {
            "role": "system",
            "content": (
                "You are JARVIS's exam analysis module. Analyze indexed previous "
                "question papers and produce a structured report in Markdown covering: "
                "1) Important/likely topics, 2) Frequently repeated questions, "
                "3) Unit-wise weightage (approximate), 4) Difficulty analysis, "
                "5) A short practice/mock paper based on the observed patterns. "
                "Be explicit that this reflects historical patterns, not certainty."
            ),
        },
        {
            "role": "user",
            "content": f"{subject_line}Previous papers excerpts:\n\n{context}",
        },
    ]

    try:
        analysis = await complete(messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "collection": body.collection,
        "category": body.category,
        "documents_analyzed": len(doc_ids),
        "analysis": analysis,
        "disclaimer": DISCLAIMER,
    }
