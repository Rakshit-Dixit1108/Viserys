from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.db import database as db
from app.db.schemas import (
    ChatRequest,
    ConversationCreate,
    ConversationOut,
    ConversationRename,
    MessageOut,
)
from app.services.llm_service import LLMError, stream_chat

logger = logging.getLogger("dragonai.chat")
settings = get_settings()
router = APIRouter(prefix="/chat", tags=["chat"])
conv_router = APIRouter(prefix="/conversations", tags=["conversations"])


@conv_router.get("", response_model=list[ConversationOut])
def get_conversations(q: str | None = None):
    if q:
        return db.search_conversations(q)
    return db.list_conversations()


@conv_router.post("", response_model=ConversationOut)
def post_conversation(body: ConversationCreate):
    return db.create_conversation(body.title)


@conv_router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: str):
    if not db.get_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db.list_messages(conversation_id)


@conv_router.patch("/{conversation_id}", response_model=ConversationOut)
def patch_conversation(conversation_id: str, body: ConversationRename):
    if not db.get_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.rename_conversation(conversation_id, body.title)
    return db.get_conversation(conversation_id)


@conv_router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str):
    if not db.get_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete_conversation(conversation_id)
    return {"status": "deleted"}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/stream")
async def chat_stream(body: ChatRequest):
    """
    Stream an assistant reply as Server-Sent Events.

    Events emitted:
      - "meta"  : {"conversation_id": ...}      (once, at the start)
      - "token" : {"text": "..."}               (repeated, as text arrives)
      - "done"  : {}                            (once, at the end)
      - "error" : {"message": "..."}            (on failure)
    """
    conversation_id = body.conversation_id
    if conversation_id and not db.get_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conversation_id:
        title = body.message.strip().splitlines()[0][:60] or "New chat"
        conversation_id = db.create_conversation(title)["id"]

    db.add_message(conversation_id, "user", body.message)
    history = db.list_messages(conversation_id)
    llm_messages = [{"role": "system", "content": settings.system_prompt}] + [
        {"role": m["role"], "content": m["content"]} for m in history
    ]

    async def event_generator():
        yield _sse("meta", {"conversation_id": conversation_id})
        collected = ""
        try:
            async for chunk in stream_chat(llm_messages):
                collected += chunk
                yield _sse("token", {"text": chunk})
        except LLMError as exc:
            logger.warning("LLM error: %s", exc)
            yield _sse("error", {"message": str(exc)})
            return
        except Exception as exc:  # noqa: BLE001 - surface any unexpected failure to the client
            logger.exception("Unexpected error during chat streaming")
            yield _sse("error", {"message": f"Unexpected server error: {exc}"})
            return

        if collected.strip():
            db.add_message(conversation_id, "assistant", collected)
        yield _sse("done", {})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
