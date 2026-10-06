from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(prefix="/system", tags=["system"])
settings = get_settings()


@router.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


@router.get("/settings")
def public_settings():
    """Non-secret settings the frontend needs to render the Settings page."""
    return {
        "llm_provider": settings.llm_provider,
        "ollama_model": settings.ollama_model,
        "openai_model": settings.openai_model,
        "hf_model": settings.hf_model,
    }
