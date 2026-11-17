"""Language identification for spoken and typed citizen queries.

Two complementary detectors are used:

1. Script detection - Unicode blocks make Indic languages unambiguous
   (Tamil text is Tamil, Telugu text is Telugu, and so on). Devanagari is
   shared by Hindi and Marathi, so it is disambiguated with marker words.
2. Romanised detection - many citizens speak Indic languages but the speech
   engine returns Latin script ("mujhe FIR darj karwani hai"). A weighted
   keyword scorer maps that back to the intended language.

The detector never raises: an unknown/ambiguous input falls back to the
caller's hint, then to English.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Dict, Optional, Tuple

SUPPORTED_LANGUAGES = (
    "en", "hi", "kn", "ta", "te", "ml", "mr", "bn", "gu", "pa", "ur",
)

# Unicode block -> language candidates (most likely first).
_SCRIPT_LANGUAGES: Dict[str, Tuple[str, ...]] = {
    "devanagari": ("hi", "mr"),
    "bengali": ("bn",),
    "gurmukhi": ("pa",),
    "gujarati": ("gu",),
    "tamil": ("ta",),
    "telugu": ("te",),
    "kannada": ("kn",),
    "malayalam": ("ml",),
    "arabic": ("ur",),
}

_RANGES: Tuple[Tuple[int, int, str], ...] = (
    (0x0900, 0x097F, "devanagari"),
    (0x0980, 0x09FF, "bengali"),
    (0x0A00, 0x0A7F, "gurmukhi"),
    (0x0A80, 0x0AFF, "gujarati"),
    (0x0B80, 0x0BFF, "tamil"),
    (0x0C00, 0x0C7F, "telugu"),
    (0x0C80, 0x0CFF, "kannada"),
    (0x0D00, 0x0D7F, "malayalam"),
    (0x0600, 0x06FF, "arabic"),
    (0x0750, 0x077F, "arabic"),
    (0xFB50, 0xFDFF, "arabic"),
    (0xFE70, 0xFEFF, "arabic"),
)

# Shared legal vocabulary is deliberately excluded from the scores: words like
# police / FIR / helmet are spoken in every Indian language and would bias the
# detector. Only grammar words and language-distinctive vocabulary are scored.
_ROMAN_KEYWORDS: Dict[str, Dict[str, int]] = {
    "hi": {
        "kya": 3, "kyun": 3, "kyu": 3, "kaise": 3, "kaun": 2, "kahan": 3,
        "mujhe": 3, "mera": 2, "meri": 2, "mere": 1, "hum": 2, "hamara": 2,
        "nahi": 3, "nahin": 3, "hai": 2, "haan": 2, "karna": 3, "karni": 3,
        "karwana": 3, "chahiye": 3, "sakta": 2, "sakti": 2, "hoga": 2,
        "batao": 3, "bataye": 3, "bataiye": 3, "adhikar": 3, "kanoon": 3,
        "giraftar": 2, "hirasat": 3, "jamavat": 1, "shikayat": 2,
    },
    "mr": {
        "kay": 3, "kase": 3, "kashi": 3, "kon": 2, "kuthe": 3,
        "mala": 3, "majha": 3, "majhi": 3, "majhe": 3, "amhi": 2, "amcha": 2,
        "nahi": 2, "aahe": 4, "ahe": 3, "karna": 1, "kara": 2, "pahije": 3,
        "shakta": 2, "shakti": 2, "sangaa": 2, "sanga": 2, "adhikar": 3,
        "kayda": 3, "atak": 2, "chaushisi": 3, "takrar": 3,
    },
    "bn": {
        "ki": 1, "kemon": 3, "keno": 3, "kothay": 3, "ke": 1, "kar": 1,
        "ami": 3, "amar": 3, "amake": 3, "amader": 3, "apni": 2,
        "na": 2, "nei": 3, "ache": 3, "korbo": 3, "korte": 2, "chai": 2,
        "bolun": 3, "bolo": 2, "adhikar": 3, "ain": 3, "giraftar": 2,
    },
    "gu": {
        "shu": 3, "kem": 3, "kevi": 3, "kyare": 3, "kone": 2, "kya": 1,
        "hu": 3, "maru": 3, "mari": 2, "mane": 2, "ame": 2, "amaru": 2,
        "nathi": 3, "che": 3, "karvo": 3, "karwu": 3, "joie": 3,
        "kahejo": 3, "adhikar": 3, "kaydo": 3, "dharpakad": 3,
    },
    "pa": {
        "ki": 2, "kive": 3, "kyon": 2, "kidhar": 3, "kihda": 3,
        "main": 2, "mera": 2, "meri": 2, "menu": 3, "asi": 2, "sada": 2,
        "nahi": 3, "hai": 2, "karna": 2, "karni": 2, "chahida": 3,
        "daso": 3, "adhikar": 3, "kanoon": 3, "giraftari": 2,
    },
    "ur": {
        "kya": 2, "kyun": 2, "kaise": 1, "kaun": 1, "kahan": 1,
        "mujhe": 2, "mera": 2, "meri": 2, "hum": 2, "hamara": 2,
        "nahi": 2, "hai": 1, "karna": 2, "chahiye": 2, "sakta": 2,
        "bataiye": 2, "haq": 3, "qanoon": 3, "giraftari": 2,
        "adalat": 2, "muqadma": 3, "zamanat": 3, "shikayat": 2,
    },
    "ta": {
        "enna": 3, "en": 2, "epdi": 3, "eppadi": 3, "ethu": 3, "ethuku": 3,
        "yaar": 2, "naan": 3, "enakku": 3, "enaku": 3, "ennoda": 3,
        "illa": 3, "illai": 3, "irukku": 3, "iruku": 3, "venum": 3,
        "vendum": 3, "sollu": 3, "sollunga": 3, "sattam": 3, "urimai": 3,
        "kaithu": 2, "vaanga": 2,
    },
    "te": {
        "enti": 3, "ela": 3, "elaa": 3, "enduku": 3, "evaru": 3, "ekkada": 3,
        "nenu": 3, "naaku": 3, "naa": 1, "naadi": 2, "manam": 2, "maaku": 2,
        "ledu": 3, "ledhu": 3, "undi": 3, "vundhi": 3, "kavali": 3,
        "cheppandi": 3, "cheppu": 3, "chattam": 3, "hakku": 3,
        "arrest": 1, "vishayam": 2,
    },
    "kn": {
        "enu": 3, "yenu": 3, "hege": 3, "heg": 2, "yake": 3, "yaaru": 3,
        "elli": 3, "nanu": 3, "naanu": 3, "nanage": 3, "nanna": 2,
        "illa": 3, "ide": 3, "beku": 3, "helu": 3, "helri": 3, "heluva": 2,
        "kanoonu": 3, "kanoon": 2, "hakku": 3, "bandhana": 2, "sattam": 2,
    },
    "ml": {
        "enthu": 3, "entha": 2, "engine": 3, "engane": 3, "aaru": 2,
        "evide": 3, "njan": 3, "enikku": 3, "eniku": 3, "ente": 3,
        "illa": 3, "undu": 3, "vendum": 3, "venam": 3, "parayu": 3,
        "parayoo": 3, "niyamam": 3, "avakasham": 3, "arrest": 1,
    },
    "en": {
        "the": 2, "is": 2, "are": 2, "what": 3, "how": 3, "why": 3,
        "can": 2, "police": 1, "refuse": 2, "warrant": 2, "penalty": 2,
        "section": 2, "under": 2, "act": 1, "my": 2, "i": 1, "do": 1,
    },
}

_DEVANAGARI_MARATHI = (
    "आहे", "काय", "मला", "माझ्या", "माझा", "माझी", "माझे", "आम्ही",
    "आमच्या", "पाहिजे", "कसा", "कशी", "कसे", "कुठे", "नाही", "तक्रार",
    "कायदा", "अटक", "चौकशी", "हक्क", "पोलीस", "जामीन", "का",
)
_DEVANAGARI_HINDI = (
    "है", "क्या", "क्यों", "कैसे", "कौन", "कहाँ", "कहां", "मुझे", "मेरा",
    "मेरी", "हमारा", "नहीं", "करना", "करनी", "चाहिए", "सकता", "सकती",
    "बताओ", "बताइए", "अधिकार", "कानून", "गिरफ्तार", "हिरासत", "जमानत",
    "शिकायत", "पुलिस",
)

# Whisper / BCP-47 / long names -> our codes.
_CODE_ALIASES: Dict[str, str] = {
    "en": "en", "eng": "en", "english": "en",
    "hi": "hi", "hin": "hi", "hindi": "hi",
    "mr": "mr", "mar": "mr", "marathi": "mr",
    "bn": "bn", "ben": "bn", "bengali": "bn", "bangla": "bn",
    "gu": "gu", "guj": "gu", "gujarati": "gu",
    "pa": "pa", "pan": "pa", "punjabi": "pa", "panjabi": "pa",
    "ta": "ta", "tam": "ta", "tamil": "ta",
    "te": "te", "tel": "te", "telugu": "te",
    "kn": "kn", "kan": "kn", "kannada": "kn",
    "ml": "ml", "mal": "ml", "malayalam": "ml",
    "ur": "ur", "urd": "ur", "urdu": "ur",
    # Speech engines sometimes return the international code for Urdu.
    "pk": "ur",
    "auto": "auto", "": "auto",
}


def normalize_language_code(value: Optional[str]) -> str:
    """Return a supported language code, 'auto', or 'en' for unknown input."""
    raw = (value or "").strip().lower().replace("_", "-")
    if not raw:
        return "auto"
    primary = raw.split("-")[0]
    if primary in _CODE_ALIASES:
        return _CODE_ALIASES[primary]
    if raw in _CODE_ALIASES:
        return _CODE_ALIASES[raw]
    return "en"


# The script each supported language is written in. Telugu written in Kannada
# characters (a known Whisper failure) still says "te" acoustically, so this map
# lets the caller detect a broken transcript instead of trusting its label.
SCRIPT_BY_LANGUAGE: Dict[str, str] = {
    "en": "latin",
    "hi": "devanagari",
    "mr": "devanagari",
    "bn": "bengali",
    "gu": "gujarati",
    "pa": "gurmukhi",
    "ta": "tamil",
    "te": "telugu",
    "kn": "kannada",
    "ml": "malayalam",
    "ur": "arabic",
}


def _script_of(ch: str) -> Optional[str]:
    cp = ord(ch)
    for lo, hi, name in _RANGES:
        if lo <= cp <= hi:
            return name
    if ch.isalpha() and (0x0041 <= cp <= 0x024F):
        return "latin"
    return None


def _script_scores(text: str) -> Dict[str, int]:
    scores: Dict[str, int] = {}
    for ch in text:
        name = _script_of(ch)
        if name:
            scores[name] = scores.get(name, 0) + 1
    return scores


def detect_script(text: Optional[str]) -> Optional[str]:
    """Return the dominant writing system of `text` (or None for no letters)."""
    value = text or ""
    scores = _script_scores(value)
    if not scores:
        return None
    letters = sum(1 for ch in value if ch.isalpha())
    script, count = max(scores.items(), key=lambda kv: kv[1])
    if letters and count / letters < 0.2 and count < 4:
        return None
    return script


def expected_script(language: str) -> Optional[str]:
    return SCRIPT_BY_LANGUAGE.get(normalize_language_code(language))


def _word_hits(text: str, words: Tuple[str, ...]) -> int:
    hits = 0
    for word in words:
        if len(word) <= 2:
            if re.search(r"(?<![\w\u0900-\u097F])" + re.escape(word) + r"(?![\w\u0900-\u097F])", text):
                hits += 2
        elif word in text:
            hits += 1
    return hits


def _detect_devanagari(text: str) -> Tuple[str, float, str]:
    marathi = _word_hits(text, _DEVANAGARI_MARATHI)
    hindi = _word_hits(text, _DEVANAGARI_HINDI)

    # ळ is used by Marathi (and rarely by Hindi) and is a strong signal.
    if "ळ" in text:
        marathi += 3
    # Hindi-specific characters/forms.
    if "क़" in text or "ख़" in text or "ज़" in text:
        hindi += 1

    if marathi > hindi:
        confidence = min(0.99, 0.6 + 0.08 * (marathi - hindi))
        return "mr", confidence, "script:devanagari+marathi-markers"
    if hindi > marathi:
        confidence = min(0.99, 0.6 + 0.08 * (hindi - marathi))
        return "hi", confidence, "script:devanagari+hindi-markers"
    return "hi", 0.55, "script:devanagari"


def _detect_romanised(text: str, hint: Optional[str]) -> Tuple[str, float, str]:
    lowered = " " + re.sub(r"[^a-z\s']", " ", text.lower()) + " "
    scores: Dict[str, int] = {}
    for lang, keywords in _ROMAN_KEYWORDS.items():
        score = 0
        for word, weight in keywords.items():
            if re.search(r"(?<![a-z])" + re.escape(word) + r"(?![a-z])", lowered):
                score += weight
        if score:
            scores[lang] = score

    if not scores:
        fallback = normalize_language_code(hint)
        return (fallback if fallback != "auto" else "en"), 0.4, "fallback:hint"

    best = max(scores, key=lambda k: scores[k])
    best_score = scores[best]
    runner_up = max((s for k, s in scores.items() if k != best), default=0)

    # A single weak hit is not enough evidence to override a valid hint.
    hint_code = normalize_language_code(hint)
    if best_score < 4 and runner_up == 0 and hint_code not in ("auto", "en"):
        return hint_code, 0.45, "fallback:hint"
    if best_score < 3:
        return (hint_code if hint_code != "auto" else "en"), 0.4, "fallback:weak"

    margin = best_score - runner_up
    confidence = min(0.98, 0.5 + 0.04 * best_score + 0.03 * margin)
    return best, confidence, "romanised:keywords"


def detect_language(text: Optional[str], hint: Optional[str] = None) -> Tuple[str, float, str]:
    """Detect the language of `text`.

    Returns (language_code, confidence, method). The hint is only a tiebreaker:
    a strong script or keyword signal always wins, so a citizen who speaks
    Tamil while the UI is in Hindi still gets Tamil.
    """
    value = (text or "").strip()
    if not value:
        fallback = normalize_language_code(hint)
        return (fallback if fallback != "auto" else "en"), 0.0, "empty"

    script_scores = _script_scores(value)
    if script_scores:
        script, count = max(script_scores.items(), key=lambda kv: kv[1])
        letters = sum(1 for ch in value if ch.isalpha())
        share = count / max(letters, 1)
        # Ignore a stray character (mixed input, emoji, digits).
        if count >= 2 and (share >= 0.2 or count >= 4):
            if script == "devanagari":
                return _detect_devanagari(value)
            candidates = _SCRIPT_LANGUAGES[script]
            confidence = min(0.99, 0.65 + 0.3 * share)
            return candidates[0], confidence, f"script:{script}"

    return _detect_romanised(value, hint)


def language_name(code: str) -> str:
    names = {
        "en": "English", "hi": "Hindi", "mr": "Marathi", "bn": "Bengali",
        "gu": "Gujarati", "pa": "Punjabi", "ta": "Tamil", "te": "Telugu",
        "kn": "Kannada", "ml": "Malayalam", "ur": "Urdu",
    }
    return names.get(normalize_language_code(code), "English")


def resolve_language(requested: Optional[str], text: Optional[str] = None) -> str:
    """Resolve an explicit request or a spoken sentence into a language code."""
    code = normalize_language_code(requested)
    if code != "auto":
        return code
    detected, _confidence, _method = detect_language(text)
    return detected
