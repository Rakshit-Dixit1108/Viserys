from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services import stt_service, tts_service

router = APIRouter(prefix="/voice", tags=["voice"])


class TranscribeResponse(BaseModel):
    text: str


class SpeakRequest(BaseModel):
    text: str


@router.post("/stt", response_model=TranscribeResponse)
async def speech_to_text(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        text = stt_service.transcribe(tmp_path)
        return {"text": text}
    except stt_service.SttError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)


@router.post("/tts")
def text_to_speech(body: SpeakRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    try:
        path = tts_service.synthesize_to_file(body.text)
    except tts_service.TtsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return FileResponse(path, media_type="audio/wav", filename="speech.wav")


@router.get("/voices")
def voices():
    try:
        return {"voices": tts_service.list_voices()}
    except tts_service.TtsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
