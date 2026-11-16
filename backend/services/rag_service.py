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
    (r"\b(?:arrest(?:ed)? without warrant|warrantless arrest|can police arrest)\b", ["35", "arrest", "warrant", "cognizable", "notice", "appearance", "36", "memo", "47"]),
    (r"\b(?:woman|women|female|sunset|sunrise)\b", ["43", "women", "sunset", "sunrise", "safeguards", "female"]),
    (r"\b(?:helmet|protective headgear)\b", ["194d", "129", "helmet", "headgear", "motor", "vehicles"]),
    (r"\b(?:refund|defective (?:product|goods)|warranty|return policy|store refuse)\b", ["consumer", "protection", "defect", "defective", "refund", "unfair", "trade", "practice", "35"]),
    (r"\b(?:seatbelt|safety belt)\b", ["194b", "seatbelt", "safety", "belt"]),
    (r"\b(?:speed|overspeeding|speeding)\b", ["183", "112", "speed", "excessive"]),
    (r"\b(?:drink and drive|drunk|alcohol|breath analyzer)\b", ["185", "drunk", "drunken", "breath"]),
    (r"\b(?:without licence|no licence|driving licence)\b", ["181", "130", "licence", "driving"]),
    (r"\b(?:insurance|uninsured)\b", ["196", "uninsured", "insurance", "third-party"]),
    (r"\b(?:virtual court|online challan|lok adalat)\b", ["208", "virtual", "court", "summary", "challan"]),
    (r"\b(?:free legal aid|tele[- ]?law|helpline)\b", ["12", "legal", "services", "tele-law", "14454"]),
    (r"\b(?:lockup|torture|beaten|custodial)\b", ["53", "medical", "examination", "22", "confession", "36", "memo"]),
    (r"\b(?:cheating|fraud|scam)\b", ["318", "420", "cheating", "fraud", "property"]),
    (r"\b(?:theft|stolen)\b", ["303", "378", "theft", "stolen"]),
    (r"\b(?:rti|right to information|pio)\b", ["3", "6", "7", "8", "19", "20", "information", "timeline", "pio"])
]

def tokenize(text: str) -> set[str]:
    # Normalize common compound terms and expand legal semantics
    normalized = text.lower().replace("seatbelt", "seat belt safety belt").replace("challans", "challan")
    words = re.findall(r"\w+", normalized)
    tokens = {w for w in words if len(w) > 2}
    for pattern, extra in LEGAL_EXPANSIONS:
        if re.search(pattern, normalized):
            tokens.update(extra)
    return tokens

class RAGService:
    def retrieve_top_chunks(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve top k legal chunks using Hybrid Search (Cosine Embedding + Lexical BM25 Overlap)."""
        query_vec = np.array(gemini_service.get_embedding(query), dtype=np.float32)
        norm_q = np.linalg.norm(query_vec)
        q_tokens = tokenize(query)

        # Extract explicit section mentions if any (e.g. "section 184", "41A")
        sec_mentions = re.findall(r"(?:section|sec\.?|धारा)\s*(\d+[a-z]?)", query.lower())

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
                overlap = len(q_tokens.intersection(chunk_tokens))
                lexical_score = (overlap / (len(q_tokens) + 1e-5)) if q_tokens else 0.0

                # 3. Direct statutory section boost
                section_boost = 0.0
                chunk_sec_lower = r['section_number'].lower()
                for s in sec_mentions:
                    if s in chunk_sec_lower:
                        section_boost += 1.0

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

        # 1. Retrieve top 5 chunks
        top_chunks = self.retrieve_top_chunks(query, top_k=settings.TOP_K_CHUNKS)

        citations: List[Citation] = []
        context_parts = []
        
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
