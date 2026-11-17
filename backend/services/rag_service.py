import json
import logging
import re
import math
from typing import List, Dict, Any, Tuple
import numpy as np
from backend.config import settings
from backend.models.database import get_db
from backend.models.schemas import Citation
from backend.services.gemini_service import gemini_service
from backend.services.translate import is_indic, translate_to_english
from backend.services.localization import detect_category, get_templates

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are NyayaSathi, a strictly factual and helpful Indian Legal Awareness Assistant.
Your mission is to provide accurate legal information derived directly and exclusively from the provided statutory provisions.

STRICT CONSTRAINTS:
1. Answer ONLY and EXCLUSIVELY using the retrieved legal sections provided in the context below.
2. For EVERY claim, rule, or penalty mentioned, you MUST explicitly cite the statutory provision in the exact format: "[Act Name, Section X]".
3. NEVER invent or hallucinate statutory sections, fines, case names, or legal rules.
4. If the retrieved legal sections do NOT cover the user's specific question, you MUST explicitly state that the topic is not covered in your current statutory database, and recommend consulting a verified advocate or calling the Government of India Tele-Law toll-free helpline at 14454.
5. Statutory Mapping: Always respect the transition to India's new criminal codes:
   - Indian Penal Code (IPC) -> Bharatiya Nyaya Sanhita (BNS)
   - Code of Criminal Procedure (CrPC) -> Bharatiya Nagarik Suraksha Sanhita (BNSS)
   - Indian Evidence Act -> Bharatiya Sakshya Adhiniyam (BSA)
   Mention the old and new sections where relevant so citizens can understand both.
6. Language & Formatting:
   - Reply in the user's requested language ({target_language}).
   - In translated replies, KEEP Act names, section numbers, and legal codes in English inside brackets (e.g. "[Motor Vehicles Act, Section 183]" or "[Bharatiya Nagarik Suraksha Sanhita (BNSS), Section 35]").
   - If the user wrote in a different Indic language, auto-adapt to communicate clearly.
7. Mandatory Disclaimer:
   ALWAYS conclude your response with the exact sentence:
   "Legal information, not legal advice."
"""

def detect_language_simple(text: str) -> str:
    """Lightweight script detector for Indian languages."""
    for char in text:
        cp = ord(char)
        if 0x0900 <= cp <= 0x097F:
            return "hi" # Devanagari (Hindi / Marathi)
        elif 0x0B80 <= cp <= 0x0BFF:
            return "ta" # Tamil
        elif 0x0C00 <= cp <= 0x0C7F:
            return "te" # Telugu
        elif 0x0C80 <= cp <= 0x0CFF:
            return "kn" # Kannada
        elif 0x0D00 <= cp <= 0x0D7F:
            return "ml" # Malayalam
        elif 0x0980 <= cp <= 0x09FF:
            return "bn" # Bengali
        elif 0x0A80 <= cp <= 0x0AFF:
            return "gu" # Gujarati
        elif 0x0A00 <= cp <= 0x0A7F:
            return "pa" # Gurmukhi (Punjabi)
        elif 0x0600 <= cp <= 0x06FF:
            return "ur" # Urdu
    return "en"

LEGAL_EXPANSIONS = [
    (r"\b(?:stopped by police|police stop|vehicle stop|police checking|police check|police interrogation|stop vehicle|stopped by traffic)\b", ["police", "arrest", "warrant", "licence", "notice", "appearance", "grounds", "memo", "35", "130", "36", "47"]),
    (r"\b(?:zero fir|file fir|0 fir|register fir)\b", ["173", "fir", "cognizable", "jurisdiction", "police"]),
    (r"\b(?:arrest(?:ed)? without warrant|warrantless arrest|can police arrest|arrested by police)\b", ["35", "arrest", "warrant", "cognizable", "notice", "appearance", "36", "memo", "47"]),
    (r"\b(?:bail|bailable|anticipatory bail)\b", ["bail", "bailable", "grounds", "notice", "35", "47", "arrest"]),
    (r"\b(?:assault|beaten up|hurt|grievous|marpeet|maar)\b", ["assault", "criminal", "force", "hurt", "74", "75", "115", "women"]),
    (r"\b(?:domestic violence|wife cruelty|husband cruelty|498a|dowry)\b", ["498a", "85", "women", "cruelty", "husband", "stridhan"]),
    (r"\b(?:woman|women|female|sunset|sunrise)\b", ["43", "women", "sunset", "sunrise", "safeguards", "female"]),
    (r"\b(?:helmet|protective headgear)\b", ["194d", "129", "helmet", "headgear", "motor", "vehicles"]),
    (r"\b(?:who is (?:a |an )?consumer|definition of consumer|what is (?:a )?consumer|consumer definition|considered (?:a )?consumer)\b", ["definition", "person", "consideration", "buys", "goods", "service"]),
    (r"\b(?:refund|defective (?:product|goods)|warranty|return policy|store refuse)\b", ["consumer", "protection", "defect", "defective", "refund", "unfair", "trade", "practice", "35"]),
    (r"\b(?:seatbelt|safety belt)\b", ["194b", "seatbelt", "safety", "belt"]),
    (r"\b(?:speed|overspeeding|speeding)\b", ["183", "112", "speed", "excessive"]),
    (r"\b(?:drink and drive|drunk|alcohol|breath analyzer)\b", ["185", "drunk", "drunken", "breath"]),
    (r"\b(?:without licence|no licence|driving licence)\b", ["181", "130", "licence", "driving"]),
    (r"\b(?:accident|hit and run|motor accident|road accident)\b", ["motor", "vehicles", "insurance", "196", "146", "traffic"]),
    (r"\b(?:insured|insurance claim|insurers?|third[- ]party insurance|compensation claim)\b", ["insurance", "196", "146", "uninsured", "third-party"]),
    (r"\b(?:insurance|uninsured)\b", ["196", "uninsured", "insurance", "third-party"]),
    (r"\b(?:virtual court|online challan|lok adalat)\b", ["208", "virtual", "court", "summary", "challan"]),
    (r"\b(?:free legal aid|tele[- ]?law|helpline)\b", ["12", "legal", "services", "tele-law", "14454"]),
    (r"\b(?:lockup|torture|beaten|custodial)\b", ["53", "medical", "examination", "22", "confession", "36", "memo"]),
    (r"\b(?:cheating|fraud|scam)\b", ["318", "420", "cheating", "fraud", "property"]),
    (r"\b(?:theft|stolen)\b", ["303", "378", "theft", "stolen"]),
    (r"\b(?:rti|right to information|pio)\b", ["3", "6", "7", "8", "19", "20", "information", "timeline", "pio"])
]

# High-frequency English function words and legal-meta terms carry no topical
# signal: "the Motor Vehicles Act" matches every statute title ("act"), and
# "Section 12" matches every chunk. Removing them stops generic overlap from
# dragging unrelated sections into the results.
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "nor", "of", "to", "in", "on", "for",
    "with", "by", "at", "from", "into", "over", "under", "between", "through",
    "during", "before", "after", "about", "above", "below", "up", "down", "out",
    "off", "again", "once", "here", "there", "when", "where", "why", "how",
    "what", "which", "who", "whom", "whose", "this", "that", "these", "those",
    "i", "me", "my", "we", "us", "our", "you", "your", "he", "she", "it", "its",
    "they", "them", "their", "his", "her", "him", "am", "is", "are", "was",
    "were", "be", "been", "being", "do", "does", "did", "done", "doing",
    "can", "could", "shall", "should", "will", "would", "may", "might", "must",
    "have", "has", "had", "having", "not", "no", "if", "then", "than", "so",
    "as", "more", "most", "some", "such", "only", "own", "same", "any", "each",
    "all", "every", "both", "few", "other", "its", "also",
    # legal-meta words that match every statute without adding topic
    "act", "acts", "law", "laws", "legal", "section", "sections", "right",
    "rights", "offence", "offences", "offense", "offenses", "civil", "criminal",
    "india", "indian", "statute", "provision", "provisions",
    # conversational filler
    "please", "tell", "told", "explain", "describe", "want", "wanted", "wants",
    "need", "know", "help", "question", "asking", "asked", "give", "get",
    "got", "make", "made", "much", "many", "good", "best", "guide", "answer",
    "detail", "details", "information", "file", "files", "filed", "filing",
    "apply", "applied", "application", "complaint", "complaints", "case",
    "cases", "matter", "court", "courts", "legal proceedings",
    # penalties/sentences match every criminal section without telling us which
    "punishment", "penalty", "penalties", "fine", "fines", "imprisonment",
    "sentence", "sentences", "conviction", "sentenced", "years", "months",
}

YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
WORD_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> set[str]:
    # Normalize common compound terms and expand legal semantics
    normalized = text.lower().replace("seatbelt", "seat belt safety belt").replace("challans", "challan")
    # Drop bare years (1988, 2019, 2023): they match every amended act title.
    normalized = YEAR_RE.sub(" ", normalized)
    words = WORD_RE.findall(normalized)
    tokens = {w for w in words if len(w) > 2 and w not in STOPWORDS}
    for pattern, extra in LEGAL_EXPANSIONS:
        if re.search(pattern, normalized):
            tokens.update(extra)
    return tokens


# Intent families. The engine must not hand a citizen criminal statutes for a
# consumer complaint, or MVA rules for an RTI question, just because the words
# "phone"/"case"/"section" appear somewhere. When exactly one family matches,
# evidence outside that family is discarded.
INTENT_PATTERNS = {
    "traffic": re.compile(
        r"\b(?:helmet|seatbelt|safety belt|traffic|challan|challans|speed|overspeed|"
        r"license|licence|driving|driver|vehicle|bike|scooter|motorcycle|car|motor|"
        r"puc|pollution|e-?challan|accident|crash|hit and run|parking|drunk|drunken|"
        r"alcohol|red light|signal|over speed|insurance policy|highway|red light jumping)\b"
    ),
    "consumer": re.compile(
        r"\b(?:consumer|refund|defective|warranty|guarantee|unfair trade|seller|"
        r"e-?daakhil|invoice|bought|purchased|purchase|purchases|deliver|delivery|"
        r"shop|store|e-?commerce)\b"
    ),
    "rti": re.compile(r"\b(?:rti|right to information|cpio|first appeal|pio)\b"),
    "criminal": re.compile(
        r"\b(?:police|arrest|bail|fir|cognizable|warrant|custody|lockup|lock-up|"
        r"interrogation|theft|stolen|cheating|fraud|conspiracy|assault|attack|murder|"
        r"hurt|grievous|domestic violence|498a|dowry|kidnapping|rape|pocso|trespass|"
        r"criminal intimidation|criminal breach of trust)\b"
    ),
    "lsa": re.compile(r"\b(?:legal aid|nalsa|tele-?law|14454)\b"),
}

ACT_FAMILY_FRAGMENTS = (
    ("traffic", "Motor Vehicles Act"),
    ("consumer", "Consumer Protection Act"),
    ("rti", "Right to Information Act"),
    ("criminal", "BNS"),
    ("criminal", "BNSS"),
    ("criminal", "BSA"),
    ("lsa", "Legal Services Authorities Act"),
)


def detect_intent_families(text: str):
    families = set()
    for family, pattern in INTENT_PATTERNS.items():
        if pattern.search(text):
            families.add(family)
    return families


def chunk_family(act_name: str) -> str:
    for family, fragment in ACT_FAMILY_FRAGMENTS:
        if fragment in act_name:
            return family
    return "other"


# A candidate only survives when the query shows real topical overlap with
# the chunk. Without this gate every question (even off-topic ones) retrieved
# the "best of five" chunks and the answer presented them as if they applied.
MIN_KEYWORD_MATCHES = 2


class RAGService:
    def retrieve_top_chunks(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve top k legal chunks using Hybrid Search (Cosine Embedding + Lexical BM25 Overlap)."""
        # The legal corpus is in English. Bridge an Indic query with an English
        # translation so lexical overlap and the hashed fallback embedding both
        # match the statute text (ignored silently when translation is unavailable).
        en_query = translate_to_english(query) if is_indic(query) else ""
        retrieval_text = f"{query} {en_query}".strip() if en_query else query
        query_vec = np.array(gemini_service.get_embedding(retrieval_text), dtype=np.float32)
        norm_q = np.linalg.norm(query_vec)
        q_tokens = tokenize(retrieval_text)
        families = detect_intent_families(retrieval_text)

        # Extract explicit section mentions if any (e.g. "section 184", "41A")
        sec_mentions = re.findall(r"(?:section|sec\.?|धारा|धारा)\s*(\d+[a-z]?)", retrieval_text.lower())

        candidates = []
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, doc_name, act_name, section_number, title, content, embedding FROM legal_chunks")
            rows = cursor.fetchall()

            for r in rows:
                content_text = f"{r['act_name']} {r['section_number']} {r['title']} {r['content']}".lower()

                # 1. Cosine similarity
                cosine_sim = 0.0
                if norm_q > 0:
                    chunk_vec = np.array(json.loads(r["embedding"]), dtype=np.float32)
                    norm_c = np.linalg.norm(chunk_vec)
                    if norm_c > 0:
                        cosine_sim = float(np.dot(query_vec, chunk_vec) / (norm_q * norm_c))

                # 2. Lexical keyword overlap score
                chunk_tokens = tokenize(content_text)
                overlap = q_tokens.intersection(chunk_tokens)
                match_count = len(overlap)
                lexical_score = (match_count / (len(q_tokens) + 1e-5)) if q_tokens else 0.0

                # 3. Direct statutory section boost
                section_boost = 0.0
                chunk_sec_lower = r['section_number'].lower()
                for s in sec_mentions:
                    if s in chunk_sec_lower:
                        section_boost += 1.0

                # 4. Intent-family filter: never hand a citizen the wrong statute
                # family for the question they actually asked.
                if families and section_boost <= 0:
                    family = chunk_family(r["act_name"])
                    if family != "other" and family not in families:
                        continue

                # 5. Relevance gate: do not present laws the query does not touch.
                if section_boost > 0:
                    pass
                elif len(q_tokens) <= 1:
                    # Single-topic query: a single textual hit is enough, because
                    # the word itself carries the topic (e.g. "helmet", "murder").
                    if match_count < 1:
                        continue
                elif match_count < MIN_KEYWORD_MATCHES:
                    continue

                # Combined Hybrid Score
                total_score = (0.45 * cosine_sim) + (0.55 * lexical_score) + section_boost

                candidates.append({
                    "id": r["id"],
                    "act_name": r["act_name"],
                    "section_number": r["section_number"],
                    "title": r["title"],
                    "content": r["content"],
                    "score": total_score
                })

        # Rank descending
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates[:top_k]

    def answer_query(self, query: str, requested_language: str = "en") -> Tuple[str, List[Citation]]:
        """Retrieve context and generate legally constrained answer."""
        detected_lang = detect_language_simple(query)
        target_lang = requested_language if requested_language and requested_language != "en" else (detected_lang if detected_lang != "en" else "en")
        target_lang_name = settings.LANGUAGE_NAMES.get(target_lang, "English")

        # The legal corpus is in English, so an Indic query needs an English
        # bridge for lexical/embedding retrieval (added inside retrieve_top_chunks).
        en_query = translate_to_english(query) if is_indic(query) else ""
        category = detect_category(f"{query} {en_query}")

        # 1. Retrieve top 5 chunks
        top_chunks = self.retrieve_top_chunks(query, top_k=settings.TOP_K_CHUNKS)

        citations: List[Citation] = []
        context_parts = []

        # 1b. Nothing relevant survived the grounding gate. Answer honestly
        # instead of inventing/invoking unrelated statutes.
        if not top_chunks:
            templates = get_templates(target_lang)
            return str(templates["no_sources"]), citations

        for idx, chunk in enumerate(top_chunks):
            context_parts.append(
                f"[Source {idx+1}]: {chunk['act_name']} - {chunk['section_number']}: {chunk['title']}\n{chunk['content']}"
            )
            citations.append(Citation(
                act=chunk["act_name"],
                section=chunk["section_number"],
                title=chunk.get("title", ""),
                summary=chunk["content"][:160] + "..."
            ))

        formatted_context = "\n\n".join(context_parts)
        
        prompt = f"""
USER QUESTION: {query}
SEARCH QUERY (English translation for retrieval): {en_query or query}
REQUESTED LANGUAGE: {target_lang_name} ({target_lang})

RETRIEVED LEGAL SECTIONS:
{formatted_context}

Provide a clear, helpful explanation answering the user's question directly.
Rules:
1. Cite the specific act and section for every legal point using [Act, Section X].
2. If none of the retrieved sections cover this question, state clearly that it is not covered and direct the user to consult a lawyer or call Tele-Law (14454).
3. If old criminal codes (IPC, CrPC, Evidence Act) are relevant, note their replacement by BNS, BNSS, and BSA.
4. Conclude with: "Legal information, not legal advice."
"""
        system_instruction = SYSTEM_PROMPT.format(target_language=f"{target_lang_name} ({target_lang})")
        answer = gemini_service.generate_text(prompt, system_instruction=system_instruction)

        # Enforce mandatory disclaimer
        if "Legal information, not legal advice" not in answer:
            answer = f"{answer.strip()}\n\nLegal information, not legal advice."

        return answer, citations

rag_service = RAGService()
