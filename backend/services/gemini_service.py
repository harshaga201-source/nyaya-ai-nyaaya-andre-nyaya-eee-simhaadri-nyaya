import os
import io
import re
import math
import hashlib
import json
import logging
from typing import List, Optional, Dict, Any
from backend.config import settings
from backend.services.localization import DISCLAIMER, detect_category, get_templates
from backend.services.translate import translate_texts

logger = logging.getLogger(__name__)

# Feature vector dimensionality for fallback deterministic embeddings
EMBEDDING_DIM = 384

def _fallback_embedding(text: str) -> List[float]:
    """
    Deterministic normalized embedding generator based on token hashed projections.
    Provides reliable, cosine-comparable embeddings even without an internet connection or API key.
    """
    vec = [0.0] * EMBEDDING_DIM
    words = text.lower().replace("\n", " ").split()
    if not words:
        return [0.0] * EMBEDDING_DIM
        
    for i, word in enumerate(words):
        # unigram
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        idx = h % EMBEDDING_DIM
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        vec[idx] += sign * 1.0
        
        # bigram
        if i < len(words) - 1:
            bigram = f"{word}_{words[i+1]}"
            hb = int(hashlib.md5(bigram.encode('utf-8')).hexdigest(), 16)
            idx_b = hb % EMBEDDING_DIM
            sign_b = 1.0 if ((hb >> 8) & 1) == 0 else -1.0
            vec[idx_b] += sign_b * 1.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        return [x / norm for x in vec]
    return vec

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Initialized Google GenAI Client successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}. Fallback enabled.")

    @property
    def is_available(self) -> bool:
        """True when a real Gemini client is configured (and was initialisable)."""
        return self.client is not None

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using Gemini API or fallback vectorizer."""
        if self.client:
            try:
                # Using official google-genai SDK
                result = self.client.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=text,
                )
                if hasattr(result, "embedding") and result.embedding:
                    return result.embedding.values
                if hasattr(result, "embeddings") and result.embeddings:
                    return result.embeddings[0].values
            except Exception as e:
                logger.warning(f"Gemini embed_content call failed: {e}. Using fallback vectorizer.")
        return _fallback_embedding(text)

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text using Gemini fast model (gemini-2.5-flash / gemini-1.5-flash)."""
        if self.client:
            try:
                from google.genai import types
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2, # Low temperature for accurate legal citations
                )
                response = self.client.models.generate_content(
                    model=settings.GEMINI_CHAT_MODEL,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini generate_content failed on {settings.GEMINI_CHAT_MODEL}: {e}. Retrying backup {settings.GEMINI_BACKUP_MODEL}...")
                try:
                    response = self.client.models.generate_content(
                        model=settings.GEMINI_BACKUP_MODEL,
                        contents=prompt,
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as e2:
                    logger.warning(f"Gemini backup failed: {e2}. Using local synthesis.")
        
        # Local deterministic synthesis fallback
        return self._local_synthesis(prompt, system_instruction)

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str = "audio/wav", language: str = "en") -> str:
        """Transcribe speech using Gemini multimodal audio capabilities."""
        if self.client:
            try:
                from google.genai import types
                prompt = f"Transcribe the spoken speech in this audio accurately. Target language: {language}. Return ONLY the transcribed text without commentary."
                response = self.client.models.generate_content(
                    model=settings.GEMINI_CHAT_MODEL,
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        prompt
                    ]
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini audio transcription failed: {e}. Using fallback.")
                
        # No API key / network: do NOT fabricate a transcript. Repeating a canned
        # sentence made every voice query look identical. The client shows a clear
        # "could not transcribe, please type" message when this is empty.
        return ""

    def analyze_document_multimodal(self, file_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Analyze legal document (PDF / image) using Gemini multimodal."""
        if self.client:
            try:
                from google.genai import types
                response = self.client.models.generate_content(
                    model=settings.GEMINI_CHAT_MODEL,
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                        prompt
                    ]
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini multimodal document analysis failed: {e}.")
        return ""

    def _render_localized(
        self,
        user_query: str,
        lang: str,
        sources: List[Dict[str, Any]],
        category: str | None = None,
    ) -> str:
        """Render a deterministic answer in the requested Indian language."""
        templates = get_templates(lang)
        cat = category or detect_category(user_query)

        if not sources:
            return str(templates["no_sources"])

        # Translate statutory excerpts into the citizen's language so the answer
        # is genuinely in that language, not just with localized labels.
        excerpts = [(s.get("content") or "").strip() for s in sources[:3]]
        excerpts = [(e[:520] + "...") if len(e) > 520 else e for e in excerpts]
        local_excerpts = translate_texts(excerpts, lang)

        out = [str(templates["intro"]).format(query=user_query)]
        for idx, source in enumerate(sources[:3], 1):
            out.append(
                f"{idx}. [{source['act']}, {source['section']}] — {source['title']}"
            )
            if local_excerpts[idx - 1]:
                out.append(f"{templates['source_label']}: {local_excerpts[idx - 1]}\n")

        out.append(str(templates["safeguards_heading"]))
        bullets = templates["bullets"].get(  # type: ignore[union-attr]
            cat,
            templates["bullets"]["default"],  # type: ignore[index]
        )
        out.extend(bullets)
        out.append("\n" + str(templates["note"]) + "\n\n" + DISCLAIMER)
        return "\n".join(out)

    def _local_synthesis(self, prompt: str, system_instruction: Optional[str]) -> str:
        """Robust local response generator obeying RAG constraints, statutory citations, and citizens' rights."""
        lines = prompt.split("\n")
        user_query = ""
        req_lang = "en"
        search_query = ""

        for line in lines:
            if "USER QUESTION:" in line:
                user_query = line.replace("USER QUESTION:", "").strip()
            elif "SEARCH QUERY" in line:
                search_query = line.split(":", 1)[1].strip()
            elif "REQUESTED LANGUAGE:" in line:
                val = line.replace("REQUESTED LANGUAGE:", "").strip()
                if "(" in val and ")" in val:
                    req_lang = val.split("(")[-1].replace(")", "").strip().lower()
                elif "hindi" in val.lower() or "hi" in val.lower():
                    req_lang = "hi"
                elif "kannada" in val.lower() or "kn" in val.lower():
                    req_lang = "kn"
                    
        # Parse sources cleanly
        raw_sources = re.split(r"\[Source\s+\d+\]:\s*", prompt)
        sources = []
        for raw in raw_sources[1:]:
            s_lines = raw.strip().split("\n")
            if not s_lines:
                continue
            header = s_lines[0].strip()
            body_lines = [l.strip() for l in s_lines[1:] if l.strip() and not l.startswith("Act:") and not l.startswith("Section:") and not l.startswith("Title:") and not l.startswith("Text:")]
            body = " ".join(body_lines)
            
            act = ""
            sec = ""
            title = ""
            if " - " in header:
                act_part, rest = header.split(" - ", 1)
                act = act_part.strip()
                if ":" in rest:
                    sec_part, title_part = rest.split(":", 1)
                    sec = sec_part.strip()
                    title = title_part.strip()
                else:
                    sec = rest.strip()
            else:
                act = header
                
            sources.append({
                "act": act,
                "section": sec,
                "title": title,
                "content": body
            })

        cat = detect_category(f"{user_query} {search_query}")

        # Non-English answers are rendered from localized templates. This is what
        # makes the offline engine honor the language selected by the citizen.
        if req_lang != "en":
            return self._render_localized(user_query, req_lang, sources, cat)

        if not sources:
            if req_lang == "hi":
                return (
                    "उपलब्ध वैधानिक स्रोत इस विशिष्ट प्रश्न को कवर नहीं करते हैं। "
                    "औपचारिक कानूनी सलाह के लिए, कृपया किसी सत्यापित अधिवक्ता से परामर्श लें या भारत सरकार की टेली-लॉ हेल्पलाइन 14454 पर संपर्क करें।\n\n"
                    "Legal information, not legal advice."
                )
            return (
                "The available statutory sources do not cover this specific question. "
                "For formal legal counsel, please consult a verified advocate or call the Government of India Tele-Law toll-free helpline at 14454.\n\n"
                "Legal information, not legal advice."
            )
            
        q_lower = user_query.lower()
        
        # Hindi Response — structured, query-matched advice.
        if req_lang == "hi":
            out = [
                f"आपके प्रश्न \"{user_query}\" पर आधारित कानूनी मार्गदर्शन:\n",
            ]
            out.append("प्राप्त वैधानिक प्रावधान (retrieved sections):\n")
            for idx, s in enumerate(sources[:3], 1):
                content = s['content'].strip()
                summary = content[:380] + ("..." if len(content) > 380 else "")
                out.append(f"{idx}. [{s['act']}, {s['section']}] — {s['title']}")
                out.append(summary + "\n")

            out.append("इस पर कार्रवाई के व्यावहारिक कदम:\n")
            if any(k in q_lower for k in ["police", "arrest", "warrant", "stop", "पुलिस", "गिरफ्तार", "थाना"]):
                out.append("1. गिरफ्तारी के सटीक आधार और जमानत पात्रता तत्काल माँगें [BNSS Section 47 (CrPC S.50)]।")
                out.append("2. गिरफ्तारी मेमो और परिवार को तुरंत सूचित करने की मांग करें [BNSS Section 36 (CrPC S.41B)]।")
                out.append("3. 7 वर्ष तक की सजा वाले अपराधों में उपस्थिति का औपचारिक नोटिस माँगें [BNSS Section 35 (CrPC S.41A)]।")
                out.append("4. पूछताछ के दौरान अपने पसंद के अधिवक्ता से सलाह लें [BNSS Section 38 (CrPC S.41D)]।")
                out.append("5. 24 घंटे के भीतर मजिस्ट्रेट के समक्ष प्रस्तुत करना अनिवार्य है [BNSS Section 57]।")
            elif any(k in q_lower for k in ["zero fir", "fir", "रिपोर्ट", "शिकायत"]):
                out.append("1. निकटतम पुलिस थाने में जाएँ — जीरो एफआईआर के लिए क्षेत्र नहीं देखा जाता [BNSS Section 173]।")
                out.append("2. पुलिस को लिखित रूप में जानकारी दर्ज करनी होगी; प्रति निःशुल्क माँगें।")
                out.append("3. मना करने पर जिला SP से संपर्क करें या टेली-लॉ 14454 पर कॉल करें।")
            elif any(k in q_lower for k in ["traffic", "vehicle", "helmet", "चालान", "हेलमेट", "गाड़ी"]):
                out.append("1. डिजिलॉकर/एम-परिवहन पर दस्तावेज़ दिखाएँ — कानूनी रूप से मान्य [MVA Section 130]।")
                out.append("2. चालान की जाँच echallan.parivahan.gov.in पर करें।")
                out.append("3. वैध चालान का भुगतान ऑनलाइन करें; विवाद में वर्चुअल कोर्ट में contest करें [MVA Section 208]।")
            elif any(k in q_lower for k in ["consumer", "refund", "defective", "रिफंड", "दोषपूर्ण", "वारंटी", "दुकान"]):
                out.append("1. विक्रेता को लिखित मांग (ई-मेल/पत्र) भेजें — दोषपूर्ण सामान पर रिफंड, बदलने या मरम्मत।")
                out.append("2. दोषपूर्ण उत्पाद पर रिफंड से मना करना अनुचित व्यापार है [CPA Section 2(47)]।")
                out.append("3. शिकायत e-Daakhil पोर्टल पर ऑनलाइन दर्ज करें [CPA Section 35]।")
                out.append("4. जिला उपभोक्ता आयोग: दोषपूर्ण सामान पर रिफंड, क्षतिपूर्ति व litigation costs [CPA Section 39]।")
            else:
                out.append("1. ऊपर दिए प्रावधानों को अपने मामले में लागू करें।")
                out.append("2. इनके बाहर किसी भी विषय के लिए टेली-लॉ 14454 पर कॉल करें।")
                out.append("3. कार्रवाई से पहले इस ऐप के 'Find a Lawyer' से सत्यापित अधिवक्ता से बात करें।")

            out.append("\n(नोट: IPC→BNS, CrPC→BNSS और Evidence Act→BSA परिवर्तन प्रभावी हैं।)")
            out.append("\nLegal information, not legal advice.")
            return "\n".join(out)
            
        # Default English Response — structured, query-matched advice.
        out = [
            f"Here is focused legal guidance for your question: \"{user_query}\"\n",
        ]
        out.append("What the statute says (from the retrieved provisions):\n")
        for idx, s in enumerate(sources[:3], 1):
            content = s['content'].strip()
            summary = content[:420] + ("..." if len(content) > 420 else "")
            out.append(f"{idx}. [{s['act']}, {s['section']}] — {s['title']}")
            out.append(summary + "\n")

        out.append("Practical steps to act on this:\n")
        if any(k in q_lower for k in ["police", "arrest", "warrant", "stop", "custody", "lockup", "interrogation"]):
            out.append("1. Ask the exact grounds of arrest and whether the offence is bailable [BNSS Section 47 (CrPC S.50)].")
            out.append("2. Insist on a written arrest memo countersigned by one witness and immediate information to a family member [BNSS Section 36 (CrPC S.41B)].")
            out.append("3. For offences punishable up to 7 years, demand a formal Notice of Appearance instead of arbitrary arrest [BNSS Section 35 (CrPC S.41A)].")
            out.append("4. Consult an advocate of your choice during interrogation [BNSS Section 38 (CrPC S.41D)].")
            out.append("5. If you are a woman, arrest can be made only by a woman officer, between sunrise and sunset, and in exceptional circumstances with prior written permission of a Judicial Magistrate [BNSS Section 43 (CrPC S.46)].")
            out.append("6. An arrested person must be produced before a Magistrate within 24 hours of police custody [BNSS Section 57 (CrPC S.57)]; beyond that, detention is unlawful.")
        elif any(k in q_lower for k in ["zero fir", "fir", "complaint", "report"]):
            out.append("1. Go to the nearest police station — jurisdiction does not matter for a Zero FIR [BNSS Section 173 (CrPC S.154)].")
            out.append("2. The officer must register your information in writing free of cost; request a copy.")
            out.append("3. If the police refuse, approach the district Superintendent of Police (SP) or call Tele-Law 14454.")
            out.append("4. Ask for the Zero FIR to be transferred to the jurisdictional station, and note the transfer number.")
        elif any(k in q_lower for k in ["traffic", "vehicle", "helmet", "licence", "speed", "mva", "challan", "driving"]):
            out.append("1. Present your documents digitally via DigiLocker or mParivahan — legally valid under CMVR Rule 139 and MVA Section 130.")
            out.append("2. Verify the challan details first (vehicle number, date, section, amount) on echallan.parivahan.gov.in.")
            out.append("3. If valid, pay online via the Virtual Court route [MVA Section 208] or echallan.parivahan.gov.in — never through third parties.")
            out.append("4. If you dispute the challan, contest it before the Virtual Court / Lok Adalat with documents (receipts, licence, PUC, dashcam) [MVA Section 208].")
            out.append("5. For helmet offences remember: compliant helmet is mandatory for rider and pillion [MVA Section 129]; fines apply [MVA Section 194D].")
        elif any(k in q_lower for k in ["consumer", "refund", "defective", "product", "store", "warranty"]):
            out.append("1. Send a written demand (email/letter) to the seller — refund, replacement, or repair — quoting invoice and warranty.")
            out.append("2. Keep the receipt/invoice; refusing to refund a defective product is an unfair trade practice [CPA, Section 2(47)].")
            out.append("3. File a consumer complaint: in person, via postal mail, or online through e-Daakhil [CPA, Section 35] — no lawyer required.")
            out.append("4. District Commission jurisdiction: up to Rs 50 lakh [CPA, Section 34]; supported relief includes refund, replacement, damages for agony/harassment, and litigation costs [CPA, Section 39].")
            out.append("5. File within 2 years of the cause of action (delay can be condoned with reasons) [CPA, Section 69].")
        elif any(k in q_lower for k in ["rti", "information", "pio"]):
            out.append("1. File the RTI application to the concerned Public Information Officer with full particulars [RTI Act, Section 6].")
            out.append("2. No reason is needed; application fee is Rs 10 (postal/online) [RTI Act, Section 6].")
            out.append("3. PIO must respond within 30 days (48 hours for life/liberty) [RTI Act, Section 7].")
            out.append("4. No/delayed reply → first appeal under Section 19 [RTI Act]; penalties up to Rs 25,000 can be imposed on a defaulting officer [RTI Act, Section 20].")
        else:
            out.append("1. Use the retrieved provisions above as the anchor for your situation.")
            out.append("2. For anything outside these texts, call the Tele-Law helpline at 14454 (free).")
            out.append("3. Speak to a verified advocate from the Find a Lawyer directory in this app before acting.")

        out.append("\nRemember: nothing here overrides an advocate's advice on your specific facts.")
        out.append("\n(Note: IPC→BNS, CrPC→BNSS, and Evidence Act→BSA transitions have taken effect.)")
        out.append("\nLegal information, not legal advice.")

        return "\n".join(out)

gemini_service = GeminiService()
