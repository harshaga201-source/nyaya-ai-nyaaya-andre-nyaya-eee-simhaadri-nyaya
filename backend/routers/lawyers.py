import json
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from backend.models.schemas import LawyerItem, LawyerRegisterRequest, LawyerConsultRequest
from backend.models.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Lawyers"])

@router.get("/lawyers", response_model=List[LawyerItem])
def list_lawyers(
    city: Optional[str] = Query(None, description="Filter by city"),
    language: Optional[str] = Query(None, description="Filter by spoken language"),
    practice_area: Optional[str] = Query(None, description="Filter by practice area")
):
    city_val = city if isinstance(city, str) else None
    lang_val = language if isinstance(language, str) else None
    area_val = practice_area if isinstance(practice_area, str) else None

    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM lawyers WHERE 1=1"
        params = []
        
        if city_val and city_val.strip():
            query += " AND LOWER(city) = ?"
            params.append(city_val.strip().lower())
            
        if area_val and area_val.strip():
            query += " AND LOWER(practice_area) LIKE ?"
            params.append(f"%{area_val.strip().lower()}%")
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            langs = json.loads(r["languages"]) if r["languages"] else []
            if lang_val and lang_val.strip():
                if not any(lang_val.lower() in l.lower() for l in langs):
                    continue
            results.append(LawyerItem(
                id=r["id"],
                name=r["name"],
                city=r["city"],
                state=r["state"],
                languages=langs,
                practice_area=r["practice_area"],
                years_experience=r["years_experience"],
                bar_council_no=r["bar_council_no"],
                phone=r["phone"],
                email=r["email"],
                status=r["status"],
                is_sample=bool(r["is_sample"])
            ))
        return results

@router.post("/lawyers/register")
def register_lawyer(data: LawyerRegisterRequest):
    new_id = f"lawyer-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lawyers (
                id, name, city, state, languages, practice_area,
                years_experience, bar_council_no, phone, email, status, is_sample
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', 0)
        """, (
            new_id, data.name, data.city, data.state,
            json.dumps(data.languages), data.practice_area,
            data.years_experience, data.bar_council_no,
            data.phone, data.email
        ))
        conn.commit()
        
    return {
        "status": "success",
        "message": "Lawyer registration submitted successfully. Your profile is currently pending Bar Council verification.",
        "id": new_id
    }

@router.post("/lawyers/request")
def request_lawyer_consult(data: LawyerConsultRequest):
    if not data.consent_given:
        raise HTTPException(status_code=400, detail="User consent is required to share information with the advocate.")
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lawyer_requests (
                lawyer_id, user_name, user_phone, user_email, issue_summary, consent_given
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data.lawyer_id, data.user_name, data.user_phone,
            data.user_email, data.issue_summary, 1 if data.consent_given else 0
        ))
        conn.commit()
        
    return {
        "status": "success",
        "message": "Your consultation request has been safely queued. The advocate's chamber will contact you within 24-48 business hours."
    }
