import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from backend.models.database import init_db
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
from backend.routers.lawyers import list_lawyers, register_lawyer, request_lawyer_consult
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
    print("\n--- 6. Testing Lawyers Directory & Consultation ---", flush=True)
    all_lawyers = list_lawyers()
    print("   Total Seeded Lawyers:", len(all_lawyers), flush=True)
    assert len(all_lawyers) >= 8

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

    # Register lawyer
    reg_req = LawyerRegisterRequest(
        name="Adv. Vikramaditya Rathore",
        bar_council_no="RAJ/567/2018",
        city="Jaipur",
        state="Rajasthan",
        languages=["English", "Hindi"],
        practice_area="Constitutional & RTI Law",
        years_experience=6,
        phone="+91 98290 XXXXX",
        email="rathore.law@sample.demo"
    )
    reg_res = register_lawyer(reg_req)
    print("   Lawyer Registration:", reg_res["message"], flush=True)

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
