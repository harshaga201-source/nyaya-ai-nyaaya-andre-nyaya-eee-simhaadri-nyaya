import re
import json
import logging
from typing import Optional, Tuple, List, Dict, Any
import numpy as np
from backend.config import settings
from backend.models.database import get_db
from backend.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

# Bumped whenever the answer engine / retrieval strategy changes, so stale
# cached answers cannot resurface after an upgrade.
CACHE_SCHEMA_VERSION = "v2"

def normalize_query(text: str, lang: str) -> str:
    """Normalize query text for exact cache key matching."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return f"{CACHE_SCHEMA_VERSION}::{lang.lower()}::{cleaned}"

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    a = np.array(vec1, dtype=np.float32)
    b = np.array(vec2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

class CacheService:
    def __init__(self):
        # In-memory fast layer mirrors SQLite
        self.exact_memory: Dict[str, Dict[str, Any]] = {}

    def get_cached_answer(
        self,
        question: str,
        language: str,
        is_document_query: bool = False
    ) -> Optional[Tuple[str, List[Dict[str, Any]], str]]:
        """
        Check for cached response.
        Returns: (answer, citations, cache_type) or None
        """
        # Never cache personal document queries as requested
        if is_document_query:
            return None

        cache_key = normalize_query(question, language)

        # 1. Exact match in memory
        if cache_key in self.exact_memory:
            entry = self.exact_memory[cache_key]
            self._increment_hit(cache_key)
            return entry["answer"], entry["citations"], "exact"

        # 2. Exact match in SQLite
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT answer, citations, embedding FROM query_cache WHERE cache_key = ?",
                (cache_key,)
            )
            row = cursor.fetchone()
            if row:
                citations = json.loads(row["citations"])
                self.exact_memory[cache_key] = {
                    "answer": row["answer"],
                    "citations": citations
                }
                self._increment_hit(cache_key)
                return row["answer"], citations, "exact"

        # 3. Semantic cache (similarity >= 0.92) for general-knowledge questions
        query_embedding = gemini_service.get_embedding(question)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT cache_key, answer, citations, embedding FROM query_cache WHERE language = ? AND is_general_knowledge = 1",
                (language.lower(),)
            )
            rows = cursor.fetchall()
            for r in rows:
                if not r["embedding"]:
                    continue
                cached_vec = json.loads(r["embedding"])
                similarity = cosine_similarity(query_embedding, cached_vec)
                if similarity >= settings.SEMANTIC_CACHE_SIMILARITY_THRESHOLD:
                    logger.info(f"Semantic cache HIT (similarity={similarity:.4f} >= {settings.SEMANTIC_CACHE_SIMILARITY_THRESHOLD})")
                    citations = json.loads(r["citations"])
                    self._increment_hit(r["cache_key"])
                    return r["answer"], citations, "semantic"

        return None

    def store_cached_answer(
        self,
        question: str,
        language: str,
        answer: str,
        citations: List[Dict[str, Any]],
        is_general_knowledge: bool = True,
        is_document_query: bool = False
    ):
        """Store generated answer in exact and semantic cache."""
        if is_document_query:
            return

        cache_key = normalize_query(question, language)
        self.exact_memory[cache_key] = {
            "answer": answer,
            "citations": citations
        }

        query_embedding = gemini_service.get_embedding(question) if is_general_knowledge else None

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO query_cache
                (cache_key, question, language, answer, citations, is_general_knowledge, embedding, hit_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                cache_key,
                question,
                language.lower(),
                answer,
                json.dumps(citations),
                1 if is_general_knowledge else 0,
                json.dumps(query_embedding) if query_embedding else None
            ))
            conn.commit()

    def _increment_hit(self, cache_key: str):
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE query_cache SET hit_count = hit_count + 1 WHERE cache_key = ?",
                    (cache_key,)
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not increment hit count: {e}")

cache_service = CacheService()
