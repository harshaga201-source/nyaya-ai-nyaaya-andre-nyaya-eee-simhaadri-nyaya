"""Lightweight query translator used to improve statutory retrieval and answer rendering.

The legal corpus is in English (BNS, BNSS, BSA, MVA, CPA, RTI), so lexical
and embedding matches from an Indic script are weak. Translating the query to
English and searching with the combined text dramatically improves recall.

The reverse translation (English statutory excerpts -> the citizen's language)
is used to render a full answer in that language without hallucination.

If translation is unavailable (offline, service unreachable), everything in
this module degrades gracefully: retrieval uses the original query and the
answer uses the English statutory text.
"""

import json
import logging
import re
import urllib.parse
import urllib.request
from typing import List, Optional

logger = logging.getLogger(__name__)

_T_CACHE: dict[str, str] = {}
_TO_CACHE: dict[tuple[str, str], str] = {}
_URL_TO_EN = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q="
_URL_TO = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target}&dt=t&q="
_SEP = "\n@@@\n"

_INDIC_RANGES = (
    (0x0900, 0x097F),  # Devanagari (Hindi/Marathi/Nepali)
    (0x0980, 0x09FF),  # Bengali
    (0x0A00, 0x0A7F),  # Gurmukhi (Punjabi)
    (0x0A80, 0x0AFF),  # Gujarati
    (0x0B80, 0x0BFF),  # Tamil
    (0x0C00, 0x0C7F),  # Telugu
    (0x0C80, 0x0CFF),  # Kannada
    (0x0D00, 0x0D7F),  # Malayalam
    (0x0600, 0x06FF),  # Arabic script (Urdu)
    (0x0A00, 0x0A7F),  # duplicate retained harmlessly
)


def is_indic(text: str) -> bool:
    for ch in text or "":
        cp = ord(ch)
        for lo, hi in _INDIC_RANGES:
            if lo <= cp <= hi:
                return True
    return False


def _gtx(url: str) -> Optional[str]:
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
        return "".join(seg[0] for seg in data[0] if seg and seg[0]).strip()
    except Exception as exc:  # noqa: BLE001 - translation must never hard-fail
        logger.warning("translation unavailable: %s", exc)
        return None


def translate_to_english(text: Optional[str]) -> str:
    """Return the English translation of an Indic query, or '' on any failure."""
    source = (text or "").strip()
    if not source:
        return ""
    if source in _T_CACHE:
        return _T_CACHE[source]

    clipped = source[:1000]
    merged = _gtx(_URL_TO_EN + urllib.parse.quote(clipped)) or ""
    _T_CACHE[source] = merged
    return merged


def translate_texts(texts: List[str], target_lang: str) -> List[str]:
    """Batch-translate English strings into an Indic/legacy target language.

    Statutory citations and section numbers survive (they are plain digits).
    Falls back to the original English strings whenever a piece cannot be translated.
    """
    target = (target_lang or "en").lower()
    if target == "en":
        return list(texts)

    out: List[str] = []
    i = 0
    while i < len(texts):
        batch: List[str] = []
        size = 0
        while i < len(texts) and len(batch) < 6 and (size + len(texts[i])) < 1800:
            batch.append(texts[i])
            size += len(texts[i]) + 5
            i += 1

        joined = _SEP.join(batch)
        merged = _gtx(_URL_TO.format(target=target) + urllib.parse.quote(joined))
        if merged:
            pieces = [p.strip() for p in merged.split("@@@")]
            if len(pieces) != len(batch):
                pieces = [_gtx(_URL_TO.format(target=target) + urllib.parse.quote(t)) or t for t in batch]
        else:
            pieces = [_gtx(_URL_TO.format(target=target) + urllib.parse.quote(t)) or t for t in batch]
        out.extend(pieces)
    return out


def translate_text(text: str, target_lang: str) -> str:
    if not text:
        return text
    return translate_texts([text], target_lang)[0]
