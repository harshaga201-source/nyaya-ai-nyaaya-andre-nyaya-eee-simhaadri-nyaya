import sys
import re
import uuid
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from pydantic import ValidationError
from fastapi import HTTPException

from backend.models.database import init_db, get_db
from backend.models.schemas import (
    ChatRequest,
    TrafficDisputeRequest,
    ComplaintDraftRequest,
    FeedbackRequest,
    LawyerRegisterRequest,
    LawyerConsultRequest
)
from backend.routers.chat import chat_endpoint
from backend.routers.traffic import traffic_dispute_endpoint
from backend.routers.complaint import draft_complaint_endpoint
from backend.routers.lawyers import (
    get_lawyer,
    list_lawyer_locations,
    list_lawyers,
    register_lawyer,
    request_lawyer_consult,
)
from backend.routers.feedback import submit_feedback
from backend.routers.admin import get_admin_stats
from backend.scripts.ingest import ingest_laws

def test_all():
    print("=" * 70, flush=True)
    print("      NYAYASATHI FASTAPI ROUTER & SCHEMA VERIFICATION SUITE", flush=True)
    print("=" * 70, flush=True)

    # 0. Ingest & DB check
    init_db()
    count = ingest_laws(force_reingest=False)
    print(f"0. Knowledge Base: {count} active legal chunks.", flush=True)

    # 1. Chat Fresh Query
    print("\n--- 1. Testing Chat Endpoint (Fresh RAG Query) ---", flush=True)
    chat_req = ChatRequest(message="What is the fine for driving without a helmet?", language="en")
    chat_res = chat_endpoint(chat_req)
    print("   Answer Preview:", chat_res.answer[:120], "...", flush=True)
    print("   Citations:", [f"{c.act}, {c.section}" for c in chat_res.citations], flush=True)
    print("   Cached:", chat_res.is_cached, "| Response Time:", chat_res.response_time_ms, "ms", flush=True)
    assert len(chat_res.citations) > 0

    # 2. Chat Cached Query (Testing Cache Layer)
    print("\n--- 2. Testing Chat Endpoint (Cache Hit Verification) ---", flush=True)
    chat_cached_res = chat_endpoint(chat_req)
    print("   Cached:", chat_cached_res.is_cached, "| Cache Type:", chat_cached_res.cache_type, flush=True)
    print("   Instant Latency:", chat_cached_res.response_time_ms, "ms", flush=True)
    assert chat_cached_res.is_cached == True

    # 2b. Grounding Guard: irrelevant questions must be refused, not answered with random sections
    print("\n--- 2b. Testing RAG Grounding Guard (no random laws) ---", flush=True)
    oos_req = ChatRequest(message="What are the rules for adoption of a child in India?", language="en", force_refresh=True)
    oos_res = chat_endpoint(oos_req)
    print("   Out-of-scope citations:", len(oos_res.citations), flush=True)
    print("   Out-of-scope answer:", oos_res.answer[:110], "...", flush=True)
    assert oos_res.citations == []
    assert "do not cover" in oos_res.answer.lower()

    oos_hi = ChatRequest(message="बच्चे को गोद लेने के नियम क्या हैं?", language="hi", force_refresh=True)
    oos_hi_res = chat_endpoint(oos_hi)
    assert oos_hi_res.citations == []
    assert "कवर नहीं" in oos_hi_res.answer

    purchase_req = ChatRequest(message="I bought a PlayStation and it broke in a week, shop refuses refund", language="en", force_refresh=True)
    purchase_res = chat_endpoint(purchase_req)
    print("   Purchase-intent citations:", [f"{c.section}" for c in purchase_res.citations], flush=True)
    assert purchase_res.citations, "Expected consumer citations for purchase question"
    assert all("Consumer Protection" in c.act for c in purchase_res.citations), [c.act for c in purchase_res.citations]
    print("   Grounding guard passed: off-topic refused, consumer intent returns only Consumer Protection Act sections.", flush=True)

    # 3. Emergency Detection Layer
    print("\n--- 3. Testing Emergency Safety Layer ---", flush=True)
    emerg_req = ChatRequest(message="My friend was arrested and beaten in police lockup", language="en")
    emerg_res = chat_endpoint(emerg_req)
    print("   Emergency Triggered:", emerg_res.emergency is not None and emerg_res.emergency.is_emergency, flush=True)
    print("   Emergency Category:", emerg_res.emergency.category if emerg_res.emergency else None, flush=True)
    print("   Helplines:", [h["number"] for h in emerg_res.emergency.helplines] if emerg_res.emergency else [], flush=True)
    assert emerg_res.emergency is not None
    assert emerg_res.emergency.is_emergency == True

    # 4. Traffic Fine Dispute
    print("\n--- 4. Testing Traffic Fine Dispute Wizard ---", flush=True)
    traffic_req = TrafficDisputeRequest(
        challan_number="DL1234562026",
        date="10/11/2026",
        place="Connaught Place, New Delhi",
        vehicle_type="Two-Wheeler",
        violation_charged="Driving without helmet",
        section_charged="Section 194D",
        dispute_reason="valid_documents",
        custom_explanation="Wearing certified helmet, camera had obstructed angle.",
        language="en"
    )
    traffic_res = traffic_dispute_endpoint(traffic_req)
    print("   Section Matches:", traffic_res.section_matches, flush=True)
    print("   Statutory Analysis:", traffic_res.section_analysis[:100], "...", flush=True)
    print("   Citizen Options Count:", len(traffic_res.options), flush=True)
    print("   Draft Contest Letter Length:", len(traffic_res.draft_contest_letter_english), flush=True)
    assert traffic_res.section_matches == True
    assert len(traffic_res.options) >= 3

    # 5. Complaint Draft
    print("\n--- 5. Testing Complaint Drafting Generator ---", flush=True)
    comp_req = ComplaintDraftRequest(
        complaint_type="consumer_dispute",
        complainant_name="Aakash Sharma",
        complainant_contact="+91 9811002233",
        complainant_address="Sector 62, Noida",
        opposite_party="ElectroMart E-Commerce",
        date_of_incident="01/11/2026",
        place_of_incident="Noida",
        incident_details="Defective laptop delivered; screen flickering; company rejected return under warranty.",
        relief_sought="Replacement or full refund of Rs 65,000 with 18% interest and compensation.",
        language="en"
    )
    comp_res = draft_complaint_endpoint(comp_req)
    print("   Title:", comp_res.title, flush=True)
    print("   Target Authority:", comp_res.target_authority, flush=True)
    print("   Sections Cited:", comp_res.sections_cited, flush=True)
    print("   Warning Banner:", comp_res.banner_warning, flush=True)
    assert "Review with a lawyer before filing." in comp_res.banner_warning

    # 6. Lawyers Directory & Filters
    print("\n--- 6. Testing Lawyers Directory, Location Matching & Consultation ---", flush=True)
    all_lawyers = list_lawyers()
    print("   Total Verified Lawyers:", len(all_lawyers), flush=True)
    print("   Cities Covered:", len({l.city for l in all_lawyers}), flush=True)
    print("   Localities Covered:", len({l.area for l in all_lawyers}), flush=True)
    assert len(all_lawyers) >= 60
    assert len({l.city for l in all_lawyers}) >= 20

    bar_re = re.compile(r"^[A-Z]{1,4}/\d{1,6}/\d{4}$")
    phone_re = re.compile(r"^\+91 [6-9]\d{4} \d{5}$")
    email_re = re.compile(r"^[a-z0-9][a-z0-9._-]*@[a-z0-9.-]+\.[a-z]{2,}$")
    for lawyer in all_lawyers:
        assert lawyer.status == "verified"
        assert lawyer.area and lawyer.court and lawyer.address and lawyer.pincode
        assert len(lawyer.pincode) == 6 and lawyer.pincode.isdigit()
        assert bar_re.fullmatch(lawyer.bar_council_no), lawyer.bar_council_no
        assert phone_re.fullmatch(lawyer.phone or ""), lawyer.phone
        assert email_re.fullmatch(lawyer.email or ""), lawyer.email
        assert 0 <= lawyer.years_experience <= 60
        assert len(lawyer.languages) >= 2
    assert len({l.bar_council_no for l in all_lawyers}) == len(all_lawyers)
    assert len({l.phone for l in all_lawyers}) == len(all_lawyers)
    assert len({l.email for l in all_lawyers}) == len(all_lawyers)
    print("   All profiles have valid Bar Council numbers, phones, emails and PIN codes.", flush=True)

    def lawyer_names(**filters):
        return {lawyer.name for lawyer in list_lawyers(**filters)}

    hyderabad_names = {
        "Adv. Srinivas Reddy",
        "Adv. Kavitha Rao",
        "Adv. Mohammed Irfan",
    }
    location_cases = {
        "Hyderabad": hyderabad_names,
        "Banjara Hills": {"Adv. Srinivas Reddy"},
        "Telangana": hyderabad_names,
        "500034": {"Adv. Srinivas Reddy"},
        "Bangalore": {"Adv. Suresh Gowda", "Adv. Priya Venkatesh", "Adv. Ananya Rao"},
        "Hydrabad": hyderabad_names,
        "Mumbai, Bandra": {"Adv. Farhan Qureshi"},
        "हैदराबाद": hyderabad_names,
        "హైదరాబాద్": hyderabad_names,
        "தமிழ்நாடு": {"Adv. Lakshmi Narayanan", "Adv. Karthik Subramanian", "Adv. Deepa Krishnan"},
    }
    for query, expected in location_cases.items():
        actual = lawyer_names(location=query)
        assert actual == expected, f"{query}: {actual}"
        print(f"   Location '{query}' -> {len(actual)} matching advocate(s)", flush=True)

    assert len(list_lawyers(location="Delhi NCR")) == 9
    assert list_lawyers(location="Atlantis") == []
    assert list_lawyers(location="London") == []
    assert lawyer_names(location="Hyderabad", practice_area="criminal") == {"Adv. Srinivas Reddy"}
    assert lawyer_names(location="Hyderabad", language="Telugu") == hyderabad_names
    assert len(list_lawyers(language="telgu")) == 6
    assert len(list_lawyers(language="तेलुगु")) == 6
    assert len(list_lawyers(language="अंग्रेजी")) == len(all_lawyers)
    print("   Combined location + practice-area + language filters passed.", flush=True)

    suggestions = list_lawyer_locations(q="banj", limit=5)
    assert any(item.value == "Banjara Hills, Hyderabad" for item in suggestions)
    assert any("Sector 62" in item.value for item in list_lawyer_locations(q="sec", limit=8))
    assert len(list_lawyer_locations(q="", limit=8)) == 8
    print("   Location autocomplete suggestions passed.", flush=True)

    detail = get_lawyer("adv-hyderabad-01")
    assert detail.name == "Adv. Srinivas Reddy" and detail.court == "Telangana High Court"
    print("   Verified profile detail lookup passed.", flush=True)

    # Request consultation with consent
    consult_req = LawyerConsultRequest(
        lawyer_id=all_lawyers[0].id,
        user_name="Citizen Test User",
        user_phone="+91 9876543210",
        issue_summary="Need assistance regarding notice under BNSS Section 35",
        consent_given=True
    )
    consult_res = request_lawyer_consult(consult_req)
    print("   Consultation Status:", consult_res["status"], flush=True)
    with get_db() as conn:
        conn.execute("DELETE FROM lawyer_requests WHERE user_name = 'Citizen Test User'")
        conn.commit()

    # Invalid registration must be rejected by schema validation.
    invalid_registration_base = dict(
        name="Adv. Invalid Payload",
        bar_council_no="TS/1234/2020",
        city="Hyderabad",
        state="Telangana",
        languages=["English"],
        practice_area="Criminal Law & Bail",
        years_experience=5,
        phone="+91 98765 99997",
        email="invalid.payload@nyayasathi.demo",
    )
    for field, value in (
        ("phone", "+91 12345 00000"),
        ("bar_council_no", "TS-1234-2020"),
        ("email", "not-an-email"),
    ):
        payload = dict(invalid_registration_base)
        payload[field] = value
        try:
            LawyerRegisterRequest(**payload)
            raise AssertionError(f"Invalid {field} was accepted")
        except ValidationError:
            pass
    print("   Invalid phone/email/Bar Council payloads rejected.", flush=True)

    localized = LawyerRegisterRequest(**{
        **invalid_registration_base,
        "languages": ["अंग्रेजी", "हिंदी", "తెలుగు"],
    })
    assert localized.languages == ["English", "Hindi", "Telugu"]
    print("   Localized language names normalised to English directory values.", flush=True)

    # Register a pending lawyer; it must stay out of the public verified list.
    serial = int(uuid.uuid4().int % 900000) + 100000
    reg_req = LawyerRegisterRequest(
        name=f"Adv. Test Verification {serial}",
        bar_council_no=f"TS/{serial}/2020",
        city="Hyderabad",
        state="Telangana",
        area="Banjara Hills",
        pincode="500034",
        address="Chamber 1, Test Chambers, Banjara Hills, Hyderabad - 500034",
        court="Telangana High Court",
        languages=["English", "Hindi", "Telugu"],
        practice_area="Constitutional & RTI Law",
        years_experience=6,
        phone="+91 98765 99999",
        email=f"verify.{serial}@nyayasathi.demo"
    )
    reg_res = register_lawyer(reg_req)
    pending_id = reg_res["id"]
    try:
        print("   Lawyer Registration:", reg_res["message"], flush=True)
        assert all(lawyer.id != pending_id for lawyer in list_lawyers())

        try:
            register_lawyer(reg_req)
            raise AssertionError("Duplicate Bar Council number was accepted")
        except HTTPException as exc:
            assert exc.status_code == 409

        pending_consult = LawyerConsultRequest(
            lawyer_id=pending_id,
            user_name="Citizen Test User",
            user_phone="+91 98765 99998",
            issue_summary="Consultation request for a profile pending verification.",
            consent_given=True,
        )
        try:
            request_lawyer_consult(pending_consult)
            raise AssertionError("Pending lawyer accepted a consultation request")
        except HTTPException as exc:
            assert exc.status_code == 404
        print("   Pending profiles hidden; duplicate Bar number and pending consult rejected.", flush=True)
    finally:
        with get_db() as conn:
            conn.execute("DELETE FROM lawyers WHERE id = ?", (pending_id,))
            conn.execute("DELETE FROM lawyer_requests WHERE lawyer_id = ?", (pending_id,))
            conn.commit()

    # 7. Feedback Submission
    print("\n--- 7. Testing Citizen Feedback & Quality Logging ---", flush=True)
    fb_req = FeedbackRequest(
        rating=5,
        category="accuracy",
        comment="Statutory sections matched perfectly with BNS/BNSS codes.",
        is_flagged=False
    )
    fb_res = submit_feedback(fb_req)
    print("   Feedback Submitted:", fb_res["status"], flush=True)

    # 8. Admin Telemetry Stats
    print("\n--- 8. Testing Admin Telemetry & Health Stats ---", flush=True)
    stats = get_admin_stats()
    print("   Total Queries Logged:", stats.total_queries, flush=True)
    print("   Cache Hit Rate:", stats.cache_hit_rate_percent, "%", flush=True)
    print("   Average Latency:", stats.avg_response_time_ms, "ms", flush=True)
    print("   Verified Lawyers:", stats.verified_lawyers_count, flush=True)
    print("   Pending Verification Lawyers:", stats.pending_lawyers_count, flush=True)

    print("\n" + "=" * 70, flush=True)
    print("  ALL 8 CORE BUSINESS LOGIC & ROUTER MODULES PASSED VALIDATION!", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    test_all()
