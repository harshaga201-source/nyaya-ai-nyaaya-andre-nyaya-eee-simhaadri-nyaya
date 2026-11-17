import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

from backend.services.language_names import canonical_language_name

BAR_COUNCIL_RE = re.compile(r"^[A-Z]{1,4}/\d{1,6}/\d{4}$")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def _normalize_indian_phone(value: str) -> str:
    """Return a canonical +91 XXXXX XXXXX mobile number or raise ValueError."""
    if not isinstance(value, str):
        raise ValueError("Phone number must be text.")
    digits = re.sub(r"\D", "", value)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number (starting 6-9).")
    return f"+91 {digits[:5]} {digits[5:]}"

class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or legal question")
    language: str = Field("en", description="Target language code (e.g. en, hi, ta, te)")
    session_id: Optional[str] = None
    force_refresh: bool = False

class Citation(BaseModel):
    act: str
    section: str
    title: Optional[str] = None
    summary: Optional[str] = None

class EmergencyInfo(BaseModel):
    is_emergency: bool = False
    category: Optional[str] = None
    helplines: List[Dict[str, str]] = []
    advisory: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    language: str
    citations: List[Citation] = []
    is_cached: bool = False
    cache_type: Optional[str] = None # 'exact' or 'semantic'
    emergency: Optional[EmergencyInfo] = None
    response_time_ms: float = 0.0
    disclaimer: str = "Legal information, not legal advice."

class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    confidence: Optional[float] = 1.0
    engine: Optional[str] = None
    auto_detected: bool = False
    method: Optional[str] = None


class LanguageDetectRequest(BaseModel):
    text: str = Field(..., description="Spoken transcript or typed legal question")
    hint: Optional[str] = Field(None, description="Fallback language code when the text is ambiguous")


class LanguageDetectResponse(BaseModel):
    language: str
    language_name: str
    confidence: float
    method: str

class DocumentAnalysisResponse(BaseModel):
    document_type: str
    parties: List[str] = []
    key_dates_and_amounts: List[str] = []
    sections_cited: List[str] = []
    plain_meaning: str
    action_items_and_deadlines: List[str] = []
    language: str
    disclaimer: str = "Legal information, not legal advice."

class TrafficDisputeRequest(BaseModel):
    challan_number: str
    date: str
    place: str
    vehicle_type: str
    violation_charged: str
    section_charged: str
    fine_amount: Optional[str] = "Verify on official portal"
    dispute_reason: str # wrong vehicle, wrong section, wrong amount, signal/camera fault, valid documents, already paid, other
    custom_explanation: Optional[str] = None
    language: str = "en"

class TrafficDisputeResponse(BaseModel):
    section_matches: bool
    section_analysis: str
    options: List[Dict[str, str]] # e.g. Virtual Court, Traffic Court, Lok Adalat, Payment
    draft_contest_letter_target_lang: str
    draft_contest_letter_english: str
    submission_steps: List[str]
    official_portal_url: str = "https://echallan.parivahan.gov.in"
    disclaimer: str = "Legal information, not legal advice. Do not state fine unless verified on the official portal."

class ComplaintDraftRequest(BaseModel):
    complaint_type: str # police_fir, consumer_dispute, cyber_crime, rti_application
    complainant_name: str
    complainant_contact: str
    complainant_address: str
    opposite_party: str
    date_of_incident: str
    place_of_incident: str
    incident_details: str
    relief_sought: str
    language: str = "en"

class ComplaintDraftResponse(BaseModel):
    complaint_type: str
    title: str
    formatted_draft: str
    sections_cited: List[str]
    target_authority: str
    language: str
    banner_warning: str = "Review with a lawyer before filing."
    disclaimer: str = "Legal information, not legal advice."

class LawyerItem(BaseModel):
    id: str
    name: str
    city: str
    state: str
    area: str = ""
    pincode: str = ""
    address: str = ""
    court: str = ""
    languages: List[str]
    practice_area: str
    years_experience: int
    bar_council_no: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = "verified"
    is_sample: bool = True

class LawyerLocationSuggestion(BaseModel):
    label: str
    value: str
    type: str
    city: str = ""
    state: str = ""

class LawyerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    city: str = Field(..., min_length=2, max_length=80)
    state: str = Field(..., min_length=2, max_length=80)
    area: str = Field("", max_length=120)
    pincode: str = Field("", max_length=6)
    address: str = Field("", max_length=240)
    court: str = Field("", max_length=160)
    languages: List[str] = Field(..., min_length=1, max_length=8)
    practice_area: str = Field(..., min_length=3, max_length=160)
    years_experience: int = Field(..., ge=0, le=60)
    bar_council_no: str = Field(..., min_length=8, max_length=24)
    phone: str
    email: str

    @field_validator("name", "city", "state", "area", "pincode", "address", "court", "practice_area", "bar_council_no", mode="before")
    @classmethod
    def _strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("bar_council_no")
    @classmethod
    def _validate_bar_council_no(cls, value: str) -> str:
        normalized = re.sub(r"\s+", "", value).upper()
        if not BAR_COUNCIL_RE.fullmatch(normalized):
            raise ValueError("Bar Council number must look like D/1234/2015 or KAR/567/2018.")
        year = int(normalized.rsplit("/", 1)[1])
        if year < 1950 or year > datetime.now().year:
            raise ValueError("Bar Council enrolment year is out of range.")
        return normalized

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize_indian_phone(value)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_RE.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator("pincode")
    @classmethod
    def _validate_pincode(cls, value: str) -> str:
        value = value.strip()
        if value and not re.fullmatch(r"\d{6}", value):
            raise ValueError("PIN code must be exactly 6 digits.")
        return value

    @field_validator("languages")
    @classmethod
    def _validate_languages(cls, values: List[str]) -> List[str]:
        cleaned: List[str] = []
        seen = set()
        for item in values:
            language = canonical_language_name((item or "").strip())
            if not language:
                continue
            if len(language) < 2 or len(language) > 40:
                raise ValueError("Each language name must be 2-40 characters.")
            key = language.casefold()
            if key not in seen:
                seen.add(key)
                cleaned.append(language)
        if not cleaned:
            raise ValueError("Add at least one spoken language.")
        return cleaned

class LawyerConsultRequest(BaseModel):
    lawyer_id: str
    user_name: str = Field(..., min_length=2, max_length=120)
    user_phone: str
    user_email: Optional[str] = None
    issue_summary: str = Field(..., min_length=10, max_length=2000)
    consent_given: bool

    @field_validator("user_name", "issue_summary", mode="before")
    @classmethod
    def _strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("user_phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize_indian_phone(value)

    @field_validator("user_email")
    @classmethod
    def _validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not normalized:
            return None
        if not EMAIL_RE.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    category: str
    comment: Optional[str] = None
    message_id: Optional[str] = None
    is_flagged: Optional[bool] = False

class AdminStatsResponse(BaseModel):
    total_queries: int
    cache_hit_rate_percent: float
    avg_response_time_ms: float
    total_feedback: int
    avg_rating: float
    flagged_count: int
    verified_lawyers_count: int
    pending_lawyers_count: int
