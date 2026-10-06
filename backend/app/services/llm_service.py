"""
Unified LLM streaming client.

Supports three interchangeable providers, selected via LLM_PROVIDER in .env:
  - "ollama"       -> local model served by Ollama (default, no API key needed)
  - "openai"       -> any OpenAI-compatible chat completions endpoint
  - "huggingface"  -> Hugging Face Inference API (text-generation)

Every provider exposes the same async generator interface:
    async for token in stream_chat(messages):
        ...
so the API layer never needs to know which backend is active.
"""
from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from app.core.config import get_settings

settings = get_settings()


class LLMError(RuntimeError):
    """Raised when the configured LLM backend cannot be reached or errors out."""


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    """Yield response text chunks for a chat completion, from whichever
    provider is configured in settings.llm_provider."""
    provider = settings.llm_provider.lower()
    if provider == "ollama":
        async for chunk in _stream_ollama(messages):
            yield chunk
    elif provider == "openai":
        async for chunk in _stream_openai(messages):
            yield chunk
    elif provider == "huggingface":
        async for chunk in _stream_huggingface(messages):
            yield chunk
    else:
        raise LLMError(f"Unknown LLM_PROVIDER '{settings.llm_provider}'")


async def _stream_ollama(messages: list[dict]) -> AsyncIterator[str]:
    url = f"{settings.ollama_host.rstrip('/')}/api/chat"
    payload = {"model": settings.ollama_model, "messages": messages, "stream": True}
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    raise LLMError(
                        f"Ollama returned {resp.status_code}: {body.decode(errors='ignore')}"
                    )
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("done"):
                        break
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content
    except httpx.ConnectError as exc:
        raise LLMError(
            "Could not reach Ollama at "
            f"{settings.ollama_host}. Is Ollama running (`ollama serve`) and is "
            f"the model pulled (`ollama pull {settings.ollama_model}`)?"
        ) from exc


async def _stream_openai(messages: list[dict]) -> AsyncIterator[str]:
    if not settings.openai_api_key:
        raise LLMError("OPENAI_API_KEY is not set in .env")
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    payload = {"model": settings.openai_model, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                raise LLMError(f"OpenAI-compatible API returned {resp.status_code}: {body!r}")
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                data = json.loads(data_str)
                delta = data["choices"][0]["delta"].get("content", "")
                if delta:
                    yield delta


async def _stream_huggingface(messages: list[dict]) -> AsyncIterator[str]:
    if not settings.hf_api_token:
        raise LLMError("HF_API_TOKEN is not set in .env")
    prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages) + "\nassistant:"
    url = f"https://api-inference.huggingface.co/models/{settings.hf_model}"
    headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
    payload = {"inputs": prompt, "parameters": {"max_new_tokens": 512}, "stream": False}
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise LLMError(f"Hugging Face API returned {resp.status_code}: {resp.text}")
        data = resp.json()
        text = data[0]["generated_text"] if isinstance(data, list) else str(data)
        # HF's basic inference endpoint is non-streaming; emit it as one chunk
        # so downstream SSE handling stays identical across providers.
        yield text[len(prompt):] if text.startswith(prompt) else text
