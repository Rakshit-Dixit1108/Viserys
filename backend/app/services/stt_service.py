"""
Local speech-to-text via faster-whisper (a CTranslate2 reimplementation of
OpenAI's Whisper). Chosen over the original `openai-whisper` package
because it ships prebuilt wheels on all platforms -- no C/C++ build step,
no setuptools/pkg_resources issues, and no separate ffmpeg install
required (it decodes audio via PyAV, pulled in automatically).

The model is loaded lazily and cached in-process so app startup stays
fast; you only pay the (one-time, ~150MB for "base") download cost if
voice input is actually used.
"""
from __future__ import annotations

import threading

from app.core.config import get_settings

settings = get_settings()

_model = None
_model_lock = threading.Lock()


class SttError(RuntimeError):
    pass


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                try:
                    from faster_whisper import WhisperModel
                except ImportError as exc:
                    raise SttError(
                        "The 'faster-whisper' package isn't installed. "
                        "Run: pip install -r requirements.txt"
                    ) from exc
                # CPU + int8 keeps this working out of the box with no GPU/CUDA
                # setup required; swap device="cuda" for a big speed-up if you
                # have an NVIDIA GPU with CUDA available.
                _model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
    return _model


def transcribe(audio_path: str) -> str:
    """Transcribes an audio file (wav/mp3/webm/etc) to text. Blocking/
    CPU-bound -- call from a sync route or a thread pool, never awaited
    directly on the event loop."""
    model = _get_model()
    try:
        segments, _info = model.transcribe(audio_path)
        return " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as exc:  # noqa: BLE001
        raise SttError(f"Transcription failed: {exc}") from exc