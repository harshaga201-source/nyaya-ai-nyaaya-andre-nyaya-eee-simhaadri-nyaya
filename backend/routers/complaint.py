import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import ComplaintDraftRequest, ComplaintDraftResponse
from backend.services.gemini_service import gemini_service
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Complaint Draft"])

COMPLAINT_TEMPLATES = {
    "police_fir": {
        "title": "Police Complaint / Request for Registration of FIR",
        "authority": "The Station House Officer (SHO), Jurisdictional Police Station",
        "sections": ["Section 173 BNSS (formerly Section 154 CrPC)", "Section 303/318 BNS"],
        "template": """To,
The Station House Officer (SHO),
Police Station: [POLICE STATION NAME],
{place_of_incident}

Subject: Complaint regarding cognizable offence for registration of FIR under Section 173 of Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)

Respected Sir / Madam,

I, the undersigned complainant, {complainant_name}, residing at {complainant_address}, Contact: {complainant_contact}, wish to report the following cognizable offence for immediate action:

1. DETAILS OF THE OPPOSITE PARTY / ACCUSED:
   Name/Identity: {opposite_party}
   Address/Details: [Mention if known, or 'Unknown / Cyber perpetrators']

2. DATE, TIME & PLACE OF INCIDENT:
   Date: {date_of_incident}
   Location: {place_of_incident}

3. CHRONOLOGY OF THE OFFENCE & FACTS:
   {incident_details}

4. STATUTORY RIGHTS & PROVISIONS:
   - As per Section 173 BNSS (formerly Section 154 CrPC), it is mandatory to reduce this information to writing and provide a copy free of cost.
   - If the jurisdiction belongs to another police post, this complaint must be accepted as a 'Zero FIR' and transferred accordingly.
   - Pertinent provisions of the Bharatiya Nyaya Sanhita, 2023 (BNS) apply.

5. PRAYER / RELIEF SOUGHT:
   {relief_sought}
   It is therefore prayed that this complaint be registered as a First Information Report (FIR), appropriate investigation be initiated, and necessary steps be taken to secure justice.

Yours faithfully,

({complainant_name})
Date: [Current Date]
Place: {place_of_incident}
"""
    },
    "consumer_dispute": {
        "title": "Consumer Complaint under Consumer Protection Act, 2019",
        "authority": "The Hon'ble District Consumer Disputes Redressal Commission",
        "sections": ["Section 2(7) CPA", "Section 2(10) CPA", "Section 2(11) CPA", "Section 35 CPA 2019"],
        "template": """BEFORE THE HON'BLE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION AT {place_of_incident}

CONSUMER COMPLAINT NO. ______ / 202...

IN THE MATTER OF:
{complainant_name}
Residing at: {complainant_address}
Contact: {complainant_contact}
... COMPLAINANT

VERSUS

{opposite_party}
... OPPOSITE PARTY / RESPONDENT

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019 FOR DEFICIENCY IN SERVICE / DEFECTIVE GOODS / UNFAIR TRADE PRACTICE

MOST RESPECTFULLY SHOWETH:
1. That the Complainant is a 'Consumer' within the meaning of Section 2(7) of the Consumer Protection Act, 2019, having purchased goods / availed services from the Opposite Party for valuable consideration.
2. That the Opposite Party is carrying on business / providing services within the territorial jurisdiction of this Hon'ble Commission.
3. TRANSACTION & INCIDENT DETAILS:
   - Date of Transaction / Incident: {date_of_incident}
   - Invoice / Order Number: [Enter invoice or order ID]
   - Consideration Paid: [Enter total amount paid in INR]
4. FACTUAL GRIEVANCE:
   {incident_details}
5. CAUSE OF ACTION & DEFICIENCY:
   The conduct of the Opposite Party amounts to Defect under Section 2(10), Deficiency in Service under Section 2(11), and Unfair Trade Practice under Section 2(47) of the Act. The complaint is filed well within the 2-year limitation period prescribed under Section 69.
6. PRAYER:
   In light of the aforesaid submissions, it is prayed that this Hon'ble Commission may be pleased to direct the Opposite Party to:
   {relief_sought}
   (a) Refund the sum paid with 18% interest per annum;
   (b) Pay compensation for mental agony and harassment;
   (c) Award litigation costs.

COMPLAINANT
Through: Self / Authorized Representative
"""
    },
    "cyber_crime": {
        "title": "Cyber Crime Complaint to National Cyber Crime Portal & Cyber Cell",
        "authority": "Cyber Crime Police Station / National Cyber Crime Reporting Portal (cybercrime.gov.in)",
        "sections": ["Section 66C/66D IT Act 2000", "Section 318(4) BNS (formerly 420 IPC)", "Section 61 BSA"],
        "template": """To,
The Cyber Crime Police Station / Cyber Cell,
{place_of_incident}

Subject: Complaint regarding online fraud / cyber deception / financial fraud for registration of complaint & freezing of accounts

Complainant Details:
Name: {complainant_name}
Address: {complainant_address}
Mobile / WhatsApp: {complainant_contact}

1. OPPOSITE SUSPECT DETAILS:
   Suspect / Entity: {opposite_party}
   Suspect Phone/URL/UPI ID/Bank: [Enter suspect mobile, fraudulent link, or recipient bank account]

2. INCIDENT PARTICULARS:
   Date & Time of Fraud: {date_of_incident}
   Platform (UPI, Netbanking, WhatsApp, Telegram, Fake Website): [Specify platform]

3. CHRONOLOGY OF THE CYBER CRIME:
   {incident_details}

4. EVIDENCE ANNEXED:
   - Bank Statement showing fraudulent debit
   - Screenshots of chats / call records / phishing URLs
   - Acknowledgment from helpline 1930 (if reported via phone)

5. RELIEF SOUGHT:
   {relief_sought}
   Request immediate communication with the nodal bank officer to freeze recipient accounts and register an FIR under relevant provisions of the Information Technology Act and Section 318(4) of Bharatiya Nyaya Sanhita, 2023.

Yours sincerely,
({complainant_name})
Date: [Current Date]
"""
    },
    "rti_application": {
        "title": "Application for Obtaining Information under Right to Information Act, 2005",
        "authority": "The Public Information Officer (PIO) / Central Public Information Officer (CPIO)",
        "sections": ["Section 6(1) RTI Act 2005", "Section 7(1) RTI Act 2005"],
        "template": """APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005

To,
The Central / State Public Information Officer (CPIO / SPIO),
Office / Department of: {opposite_party},
{place_of_incident}

1. Full Name of Applicant: {complainant_name}
2. Address for Correspondence: {complainant_address}
3. Phone / Email: {complainant_contact}
4. Citizenship: Citizen of India

5. PARTICULARS OF INFORMATION SOUGHT:
   Context & Period: Incident / Subject of {date_of_incident}
   Specific Queries:
   {incident_details}

6. PURPOSE / REASON:
   As per Section 6(2) of the RTI Act, 2005, an applicant is NOT required to give any reason for requesting the information.

7. STATUTORY TIMELINE:
   As mandated by Section 7(1) of the RTI Act, 2005, the requested information shall be provided within thirty (30) days from the receipt of this application (or within 48 hours if concerning life and liberty).

8. APPLICATION FEE:
   Court fee stamp / Postal Order / Online payment of Rs 10/- is enclosed herewith.

Date: [Current Date]
Place: {place_of_incident}

Signature of Applicant:
({complainant_name})
"""
    }
}

@router.post("/complaint/draft", response_model=ComplaintDraftResponse)
def draft_complaint_endpoint(request: ComplaintDraftRequest):
    complaint_type = request.complaint_type.lower()
    if complaint_type not in COMPLAINT_TEMPLATES:
        known = ", ".join(sorted(COMPLAINT_TEMPLATES))
        raise HTTPException(
            status_code=400,
            detail=f"Unknown complaint type '{request.complaint_type}'. Use one of: {known}.",
        )

    cfg = COMPLAINT_TEMPLATES[complaint_type]
    formatted = cfg["template"].format(
        complainant_name=request.complainant_name,
        complainant_contact=request.complainant_contact,
        complainant_address=request.complainant_address,
        opposite_party=request.opposite_party,
        date_of_incident=request.date_of_incident,
        place_of_incident=request.place_of_incident,
        incident_details=request.incident_details,
        relief_sought=request.relief_sought
    )
    
    # If target language is not English, generate a translated copy or bilingual draft
    if request.language != "en":
        target_lang_name = settings.LANGUAGE_NAMES.get(request.language, "English")
        if gemini_service.is_available:
            prompt = f"""
Translate this formal legal application/complaint into {target_lang_name}.
Keep Act names and Section numbers in English inside brackets (e.g. "[Right to Information Act, Section 6(1)]").
Keep all personal details and bracketed placeholders intact.

Draft:
{formatted}
"""
            translated_draft = gemini_service.generate_text(prompt)
            if not translated_draft or len(translated_draft) < max(200, int(len(formatted) * 0.4)):
                translated_draft = (
                    f"[Translation could not be produced — English draft follows]\n\n{formatted}"
                )
        else:
            # Offline engines cannot faithfully translate a full legal application.
            translated_draft = (
                f"[Translation unavailable offline — {target_lang_name} requested; English draft follows]\n\n{formatted}"
            )
        final_draft = f"=== {cfg['title'].upper()} ({target_lang_name}) ===\n\n{translated_draft}\n\n============================\n=== ENGLISH ORIGINAL DRAFT ===\n============================\n\n{formatted}"
    else:
        final_draft = formatted

    return ComplaintDraftResponse(
        complaint_type=complaint_type,
        title=cfg["title"],
        formatted_draft=final_draft,
        sections_cited=cfg["sections"],
        target_authority=cfg["authority"],
        language=request.language,
        banner_warning="Review with a lawyer before filing."
    )
