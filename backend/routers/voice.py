import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.models.schemas import (
    LanguageDetectRequest,
    LanguageDetectResponse,
    TranscribeResponse,
)
from backend.services import speech_service
from backend.services.language_service import detect_language, language_name

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Voice"])


def _detect_mime(audio_bytes: bytes, content_type: str | None) -> str:
    if audio_bytes[:4] == b"RIFF":
        return "audio/wav"
    if audio_bytes[:4] == b"OggS":
        return "audio/ogg"
    if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"
    if b"ftyp" in audio_bytes[:20]:
        return "audio/mp4"
    return content_type or "audio/webm"


@router.get("/speech/status")
async def speech_status():
    """Report whether the server can transcribe audio and auto-detect language."""
    return speech_service.engine_status()


@router.post("/language/detect", response_model=LanguageDetectResponse)
async def detect_language_endpoint(payload: LanguageDetectRequest):
    """Detect the language of a transcript or typed question."""
    code, confidence, method = detect_language(payload.text, payload.hint)
    return LanguageDetectResponse(
        language=code,
        language_name=language_name(code),
        confidence=round(confidence, 3),
        method=method,
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    auto_detect: bool = Form(True),
):
    """Transcribe recorded speech and identify the spoken language.

    With ``language=auto`` (the default) the engine listens first and names the
    language itself; the client then asks ``/chat`` for an answer in that same
    language. An explicit ``language`` plus ``auto_detect=false`` keeps the old
    force-a-language behaviour.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio recording received.")

        mime_type = _detect_mime(audio_bytes, audio.content_type)
        result = speech_service.transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            language_hint=language,
            auto_detect=auto_detect,
        )

        if result.get("engine") == "none":
            # No STT engine configured: explain it instead of inventing words.
            logger.warning("Transcription requested but no speech engine is available")

        return TranscribeResponse(
            transcript=result.get("transcript") or "",
            language=result.get("language") or "en",
            confidence=float(result.get("confidence") or 0.0),
            engine=result.get("engine"),
            auto_detected=bool(result.get("auto_detected")),
            method=result.get("method"),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error(f"Voice transcription error: {e}")
        # Never return a fabricated transcript. The client asks the citizen to
        # type instead of silently repeating an unrelated canned question.
        return TranscribeResponse(
            transcript="",
            language="en" if language in ("", "auto") else language,
            confidence=0.0,
            engine="none",
            auto_detected=language in ("", "auto"),
            method="error",
        )
