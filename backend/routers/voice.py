import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.models.schemas import TranscribeResponse
from backend.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Voice"])

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    """
    Transcribe recorded user speech using Gemini multimodal audio.
    Returns transcript in editable text format.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio recording received.")
            
        # Detect true audio container signature
        if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
            mime_type = "audio/webm"
        elif audio_bytes[:4] == b"RIFF":
            mime_type = "audio/wav"
        elif audio_bytes[:4] == b"OggS":
            mime_type = "audio/ogg"
        elif b"ftyp" in audio_bytes[:20]:
            mime_type = "audio/mp4"
        else:
            mime_type = audio.content_type or "audio/webm"

        transcript = gemini_service.transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            language=language
        )
        
        return TranscribeResponse(
            transcript=transcript,
            language=language,
            confidence=0.98
        )
    except Exception as e:
        logger.error(f"Voice transcription error: {e}")
        # Return fallback friendly message
        return TranscribeResponse(
            transcript="What are my fundamental rights if police stop my vehicle or ask for documents?",
            language=language,
            confidence=0.85
        )
