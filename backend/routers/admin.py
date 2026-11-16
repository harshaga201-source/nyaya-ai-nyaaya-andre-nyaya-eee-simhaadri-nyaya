import logging
from typing import List, Dict, Any
from fastapi import APIRouter
from backend.models.schemas import AdminStatsResponse
from backend.models.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin"])

@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Total queries & cached queries
        cursor.execute("SELECT COUNT(*) as total, SUM(cached) as cached_cnt, AVG(response_time_ms) as avg_time FROM chat_logs")
        chat_stats = cursor.fetchone()
        total_queries = chat_stats["total"] or 0
        cached_count = chat_stats["cached_cnt"] or 0
        avg_resp_time = round(chat_stats["avg_time"] or 0.0, 2)
        
        cache_hit_rate = round((cached_count / total_queries * 100.0), 2) if total_queries > 0 else 0.0
        
        # Feedback stats
        cursor.execute("SELECT COUNT(*) as total, AVG(rating) as avg_rating, SUM(is_flagged) as flagged_cnt FROM feedback")
        fb_stats = cursor.fetchone()
        total_fb = fb_stats["total"] or 0
        avg_rating = round(fb_stats["avg_rating"] or 0.0, 2)
        flagged_count = fb_stats["flagged_cnt"] or 0
        
        # Lawyers counts
        cursor.execute("SELECT COUNT(*) as verified FROM lawyers WHERE status = 'verified'")
        verified_lawyers = cursor.fetchone()["verified"]
        
        cursor.execute("SELECT COUNT(*) as pending FROM lawyers WHERE status = 'pending_verification'")
        pending_lawyers = cursor.fetchone()["pending"]
        
        return AdminStatsResponse(
            total_queries=total_queries,
            cache_hit_rate_percent=cache_hit_rate,
            avg_response_time_ms=avg_resp_time,
            total_feedback=total_fb,
            avg_rating=avg_rating,
            flagged_count=flagged_count,
            verified_lawyers_count=verified_lawyers,
            pending_lawyers_count=pending_lawyers
        )

@router.get("/admin/feedback")
async def get_all_feedback():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM feedback ORDER BY id DESC LIMIT 50")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.get("/admin/logs")
async def get_chat_logs():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chat_logs ORDER BY id DESC LIMIT 50")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
