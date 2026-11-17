from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

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
    languages: List[str]
    practice_area: str
    years_experience: int
    bar_council_no: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = "verified"
    is_sample: bool = True

class LawyerRegisterRequest(BaseModel):
    name: str
    city: str
    state: str
    languages: List[str]
    practice_area: str
    years_experience: int
    bar_council_no: str
    phone: str
    email: str

class LawyerConsultRequest(BaseModel):
    lawyer_id: str
    user_name: str
    user_phone: str
    user_email: Optional[str] = None
    issue_summary: str
    consent_given: bool

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
