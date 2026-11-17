import logging
import json
import re
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.models.schemas import DocumentAnalysisResponse
from backend.services.gemini_service import gemini_service
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Document"])

DOCUMENT_ANALYSIS_PROMPT = """You are an expert legal document analyst for NyayaSathi.
Analyze the provided legal document (court notice, challan, agreement, police memo, RTI reply, legal summon, etc.) thoroughly.

Respond in JSON format with the following exact keys:
{{
  "document_type": "Specific type of document (e.g. Traffic Challan, Police Notice under Section 35 BNSS / 41A CrPC, Demand Notice, Consumer Notice)",
  "parties": ["List of identified parties, e.g. Complainant / Sender, Accused / Recipient, Authority"],
  "key_dates_and_amounts": ["List of dates (incident date, deadline to reply, issue date) and financial amounts/penalties"],
  "sections_cited": ["Statutory sections mentioned (e.g. MVA Section 184, BNSS Section 35, CPA Section 35)"],
  "plain_meaning": "A clear, empathetic, non-jargon explanation of what this document means for the recipient in plain words.",
  "action_items_and_deadlines": ["Bullet points of what the user must do next, explicitly highlighting deadlines (e.g. Reply within 15 days, appear on date X, verify on portal)"]
}}

Target Language for explanation: {target_language}.
Ensure all JSON keys match exactly and all values are translated into {target_language} (keeping statutory section names and act titles in English in brackets).
Return ONLY the raw JSON object.
"""

@router.post("/document/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document_endpoint(
    file: UploadFile = File(...),
    language: str = Form("en")
):
    """
    Multimodal legal document analysis.
    The file is read in-memory and NEVER persisted to disk, protecting user privacy.
    """
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty document received.")
            
        mime_type = file.content_type or "application/pdf"
        target_lang_name = settings.LANGUAGE_NAMES.get(language, "English")
        
        prompt = DOCUMENT_ANALYSIS_PROMPT.format(target_language=f"{target_lang_name} ({language})")
        
        # 1. Attempt Gemini multimodal
        raw_json_str = gemini_service.analyze_document_multimodal(file_bytes, mime_type, prompt)
        
        # 2. If Gemini returned text, attempt parsing JSON
        if raw_json_str:
            clean_str = re.sub(r"^```json\s*", "", raw_json_str.strip())
            clean_str = re.sub(r"```$", "", clean_str.strip())
            try:
                data = json.loads(clean_str)
                return DocumentAnalysisResponse(
                    document_type=data.get("document_type", "Legal Notice / Challan"),
                    parties=data.get("parties", ["Authority", "Citizen"]),
                    key_dates_and_amounts=data.get("key_dates_and_amounts", ["Immediate verification"]),
                    sections_cited=data.get("sections_cited", []),
                    plain_meaning=data.get("plain_meaning", "This is an official legal document requiring your attention."),
                    action_items_and_deadlines=data.get("action_items_and_deadlines", ["Consult legal counsel or verify on portal."]),
                    language=language
                )
            except Exception as pe:
                logger.warning(f"Could not parse Gemini JSON response: {pe}")

        # 3. Offline / no-model fallback: read what we can and be explicit about
        # the limits instead of inventing a confident-sounding verdict.
        text_content = ""
        extraction_ok = False
        if "pdf" in mime_type.lower():
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages[:3]:
                    text_content += page.extract_text() or ""
                extraction_ok = bool(text_content.strip())
            except Exception as pe:
                logger.warning(f"PDF extraction failed: {pe}")

        lowered = text_content.lower()
        detected_sections = re.findall(r"(?:Section|Sec\.?|धारा)\s*(\d+[A-Z]?)", text_content, re.IGNORECASE)
        dates = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text_content)
        amounts = re.findall(r"(?:Rs\.?|₹|INR)\s*[\d,]+", text_content)

        if extraction_ok:
            if any(k in lowered for k in ("challan", "vehicle", "traffic")):
                document_type = "Traffic Challan / Notice"
            elif any(k in lowered for k in ("summon", "court", "magistrate")):
                document_type = "Court Notice / Summons"
            elif "rti" in lowered or "right to information" in lowered:
                document_type = "RTI Reply / Information Disclosure"
            elif "fir" in lowered or "police" in lowered:
                document_type = "Police Notice / FIR Related Notice"
            else:
                document_type = "Legal Notice / Document"

            sections_cited = (
                [f"Section {s}" for s in set(detected_sections)]
                if detected_sections
                else ["No statutory section could be identified automatically — verify against the document itself"]
            )
            return DocumentAnalysisResponse(
                document_type=document_type,
                parties=["Issuing Authority / Court / Police", "Notice Recipient / Addressee"],
                key_dates_and_amounts=(dates + amounts) if (dates or amounts) else [
                    "Not auto-detected — review the document for any reply/appearance deadlines"
                ],
                sections_cited=sections_cited,
                plain_meaning=(
                    "This is an official communication requesting compliance or appearance. The text was "
                    "extracted automatically, so verify every detail (dates, vehicle/account numbers, amounts, "
                    "and sections cited) against the original document before acting. It does not replace a "
                    "lawyer's review of the actual document."
                ),
                action_items_and_deadlines=[
                    "Carefully verify all details (dates, vehicle/account numbers, allegations, sections cited).",
                    "Gather documentary evidence (receipts, dashcam, valid PUC/licence, payment receipts).",
                    "Respond before the deadline shown in the document (typically 15-30 days), online or in writing.",
                    "If contesting, schedule a consultation with a verified advocate or call Tele-Law (14454)."
                ],
                language=language
            )

        # Nothing legible was extracted (scanned PDF or a photo of a document).
        # Say so plainly rather than fabricate an analysis.
        return DocumentAnalysisResponse(
            document_type="Document could not be read automatically",
            parties=["Not identified — document text could not be extracted"],
            key_dates_and_amounts=["Not detected — check the notice itself for any reply/appearance deadline"],
            sections_cited=["Not detected — needs a readable PDF/scan or the online engine"],
            plain_meaning=(
                "This file could not be read automatically. It is likely a scanned image or a photograph of the "
                "document, which the offline reader cannot interpret. Do not rely on any assumption about its "
                "contents: contact the issuing authority, or share the original with a verified advocate or "
                "Tele-Law (14454) for review."
            ),
            action_items_and_deadlines=[
                "Note any deadline printed on the document itself (reply, appearance, or payment date).",
                "Contact the issuing authority quoting the challan/notice/case number printed on the document.",
                "Re-upload a clear, text-based PDF copy if possible, or consult a verified advocate about the notice.",
                "For free legal aid, call Tele-Law on 14454."
            ],
            language=language
        )
    finally:
        # Guarantee no file persistence
        del file_bytes
