"""
Local text-to-speech via pyttsx3, which wraps the OS's native voices
(SAPI5 on Windows, NSSpeechSynthesizer on macOS, espeak on Linux). Chosen
over Piper/Coqui as the default because it needs no model download and
"just works" out of the box on Windows -- Piper/Coqui remain a natural
drop-in upgrade later for higher-quality voices (see README).
"""
from __future__ import annotations

import tempfile
import threading

from app.core.config import get_settings

settings = get_settings()

# pyttsx3 engines are not thread-safe; serialize access.
_engine_lock = threading.Lock()


class TtsError(RuntimeError):
    pass


def synthesize_to_file(text: str) -> str:
    """Synthesizes speech for `text` and returns the path to a temporary
    .wav file. Caller is responsible for deleting it after use."""
    try:
        import pyttsx3
    except ImportError as exc:
        raise TtsError(
            "The 'pyttsx3' package isn't installed. Run: pip install -r requirements.txt"
        ) from exc

    tmp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name

    with _engine_lock:
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", settings.tts_rate)
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            engine.stop()
        except Exception as exc:  # noqa: BLE001
            raise TtsError(f"Speech synthesis failed: {exc}") from exc

    return tmp_path


def list_voices() -> list[dict]:
    try:
        import pyttsx3
    except ImportError as exc:
        raise TtsError(
            "The 'pyttsx3' package isn't installed. Run: pip install -r requirements.txt"
        ) from exc
    with _engine_lock:
        engine = pyttsx3.init()
        voices = engine.getProperty("voices") or []
        result = [{"id": v.id, "name": v.name} for v in voices]
        engine.stop()
    return result
