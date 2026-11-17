import json
import sqlite3
import uuid
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from backend.models.database import get_db
from backend.models.schemas import (
    LawyerConsultRequest,
    LawyerItem,
    LawyerLocationSuggestion,
    LawyerRegisterRequest,
)
from backend.services.lawyer_directory import (
    build_location_suggestions,
    location_match_score,
    match_location,
    matches_language,
    matches_practice_area,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Lawyers"])


def _parse_languages(raw: Any) -> List[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(item) for item in raw if str(item).strip()]
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return [str(item) for item in parsed if str(item).strip()] if isinstance(parsed, list) else []


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    record = dict(row)
    record["languages"] = _parse_languages(record.get("languages"))
    return record


def _verified_rows(cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
    cursor.execute("SELECT * FROM lawyers WHERE status = 'verified'")
    return [_row_to_dict(row) for row in cursor.fetchall()]


def _to_lawyer_item(record: Dict[str, Any]) -> LawyerItem:
    return LawyerItem(
        id=record["id"],
        name=record["name"],
        city=record["city"],
        state=record["state"],
        area=record.get("area") or "",
        pincode=record.get("pincode") or "",
        address=record.get("address") or "",
        court=record.get("court") or "",
        languages=record.get("languages") or [],
        practice_area=record["practice_area"],
        years_experience=record["years_experience"],
        bar_council_no=record["bar_council_no"],
        phone=record.get("phone"),
        email=record.get("email"),
        status=record.get("status") or "verified",
        is_sample=bool(record.get("is_sample")),
    )


@router.get("/lawyers", response_model=List[LawyerItem])
def list_lawyers(
    location: Optional[str] = Query(None, description="City, area/locality, state or PIN code"),
    city: Optional[str] = Query(None, description="Legacy alias for location"),
    state: Optional[str] = Query(None, description="Filter by state"),
    area: Optional[str] = Query(None, description="Filter by locality/area"),
    language: Optional[str] = Query(None, description="Filter by spoken language"),
    practice_area: Optional[str] = Query(None, description="Filter by practice area"),
):
    location_parts = [
        part.strip()
        for part in (location, area, city, state)
        if isinstance(part, str) and part.strip()
    ]
    location_query = ", ".join(location_parts)
    language_query = language.strip() if isinstance(language, str) else ""
    practice_query = practice_area.strip() if isinstance(practice_area, str) else ""

    with get_db() as conn:
        records = _verified_rows(conn.cursor())

    matched = []
    for record in records:
        if location_query and not match_location(record, location_query):
            continue
        if practice_query and not matches_practice_area(record["practice_area"], practice_query):
            continue
        if language_query and not matches_language(record["languages"], language_query):
            continue
        matched.append(record)

    if location_query:
        matched.sort(
            key=lambda record: (
                -location_match_score(record, location_query),
                record["city"],
                record["name"],
            )
        )
    else:
        matched.sort(key=lambda record: (record["city"], record["name"]))

    return [_to_lawyer_item(record) for record in matched]


@router.get("/lawyers/locations", response_model=List[LawyerLocationSuggestion])
def list_lawyer_locations(
    q: str = Query("", max_length=80, description="Partial city, area or state name"),
    limit: int = Query(8, ge=1, le=20),
):
    q_value = q if isinstance(q, str) else ""
    limit_value = limit if isinstance(limit, int) else 8
    with get_db() as conn:
        records = _verified_rows(conn.cursor())
    suggestions = build_location_suggestions(records, q_value, limit_value)
    return [LawyerLocationSuggestion(**item) for item in suggestions]


@router.get("/lawyers/{lawyer_id}", response_model=LawyerItem)
def get_lawyer(lawyer_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM lawyers WHERE id = ? AND status = 'verified'",
            (lawyer_id,),
        )
        row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Verified advocate profile not found.")
    return _to_lawyer_item(_row_to_dict(row))


@router.post("/lawyers/register")
def register_lawyer(data: LawyerRegisterRequest):
    new_id = f"lawyer-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM lawyers WHERE bar_council_no = ? COLLATE NOCASE",
            (data.bar_council_no,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=409,
                detail="An advocate application with this Bar Council number already exists.",
            )
        try:
            cursor.execute(
                """
                INSERT INTO lawyers (
                    id, name, city, state, area, pincode, address, court,
                    languages, practice_area, years_experience, bar_council_no,
                    phone, email, status, is_sample
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', 0)
                """,
                (
                    new_id,
                    data.name,
                    data.city,
                    data.state,
                    data.area,
                    data.pincode,
                    data.address,
                    data.court,
                    json.dumps(data.languages),
                    data.practice_area,
                    data.years_experience,
                    data.bar_council_no,
                    data.phone,
                    data.email,
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status_code=409,
                detail="An advocate application with this Bar Council number already exists.",
            ) from exc
        conn.commit()

    logger.info("Lawyer registration queued for verification: %s (%s)", data.name, new_id)
    return {
        "status": "success",
        "message": (
            "Lawyer registration submitted successfully. Your profile is currently "
            "pending Bar Council verification and will not appear in the public "
            "directory until it is verified."
        ),
        "id": new_id,
    }


@router.post("/lawyers/request")
def request_lawyer_consult(data: LawyerConsultRequest):
    if not data.consent_given:
        raise HTTPException(
            status_code=400,
            detail="User consent is required to share information with the advocate.",
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM lawyers WHERE id = ? AND status = 'verified'",
            (data.lawyer_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="This advocate is not available in the verified directory.",
            )
        cursor.execute(
            """
            INSERT INTO lawyer_requests (
                lawyer_id, user_name, user_phone, user_email, issue_summary, consent_given
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                data.lawyer_id,
                data.user_name,
                data.user_phone,
                data.user_email,
                data.issue_summary,
                1 if data.consent_given else 0,
            ),
        )
        conn.commit()

    return {
        "status": "success",
        "message": (
            "Your consultation request has been safely queued. The advocate's "
            "chamber will contact you within 24-48 business hours."
        ),
    }
