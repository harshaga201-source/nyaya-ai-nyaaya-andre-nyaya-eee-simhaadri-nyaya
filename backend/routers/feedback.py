import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import FeedbackRequest
from backend.models.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Feedback"])

@router.post("/feedback")
def submit_feedback(data: FeedbackRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO feedback (rating, category, comment, message_id, is_flagged)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.rating, data.category, data.comment or "",
            data.message_id or "", 1 if data.is_flagged else 0
        ))
        
        # If message_id is linked to chat_logs, update feedback status
        if data.message_id:
            cursor.execute("""
                UPDATE chat_logs
                SET user_feedback = ?
                WHERE id = ? OR session_id = ?
            """, ("thumbs_down" if data.is_flagged or data.rating <= 2 else "thumbs_up", data.message_id, data.message_id))
            
        conn.commit()
        
    return {
        "status": "success",
        "message": "Thank you for your valuable feedback. Your input helps improve NyayaSathi's accuracy."
    }
