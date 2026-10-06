from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.llm_service import LLMError, complete
from app.services.pdf_service import PdfExtractionError, extract_text

router = APIRouter(prefix="/resume", tags=["resume"])


class ResumeToolResponse(BaseModel):
    result: str


async def _extract_resume_text(file: UploadFile) -> str:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf resumes are supported right now")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        return extract_text(tmp_path)
    except PdfExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)


async def _run(resume_text: str, job_role: str | None, instruction: str) -> str:
    role_line = f"Target role: {job_role}\n\n" if job_role else ""
    messages = [
        {
            "role": "system",
            "content": (
                "You are JARVIS's resume assistant. Be specific and actionable, "
                "not generic. Format your answer in Markdown."
            ),
        },
        {"role": "user", "content": f"{role_line}{instruction}\n\n---\nRESUME:\n{resume_text}"},
    ]
    try:
        return await complete(messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/analyze", response_model=ResumeToolResponse)
async def analyze_resume(file: UploadFile = File(...), job_role: str | None = Form(None)):
    text = await _extract_resume_text(file)
    result = await _run(
        text,
        job_role,
        "Give an ATS (Applicant Tracking System) analysis of this resume: an approximate "
        "match score out of 100, keyword gaps, formatting issues that could confuse an "
        "ATS parser, and the top 5 concrete fixes ranked by impact.",
    )
    return {"result": result}


@router.post("/improve", response_model=ResumeToolResponse)
async def improve_resume(file: UploadFile = File(...), job_role: str | None = Form(None)):
    text = await _extract_resume_text(file)
    result = await _run(
        text,
        job_role,
        "Rewrite the weakest 3-5 bullet points of this resume to be more impactful "
        "(quantified, action-verb-led, concise), and list any sections that are "
        "missing or should be reordered. Present original vs. improved side by side.",
    )
    return {"result": result}


@router.post("/linkedin", response_model=ResumeToolResponse)
async def improve_linkedin(file: UploadFile = File(...), job_role: str | None = Form(None)):
    text = await _extract_resume_text(file)
    result = await _run(
        text,
        job_role,
        "Based on this resume, draft an improved LinkedIn headline, an About/Summary "
        "section (3-4 short paragraphs), and 5 skills to prioritize adding or "
        "reordering on the profile.",
    )
    return {"result": result}
