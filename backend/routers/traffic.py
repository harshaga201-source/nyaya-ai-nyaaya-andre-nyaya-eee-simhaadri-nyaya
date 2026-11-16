import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import TrafficDisputeRequest, TrafficDisputeResponse
from backend.services.rag_service import rag_service
from backend.services.gemini_service import gemini_service
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Traffic Dispute"])

SECTION_MATCH_MAP = {
    "speed": ["112", "183"],
    "helmet": ["129", "194d"],
    "seatbelt": ["194b"],
    "red light": ["184"],
    "signal": ["184"],
    "phone": ["184"],
    "drunk": ["185"],
    "alcohol": ["185"],
    "licence": ["3", "181"],
    "license": ["3", "181"],
    "insurance": ["146", "196"],
    "puc": ["190"],
    "pollution": ["190"],
}

@router.post("/traffic/dispute", response_model=TrafficDisputeResponse)
def traffic_dispute_endpoint(request: TrafficDisputeRequest):
    """
    Evaluates traffic fine dispute, verifies statutory section matching,
    provides legal options, and drafts contest letters in English and chosen language.
    """
    violation_lower = request.violation_charged.lower()
    section_lower = request.section_charged.lower()
    
    # 1. RAG retrieval for relevant Motor Vehicles Act sections
    rag_chunks = rag_service.retrieve_top_chunks(f"Motor Vehicles Act {request.section_charged} {request.violation_charged}", top_k=3)
    
    # 2. Check section match
    section_matches = False
    for keyword, expected_sections in SECTION_MATCH_MAP.items():
        if keyword in violation_lower:
            for s in expected_sections:
                if s in section_lower:
                    section_matches = True
                    break
        if section_matches:
            break
            
    # If the user inputted e.g. "Section 183" for speeding, it matches.
    if not section_matches and any(k in section_lower for k in ["112", "183", "129", "194", "184", "185", "181", "196", "190"]):
        section_matches = True

    section_analysis = (
        f"Statutory Review: The violation '{request.violation_charged}' is evaluated under {request.section_charged}. "
        + ("The cited section correctly corresponds to the statutory offence under the Motor Vehicles Act, 1988 (as amended)."
           if section_matches else
           f"Discrepancy Detected: The cited section '{request.section_charged}' may not align with the standard provision for '{request.violation_charged}'. This mismatch provides strong grounds for contestation under Section 208.")
    )

    # 3. User Options
    options = [
        {
            "name": "Virtual Court (Online Contest)",
            "description": "Visit vcourts.gov.in. Search challan number. Choose 'I do not plead guilty / Contest Challan' to submit your written grounds."
        },
        {
            "name": "Lok Adalat (Quarterly Amicable Settlement)",
            "description": "Appear before National or State Lok Adalat with the vehicle owner documents. Minor traffic fines are frequently compounded with substantial rebates or dismissed if evidence of error is shown."
        },
        {
            "name": "Regular Traffic Court",
            "description": "If Virtual Court rejects or you request trial, summons are forwarded to the jurisdictional Metropolitan/Judicial Magistrate Court for summary trial."
        },
        {
            "name": "Compounding / Payment",
            "description": "If you choose not to dispute, pay via the official parivahan.gov.in portal. Always verify exact pending amount on the portal."
        }
    ]

    # 4. Draft Contest Letter in English
    draft_english = f"""To,
The Competent Traffic Authority / The Presiding Officer,
Virtual Court / Jurisdictional Traffic Court,
{request.place or '[City / Traffic Division]'}

Subject: Formal Representation & Contestation against Traffic Challan No. {request.challan_number}

Respected Sir / Madam,

I, the registered owner / driver of Vehicle No. [ENTER VEHICLE REGISTRATION NUMBER], type: {request.vehicle_type}, hereby lodge my formal objection and contest against the notice issued under Challan No. {request.challan_number}, dated {request.date}, alleging violation under {request.section_charged} ({request.violation_charged}).

I respectfully submit my dispute on the following grounds:
1. Reason for Contestation: {request.dispute_reason.replace('_', ' ').title()}
2. Factual Submissions:
   {request.custom_explanation or '[Insert detailed factual narrative: e.g. vehicle was parked elsewhere / incorrect number plate OCR / valid digital documents in DigiLocker / emergency situation]'}
3. Statutory Safeguards:
   - Under Central Motor Vehicles Rules (CMVR) Rule 139, drivers are entitled to produce electronic documentation.
   - Under Section 208 of the Motor Vehicles Act, 1988, the undersigned asserts the right to summary review and trial.
   - Evidence enclosed: [Annexure 1: Copy of Registration & Insurance / Photos / Dashcam footage / Payment receipt].

In light of the aforesaid facts and bona fide grounds, it is respectfully prayed that:
(a) The impugned Challan No. {request.challan_number} be revoked / cancelled; OR
(b) The matter be referred to the upcoming Lok Adalat or competent magistrate for discharge.

Yours sincerely,
[YOUR FULL NAME]
[CONTACT PHONE NUMBER & EMAIL]
Date: {request.date or '[Date]'}
Place: {request.place or '[Place]'}
"""

    # 5. Draft Contest Letter in Chosen Language
    target_lang_name = settings.LANGUAGE_NAMES.get(request.language, "English")
    if request.language != "en":
        prompt = f"""
Translate the following formal Indian legal traffic challan contest letter into {target_lang_name}.
Keep statutory references in English inside brackets (e.g. "[Motor Vehicles Act, Section 208]").
Preserve all bracketed user placeholders like [ENTER VEHICLE REGISTRATION NUMBER].

Letter to translate:
{draft_english}
"""
        draft_target = gemini_service.generate_text(prompt)
    else:
        draft_target = draft_english

    submission_steps = [
        "Step 1: Open the official portal: echallan.parivahan.gov.in or vcourts.gov.in (Never pay through unauthorized third-party apps).",
        f"Step 2: Enter Challan Number '{request.challan_number}' or Vehicle Number to view challan photos and exact fine amount.",
        "Step 3: Click 'Dispute' / 'I want to contest' or upload the contest representation with supporting proofs.",
        "Step 4: Keep an acknowledgment number or SMS receipt for your records.",
        "Step 5: If invited to Virtual Court or Lok Adalat, attend on the allocated date with your documents."
    ]

    return TrafficDisputeResponse(
        section_matches=section_matches,
        section_analysis=section_analysis,
        options=options,
        draft_contest_letter_target_lang=draft_target,
        draft_contest_letter_english=draft_english,
        submission_steps=submission_steps,
        official_portal_url="https://echallan.parivahan.gov.in"
    )
