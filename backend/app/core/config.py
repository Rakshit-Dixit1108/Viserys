"""
DragonAI backend configuration.

All settings are loaded from environment variables (see .env.example).
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    # --- General ---
    app_name: str = "DragonAI Backend"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]

    # --- Database ---
    sqlite_path: str = str(DATA_DIR / "dragonai.db")

    # --- LLM provider ---
    # "ollama" (local), "openai" (OpenAI-compatible), or "huggingface"
    llm_provider: str = "ollama"

    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # OpenAI-compatible (used only if llm_provider == "openai")
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Hugging Face Inference API (used only if llm_provider == "huggingface")
    hf_api_token: str = ""
    hf_model: str = "meta-llama/Meta-Llama-3-8B-Instruct"

    # --- RAG / ChromaDB ---
    chroma_persist_dir: str = str(DATA_DIR / "chroma")
    embedding_model: str = "nomic-embed-text"  # served via Ollama by default

    # --- System prompt ---
    system_prompt: str = (
        "You are DragonAI, a helpful, precise desktop assistant. "
        "You give direct, well-formatted answers using Markdown when useful. "
        "When you are not sure about something, say so plainly instead of guessing."
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
