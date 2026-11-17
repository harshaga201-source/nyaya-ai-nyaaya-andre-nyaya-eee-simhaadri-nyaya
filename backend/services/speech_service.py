"""Speech-to-text with automatic spoken-language detection.

Engine order:

1. Gemini multimodal audio (best quality) when ``GEMINI_API_KEY`` is set.
2. Local whisper.cpp executable (fully offline after one download). Whisper is
   multilingual and performs its own acoustic language identification, so a
   citizen can speak any of the 11 supported languages without choosing one.
3. No engine - the client falls back to the browser SpeechRecognition API.

The local engine works in two stages:

* ``ggml-base`` runs a language-detection-only pass (``-dl``). It is small and
  finishes in about a second, and its acoustic language ID is accurate.
* A stronger model transcribes the clip with the detected language forced. If
  the written script contradicts that language (a known Whisper failure, e.g.
  Telugu decoded into Kannada letters), the clip is translated to English
  instead and that meaning is translated back into the citizen's language.

Every response carries the detected language so the answer, the UI and the
text-to-speech voice follow what the citizen actually spoke.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from backend.config import BASE_DIR
from backend.services.language_service import (
    SUPPORTED_LANGUAGES,
    detect_language,
    detect_script,
    expected_script,
    normalize_language_code,
)

logger = logging.getLogger(__name__)

_TOOL_DIR = Path(os.getenv("WHISPER_CPP_DIR") or (BASE_DIR / "tools" / "whisper"))

# Tiny model used only to name the language (fast, ~0.8 s on a laptop CPU).
_DETECT_MODEL_PREFERENCE = ("ggml-base.bin", "ggml-tiny.bin")

# Stronger model used to write the transcript. The small model is the best
# speed/accuracy trade-off for Indian languages on CPU; medium and turbo are
# accurate for Hindi/Tamil but take 11-15 s per clip without fixing Telugu.
_TRANSCRIBE_MODEL_PREFERENCE = (
    "ggml-small.bin",
    "ggml-medium-q5_0.bin",
    "ggml-base.bin",
    "ggml-tiny.bin",
)

# Whisper's native Telugu decoding is unreliable (it emits Kannada or mixed
# Devanagari script). Translating the clip to English and then rendering that
# meaning back into Telugu is both faster and correct.
_DIRECT_TRANSLATE_LANGUAGES = frozenset({"te"})

_DETECT_RE = re.compile(
    r"auto-detected language:\s*([a-zA-Z]{2,3})\s*\(\s*p\s*=\s*([0-9.]+)\s*\)"
)


def _find_executable() -> Optional[str]:
    for name in ("whisper-cli.exe", "main.exe", "whisper-cli", "main"):
        for candidate in (
            _TOOL_DIR / name,
            _TOOL_DIR / "Release" / name,
            _TOOL_DIR / "build" / "bin" / name,
        ):
            if candidate.is_file():
                return str(candidate)
    found = shutil.which("whisper-cli") or shutil.which("main")
    return found


def _find_model(preference: Tuple[str, ...] = _TRANSCRIBE_MODEL_PREFERENCE) -> Optional[str]:
    explicit = os.getenv("WHISPER_CPP_MODEL")
    if explicit:
        path = Path(explicit)
        if not path.is_absolute():
            path = _TOOL_DIR / explicit
        if path.is_file():
            return str(path)

    if not _TOOL_DIR.is_dir():
        return None
    for preferred in preference:
        candidate = _TOOL_DIR / preferred
        # A partial model download would crash the decoder; require a
        # plausible size (the smallest model is ~75 MB).
        if candidate.is_file() and candidate.stat().st_size > 50 * 1024 * 1024:
            return str(candidate)
    models = [
        path
        for path in sorted(_TOOL_DIR.glob("ggml-*.bin"))
        if path.stat().st_size > 50 * 1024 * 1024
    ]
    return str(models[0]) if models else None


def _available() -> bool:
    return bool(_find_executable() and _find_model())


def engine_status() -> Dict[str, Any]:
    from backend.services.gemini_service import gemini_service

    gemini_ready = gemini_service.client is not None
    local_ready = _available()
    if gemini_ready:
        engine = "gemini"
    elif local_ready:
        engine = "whisper.cpp"
    else:
        engine = "none"
    model = _find_model()
    detect_model = _find_model(_DETECT_MODEL_PREFERENCE)
    return {
        "server_stt": engine != "none",
        "engine": engine,
        "model": Path(model).name if model else None,
        "detect_model": Path(detect_model).name if detect_model else None,
        "gemini": gemini_ready,
        "local_ready": local_ready,
        "auto_detect": True,
        "languages": list(SUPPORTED_LANGUAGES),
    }


def warmup_async() -> None:
    """Cheap startup probe: report the engine without doing any work."""
    status = engine_status()
    if status["server_stt"]:
        logger.info(
            "Speech engine ready: %s (%s, language ID: %s) - automatic language detection enabled",
            status["engine"],
            status.get("model") or "cloud",
            status.get("detect_model") or "cloud",
        )
    else:
        logger.warning(
            "No server speech engine. Voice uses the browser recognizer; "
            "run scripts/setup_speech.py to enable offline auto-detect."
        )


def _clean_transcript(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.MULTILINE).strip()
    cleaned = re.sub(r"^\s*(transcript|text)\s*[:\-]\s*", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip().strip('"').strip()


def _wav_duration_seconds(path: str) -> float:
    try:
        with wave.open(path, "rb") as handle:
            frames = handle.getnframes()
            rate = handle.getframerate() or 16000
            return frames / float(rate)
    except Exception:  # noqa: BLE001
        return 0.0


def _audio_suffix(audio_bytes: bytes) -> str:
    """Whisper.cpp sniffs content, but a correct extension avoids ambiguity."""
    if audio_bytes[:4] == b"RIFF":
        return ".wav"
    if audio_bytes[:4] == b"OggS":
        return ".ogg"
    if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return ".webm"
    if b"ftyp" in audio_bytes[:20]:
        return ".m4a"
    return ".wav"


def _looks_degenerate(text: str) -> bool:
    """Catch repetition loops such as 'सारिलिलिलिलि...' from weak decodes."""
    value = (text or "").strip()
    if len(value) < 24:
        return False
    if re.search(r"(.)\1{11,}", value):
        return True
    # The same 8-character chunk appearing many times means the decoder is stuck.
    counts: Dict[str, int] = {}
    for index in range(0, max(0, len(value) - 8)):
        chunk = value[index : index + 8]
        counts[chunk] = counts.get(chunk, 0) + 1
    return bool(counts) and max(counts.values()) >= 6


def _run_whisper(
    executable: str,
    model: str,
    audio_path: str,
    language: str,
    out_base: str,
    translate: bool = False,
    detect_only: bool = False,
    timeout: int = 180,
) -> str:
    """Run whisper.cpp once and return its console output ('' on failure)."""
    threads = max(1, min(8, os.cpu_count() or 4))
    cmd = [
        executable,
        "-m", model,
        "-f", audio_path,
        "-l", "auto" if detect_only else language,
        "-t", str(threads),
    ]
    if detect_only:
        # Print the detection line (no -np here) and exit after one encoder pass.
        cmd.append("-dl")
    else:
        cmd += [
            "-bs", "1",
            "-nf",
            "-mc", "0",
            "-oj",
            "-of", out_base,
            "-nt",
            "-np",
        ]
        if translate:
            cmd.append("-tr")

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(Path(executable).parent),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        logger.warning("whisper.cpp timed out after %ss (lang=%s)", timeout, language)
        return ""

    combined = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        logger.warning(
            "whisper.cpp failed (code %s, lang=%s): %s",
            proc.returncode,
            language,
            combined[-500:],
        )
        return ""
    return combined


def _read_json_text(out_base: str) -> str:
    json_path = out_base + ".json"
    if not os.path.isfile(json_path):
        return ""
    try:
        with open(json_path, "r", encoding="utf-8", errors="replace") as handle:
            payload = json.load(handle)
        return _clean_transcript(
            "".join(segment.get("text", "") for segment in payload.get("transcription", []))
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not read whisper JSON: %s", exc)
        return ""


def _detect_spoken_language(executable: str, audio_path: str) -> Tuple[Optional[str], float]:
    """Fast acoustic language ID using the small base model (about one second)."""
    model = _find_model(_DETECT_MODEL_PREFERENCE)
    if not model:
        return None, 0.0

    output = _run_whisper(
        executable, model, audio_path, "auto", "", detect_only=True, timeout=90
    )
    match = _DETECT_RE.search(output)
    if not match:
        return None, 0.0

    code = normalize_language_code(match.group(1))
    probability = float(match.group(2))
    if code not in SUPPORTED_LANGUAGES:
        return None, probability
    return code, probability


def _translate_to_english(text: str) -> str:
    from backend.services.translate import translate_to_english

    try:
        return translate_to_english(text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transcript translation failed: %s", exc)
        return ""


def _render_transcript(text: str, language: str) -> str:
    """Translate an English fallback transcript back into the spoken language."""
    if not text or language == "en":
        return text
    from backend.services.translate import translate_text

    try:
        localized = translate_text(text, language)
        return localized or text
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transcript rendering failed: %s", exc)
        return text


def _transcribe_with_gemini(
    audio_bytes: bytes, mime_type: str, language_hint: str
) -> Optional[Dict[str, Any]]:
    from backend.services.gemini_service import gemini_service

    if gemini_service.client is None:
        return None

    try:
        from google.genai import types

        if language_hint == "auto":
            instruction = (
                "Listen to this audio. Identify the spoken language and transcribe it "
                "exactly in its own native script.\n"
                "Supported language codes: en, hi, mr, bn, gu, pa, ta, te, kn, ml, ur.\n"
                'Reply with strict JSON only: {"language": "<code>", "transcript": "<verbatim text>"}'
            )
        else:
            instruction = (
                f"Transcribe this audio verbatim in the language with code '{language_hint}' "
                "(use its native script).\n"
                'Reply with strict JSON only: {"language": "'
                + language_hint
                + '", "transcript": "<verbatim text>"}'
            )

        response = gemini_service.client.models.generate_content(
            model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash"),
            contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type), instruction],
        )
        raw = (response.text or "").strip()
        if not raw:
            return None

        language = ""
        transcript = ""
        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            payload = json.loads(match.group(0) if match else raw)
            language = str(payload.get("language") or "")
            transcript = _clean_transcript(str(payload.get("transcript") or ""))
        except Exception:  # noqa: BLE001
            transcript = _clean_transcript(raw)

        if not transcript:
            return None

        detected, confidence, method = detect_language(transcript, language_hint)
        code = normalize_language_code(language)
        if code not in SUPPORTED_LANGUAGES:
            code = detected
        return {
            "transcript": transcript,
            "language": code,
            "engine": "gemini",
            "confidence": round(max(confidence, 0.85), 3),
            "method": method,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini transcription failed: %s", exc)
        return None


def _transcribe_with_whisper_cpp(
    audio_bytes: bytes, language_hint: str
) -> Optional[Dict[str, Any]]:
    executable = _find_executable()
    model = _find_model()
    if not executable or not model:
        return None

    tmp_dir = tempfile.mkdtemp(prefix="nyaya-stt-")
    audio_path = os.path.join(tmp_dir, "speech" + _audio_suffix(audio_bytes))
    try:
        with open(audio_path, "wb") as handle:
            handle.write(audio_bytes)

        duration = _wav_duration_seconds(audio_path)
        # A non-WAV container cannot be measured here; let the decoder try it.
        if 0 < duration < 0.25:
            return {
                "transcript": "",
                "language": "en",
                "engine": "whisper.cpp",
                "confidence": 0.0,
                "method": "too-short",
            }

        # Stage 1 - who is speaking? An explicit language skips detection.
        requested = language_hint if language_hint in SUPPORTED_LANGUAGES else None
        probability = 1.0 if requested else 0.0
        if not requested:
            requested, probability = _detect_spoken_language(executable, audio_path)
        if requested not in SUPPORTED_LANGUAGES:
            requested = None

        # Stage 2 - transcribe in that language.
        translate_mode = requested in _DIRECT_TRANSLATE_LANGUAGES
        out_base = os.path.join(tmp_dir, "result")
        _run_whisper(
            executable,
            model,
            audio_path,
            requested or "auto",
            out_base,
            translate=translate_mode,
        )
        transcript = _read_json_text(out_base)
        method = "whisper.cpp+translate" if translate_mode else "whisper.cpp"

        # Telugu is decoded by whisper as English on purpose above; render that
        # meaning back into Telugu so the editable transcript is readable.
        if translate_mode and transcript:
            transcript = _render_transcript(transcript, requested or "en")

        # If detection failed entirely, whisper's own auto mode already ran and
        # its JSON carries the language it chose.
        if requested is None:
            try:
                with open(out_base + ".json", "r", encoding="utf-8", errors="replace") as handle:
                    auto_meta = json.load(handle).get("result") or {}
                auto_lang = normalize_language_code(str(auto_meta.get("language") or ""))
                if auto_lang in SUPPORTED_LANGUAGES:
                    requested = auto_lang
            except Exception:  # noqa: BLE001
                pass
            requested = requested or "en"

        expected = expected_script(requested) if requested else None
        written = detect_script(transcript) if transcript else None
        script_mismatch = bool(
            transcript
            and expected
            and written is not None
            and written != expected
        )
        # A weak decode in the wrong script (or a repetition loop) is useless
        # for retrieval. Ask whisper for the English meaning instead, then
        # render it back into the citizen's language for the editable box.
        if transcript and not translate_mode and (script_mismatch or _looks_degenerate(transcript)):
            logger.info(
                "Transcript script %s does not match %s; retrying as English translation",
                written,
                requested,
            )
            fallback_base = os.path.join(tmp_dir, "translated")
            _run_whisper(
                executable,
                model,
                audio_path,
                requested or "auto",
                fallback_base,
                translate=True,
            )
            english = _read_json_text(fallback_base)
            if english:
                transcript = _render_transcript(english, requested or "en")
                method = "whisper.cpp+translate"
            elif _looks_degenerate(transcript):
                transcript = ""

        # The fallback may have replaced the text, so resolve the final script.
        written = detect_script(transcript) if transcript else None

        if not transcript:
            return {
                "transcript": "",
                "language": requested or "en",
                "engine": "whisper.cpp",
                "confidence": 0.0,
                "method": "no-speech",
            }

        if requested:
            confidence = min(0.99, probability) if language_hint == "auto" else 1.0
        else:
            text_lang, text_conf, method = detect_language(transcript, "auto")
            requested = text_lang
            confidence = text_conf

        return {
            "transcript": transcript,
            "language": requested,
            "engine": "whisper.cpp",
            "confidence": round(max(0.0, min(1.0, confidence)), 3),
            "method": f"{method}+{written or 'script:unknown'}",
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Local speech transcription failed: %s", exc)
        return None
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:  # noqa: BLE001
            pass


def transcribe_audio(
    audio_bytes: bytes,
    mime_type: str = "audio/wav",
    language_hint: str = "auto",
    auto_detect: bool = True,
) -> Dict[str, Any]:
    """Transcribe audio and identify the spoken language.

    Returns transcript / language / engine / confidence. When no engine can
    run, ``transcript`` stays empty - the client must never receive a
    fabricated sentence.
    """
    hint = normalize_language_code(language_hint)
    if not auto_detect and hint in SUPPORTED_LANGUAGES:
        effective_hint = hint
    else:
        effective_hint = "auto"

    result = _transcribe_with_gemini(audio_bytes, mime_type, effective_hint)
    if not (result and (result.get("transcript") or "").strip()):
        result = _transcribe_with_whisper_cpp(audio_bytes, effective_hint)

    if result and (result.get("transcript") or "").strip():
        if effective_hint in SUPPORTED_LANGUAGES:
            result["language"] = effective_hint
        result["auto_detected"] = effective_hint == "auto"
        return result

    return {
        "transcript": "",
        "language": effective_hint if effective_hint in SUPPORTED_LANGUAGES else "en",
        "engine": "none",
        "confidence": 0.0,
        "method": "unavailable",
        "auto_detected": effective_hint == "auto",
    }
