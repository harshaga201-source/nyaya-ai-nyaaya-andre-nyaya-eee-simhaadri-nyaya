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
        
        # Hindi Response
        if req_lang == "hi":
            out = [
                f"भारतीय वैधानिक कानून के अनुसार, आपके प्रश्न \"{user_query}\" के संदर्भ में विधिक प्रावधान निम्नलिखित हैं:\n"
            ]
            for idx, s in enumerate(sources[:3], 1):
                summary = s['content'][:260] + "..." if len(s['content']) > 260 else s['content']
                out.append(f"{idx}. [{s['act']}, {s['section']}] — {s['title']}")
                out.append(f"{summary}\n")
                
            out.append("नागरिकों के लिए मुख्य वैधानिक सुरक्षा उपाय:")
            if any(k in q_lower for k in ["police", "arrest", "warrant", "stop", "पुलिस", "गिरफ्तार", "थाना"]):
                out.append("• गिरफ्तारी के आधार: पुलिस को तुरंत गिरफ्तारी का विशिष्ट कारण और जमानत की पात्रता बतानी होगी [BNSS Section 47 (CrPC S.50)]।")
                out.append("• गिरफ्तारी मेमो (Arrest Memo): गिरफ्तारी अधिकारी को कम से कम एक स्वतंत्र साक्षी के हस्ताक्षर सहित औपचारिक मेमो बनाना अनिवार्य है [BNSS Section 36 (CrPC S.41B)]।")
                out.append("• नोटिस का अधिकार: 7 वर्ष तक की सजा वाले अपराधों में पुलिस मनमाने ढंग से गिरफ्तार नहीं कर सकती; उन्हें पहले उपस्थित होने का औपचारिक नोटिस देना होगा [BNSS Section 35 (CrPC S.41A)]।")
                out.append("• अधिवक्ता से मिलने का अधिकार: पूछताछ के दौरान अपने पसंद के वकील से परामर्श करने का वैधानिक अधिकार है [BNSS Section 38 (CrPC S.41D)]।")
                out.append("• महिलाओं की सुरक्षा: महिलाओं को सूर्यास्त के बाद और सूर्योदय से पहले केवल असाधारण परिस्थितियों में, मजिस्ट्रेट की पूर्व लिखित अनुमति से ही महिला पुलिस अधिकारी द्वारा गिरफ्तार किया जा सकता है [BNSS Section 43 (CrPC S.46)]।")
            elif any(k in q_lower for k in ["zero fir", "fir", "रिपोर्ट"]):
                out.append("• जीरो एफआईआर (Zero FIR): अपराध किसी भी क्षेत्र में हुआ हो, किसी भी नजदीकी पुलिस स्टेशन में जीरो एफआईआर दर्ज कराई जा सकती है [BNSS Section 173 (CrPC S.154)]।")
            elif any(k in q_lower for k in ["traffic", "vehicle", "helmet", "चालान", "हेलमेट", "गाड़ी"]):
                out.append("• डिजिलॉकर स्वीकृति: डिजिलॉकर या एम-परिवहन ऐप से ड्राइविंग लाइसेंस और वाहन दस्तावेज दिखाना पूरी तरह से कानूनी रूप से मान्य है [MVA Section 130]।")
                out.append("• वर्चुअल कोर्ट: ट्रैफिक चालान का निपटारा बिना थाने या कोर्ट जाए ऑनलाइन किया जा सकता है [MVA Section 208]।")
            else:
                out.append("• निःशुल्क कानूनी सहायता: पात्र नागरिक भारत सरकार की टेली-लॉ हेल्पलाइन 14454 पर कॉल करके मुफ्त कानूनी सहायता प्राप्त कर सकते हैं [Legal Services Authorities Act, Section 12]।")
                
            out.append("\n(नोट: पुराने आपराधिक कानूनों जैसे IPC, CrPC, और Evidence Act को BNS, BNSS और BSA द्वारा प्रतिस्थापित कर दिया गया है)।\n\nLegal information, not legal advice.")
            return "\n".join(out)
            
        # Default English Response
        out = [
            f"According to statutory Indian law, your rights and relevant legal provisions regarding \"{user_query}\" are:\n"
        ]
        for idx, s in enumerate(sources[:3], 1):
            summary = s['content'][:280] + "..." if len(s['content']) > 280 else s['content']
            out.append(f"{idx}. [{s['act']}, {s['section']}] — {s['title']}")
            out.append(f"{summary}\n")
            
        out.append("Key Citizen Safeguards & Statutory Rights:")
        if any(k in q_lower for k in ["police", "arrest", "warrant", "stop", "custody", "lockup", "interrogation"]):
            out.append("• Notice of Appearance: For offences punishable up to 7 years, police cannot arbitrarily arrest; they must serve a formal Notice of Appearance [BNSS Section 35 (CrPC S.41A)].")
            out.append("• Grounds of Arrest & Bail: Police must immediately inform you of the exact grounds of arrest and whether the offence is bailable [BNSS Section 47 (CrPC S.50)].")
            out.append("• Arrest Memo & Family Intimation: The arresting officer must prepare an arrest memo countersigned by at least one witness, and immediately notify a family member or nominated friend [BNSS Section 36 (CrPC S.41B)].")
            out.append("• Right to Legal Counsel: You have the statutory right to meet and consult an advocate of your choice during interrogation [BNSS Section 38 (CrPC S.41D)].")
            out.append("• Safeguards for Women: Women cannot be arrested between sunset and sunrise except under exceptional circumstances with prior written permission of a Judicial Magistrate, and only by a woman police officer [BNSS Section 43 (CrPC S.46)].")
            out.append("• 24-Hour Production Limit: An arrested person cannot be detained in police custody beyond 24 hours without production before a Magistrate [BNSS Section 57 (CrPC S.57)].")
        elif any(k in q_lower for k in ["traffic", "vehicle", "helmet", "licence", "speed", "mva", "challan"]):
            out.append("• Electronic Document Acceptance: Presenting driving licence and vehicle registration via DigiLocker or mParivahan is legally valid under Rule 139 CMVR and MVA Section 130.")
            out.append("• Virtual Courts: Traffic violations and e-challans can be contested or paid online via Virtual Courts without physically visiting a police station or court [MVA Section 208].")
            out.append("• Protective Headgear: Wearing a compliant helmet is mandatory for rider and pillion under MVA Section 129, with penalties under Section 194D.")
        elif any(k in q_lower for k in ["zero fir", "fir"]):
            out.append("• Zero FIR Right: A Zero FIR can be registered at ANY police station regardless of territorial jurisdiction where the crime occurred [BNSS Section 173 (CrPC S.154)].")
            out.append("• Immediate Recording: The police station cannot turn away the complainant; they must record the information, assign a Zero number, and transfer it to the jurisdictional police station.")
        elif any(k in q_lower for k in ["consumer", "refund", "defective", "product", "store", "warranty"]):
            out.append("• Prohibition on 'No Refund' for Defects: Stores cannot enforce 'goods once sold will not be returned' for defective products or deficient services; doing so constitutes an Unfair Trade Practice [Consumer Protection Act, Section 2(47)].")
            out.append("• e-Daakhil Online Filing: Consumers can file complaints online without physical court appearance through the e-Daakhil portal [Consumer Protection Act, Section 35].")
        elif any(k in q_lower for k in ["rti", "information", "pio"]):
            out.append("• 30-Day Mandatory Timeline: The Public Information Officer (PIO) must furnish information within 30 days of receiving the RTI application (or 48 hours if concerning life and liberty) [RTI Act, Section 7].")
            out.append("• Penalties: Non-compliance or unjustified delays attract penalties up to Rs 25,000 on the PIO [RTI Act, Section 20].")
        else:
            out.append("• Free Legal Aid: Eligible citizens (including women, children, SC/ST, and low-income individuals) have the right to free legal representation under Section 12 of the Legal Services Authorities Act. Call Tele-Law helpline at 14454.")
            
        out.append("\n(Note: Criminal codes have transitioned: Indian Penal Code [IPC] is replaced by Bharatiya Nyaya Sanhita [BNS]; Code of Criminal Procedure [CrPC] by Bharatiya Nagarik Suraksha Sanhita [BNSS]; Indian Evidence Act by Bharatiya Sakshya Adhiniyam [BSA]).\n\nLegal information, not legal advice.")
        
        return "\n".join(out)

gemini_service = GeminiService()
