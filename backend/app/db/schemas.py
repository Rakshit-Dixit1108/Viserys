from __future__ import annotations

from pydantic import BaseModel, Field


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ConversationCreate(BaseModel):
    title: str = "New chat"


class ConversationRename(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1)
