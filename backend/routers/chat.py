import time
import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import ChatRequest, ChatResponse, Citation
from backend.services.emergency_service import check_emergency
from backend.services.cache_service import cache_service
from backend.services.rag_service import rag_service
from backend.models.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    start_time = time.perf_counter()
    user_query = request.message.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
    lang = request.language or "en"
    
    # 1. Emergency safety check
    emergency_info = check_emergency(user_query)
    
    # 2. Cache lookup (exact + semantic) if not force_refresh
    if not request.force_refresh:
        cached_result = cache_service.get_cached_answer(user_query, lang, is_document_query=False)
        if cached_result:
            cached_answer, cached_citations_raw, cache_type = cached_result
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            
            citations = [
                Citation(
                    act=c.get("act", ""),
                    section=c.get("section", ""),
                    title=c.get("title", ""),
                    summary=c.get("summary", "")
                )
                for c in cached_citations_raw
            ]
            
            # Log cached query
            try:
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO chat_logs (session_id, question, answer, language, cached, response_time_ms)
                        VALUES (?, ?, ?, ?, 1, ?)
                    """, (request.session_id, user_query, cached_answer, lang, elapsed_ms))
                    conn.commit()
            except Exception as e:
                logger.warning(f"Error logging chat: {e}")

            return ChatResponse(
                answer=cached_answer,
                language=lang,
                citations=citations,
                is_cached=True,
                cache_type=cache_type,
                emergency=emergency_info,
                response_time_ms=round(elapsed_ms, 2)
            )

    # 3. RAG retrieval & generation
    answer, citations = rag_service.answer_query(user_query, requested_language=lang)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # 4. Save to cache
    citations_dict = [c.model_dump() for c in citations]
    cache_service.store_cached_answer(
        question=user_query,
        language=lang,
        answer=answer,
        citations=citations_dict,
        is_general_knowledge=True,
        is_document_query=False
    )

    # 5. Log chat
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_logs (session_id, question, answer, language, cached, response_time_ms)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (request.session_id, user_query, answer, lang, elapsed_ms))
            conn.commit()
    except Exception as e:
        logger.warning(f"Error logging chat: {e}")

    return ChatResponse(
        answer=answer,
        language=lang,
        citations=citations,
        is_cached=False,
        cache_type=None,
        emergency=emergency_info,
        response_time_ms=round(elapsed_ms, 2)
    )
