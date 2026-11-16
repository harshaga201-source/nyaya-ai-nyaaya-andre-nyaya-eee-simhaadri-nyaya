# NyayaSathi - 5-Minute Demo Walkthrough Script

Welcome to **NyayaSathi (न्यायसाथी)** — a unified, multilingual Indian legal awareness assistant built from a single codebase for Web, Android, and iOS.

---

## ⏱️ Demo Agenda (5 Minutes)
1. **Minute 1: Overview & Language Adaptability** (Home Screen & Indic Language Selector)
2. **Minute 2: Voice-First Legal Assistance** (Audio recording, transcription, editable review & TTS)
3. **Minute 3: Document Reader** (Analyzing challans & court notices without storing files)
4. **Minute 4: Traffic Fine Dispute Wizard** (MVA section validation & bilingual contest letter)
5. **Minute 5: Complaint Drafting & Cache Speed-up** (Zero FIR / Consumer draft & ⚡ Instant Cached Answer)

---

## 🚀 Pre-Demo Quickstart
Ensure the backend and frontend are running:
```bash
# Terminal 1: Start Python Backend (Port 8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start Expo Web (Port 8081)
cd frontend
npx expo start --web
```
Open **`http://localhost:8081`** in your browser.

---

## 🎬 Walkthrough Script

### Minute 1: Hero & Multilingual Switcher (0:00 - 1:00)
- **Show**: Home screen with the Deep Navy (`#0B1F3A`), Gold (`#C9A227`), and Ivory (`#FAF7F0`) justice theme. Point out original vector illustrations (Scales of Justice, Gavel, Courthouse Pillars, Law Books).
- **Action**: Tap the language button in the top right header (`🌐 English`).
- **Showcase**: Select **Hindi (हिन्दी)** or **Tamil (தமிழ்)** or **Kannada (ಕನ್ನಡ)**.
- **Narrate**: *"NyayaSathi remembers language preferences across sessions. Every statutory concept is translated empathetically while keeping exact statutory section numbers in English in brackets beside the legal term."*
- **Action**: Switch back to English or keep in your preferred language.

---

### Minute 2: Voice-First Interaction (1:00 - 2:00)
- **Action**: Navigate to the **Voice** tab or click the big **"Ask by Voice"** card on Home.
- **Action**: Tap the central microphone button. Speak:
  > *"What are my legal rights if the police arrest me without a warrant?"*
- **Showcase**:
  1. The microphone turns active red during recording.
  2. Gemini multimodal transcribes the speech into the **editable review box**.
  3. Point out: *"Citizens can review and edit their words before sending to ensure names and details are exact."*
  4. Click **"Get Statutory Legal Answer →"**.
  5. The response appears with statutory citations (`Section 35 BNSS`, `Section 36 Arrest Memo`, `Section 47 Grounds of Arrest`).
  6. Tap **"Listen Aloud" (🔊)** to hear the synthesized audio in the target Indic language.

---

### Minute 3: Document Reader (2:00 - 3:00)
- **Action**: Click the **Doc Reader** tab.
- **Showcase**:
  1. Note the prominent privacy guarantee: *"Documents are parsed strictly in-memory by Gemini and NEVER persisted to disk."*
  2. Click **"Select PDF / Doc"** or **"Upload Photo"**. Upload any legal notice, traffic ticket, or summons.
  3. In seconds, NyayaSathi segments the document into 6 clean cards:
     - **Document Type**: (e.g. Traffic Challan / Demand Notice)
     - **Parties Identified**: (Issuing Authority vs Citizen)
     - **Key Dates & Amounts**: (Deadlines and financial figures)
     - **Sections Cited**: (e.g. MVA Section 183 / BNSS Section 35)
     - **What This Means in Plain Words**: Plain-language explanation without legalese.
     - **What You Should Do Next & Deadlines**: Bullet points with deadlines (e.g. 15-day Virtual Court limit).

---

### Minute 4: Traffic Fine Dispute Wizard (3:00 - 4:00)
- **Action**: Click the **Traffic Fine** tab.
- **Scenario**: A two-wheeler rider received an incorrect challan.
  - Challan No: `DL1420268841`
  - Vehicle: `Two-Wheeler`
  - Violation: `Driving without helmet`
  - Section Charged: `Section 194D`
  - Dispute Reason: Select **"Valid Documents in DigiLocker/mParivahan"** or **"Camera / Sensor Glitch"**.
  - Explanation: *"I was wearing an ISI-certified helmet; camera captured the pillion shadow incorrectly."*
- **Action**: Tap **"Evaluate Dispute & Generate Letter →"**.
- **Showcase**:
  1. **Statutory Review**: Shows whether the charged section matches the violation.
  2. **Citizen Options**: Virtual Court contest, Lok Adalat settlement, Regular Traffic Court, or online portal compounding.
  3. **Ready-to-Submit Contest Letter**: Generated formal representation addressed to the Virtual Court / Presiding Officer with placeholders (`[VEHICLE NUMBER]`).
  4. Tap **"📋 Copy English"** or **"📋 Copy Translated"** to paste directly into the official portal.
  5. Official steps with `echallan.parivahan.gov.in`.

---

### Minute 5: Complaint Drafting & Cache Speed-up (4:00 - 5:00)
- **Action**: Click the **Draft Complaint** tab.
  - Select **"Police Complaint / FIR Request"** or **"Consumer Commission Dispute"**.
  - Notice the mandatory banner: *"⚠️ Review with a lawyer before filing."*
  - Fill: Complainant Name (`Rajesh Verma`), Incident Place (`Connaught Place`), Narration (`Merchant took payment via UPI but refused delivery and withheld refund`), Relief (`Full refund with interest`).
  - Click **"Generate Legal Complaint Draft →"**.
  - View the formal petition formatted with exact citations (`Section 173 BNSS` Zero FIR mandate, `Section 318(4) BNS`, `Consumer Protection Act Section 35`).
  - Click **"📄 Export / Print PDF"** to trigger formatted PDF printing/sharing.

- **Action**: Now demonstrate the **⚡ Instant Cache Speed-up**:
  1. Open the **Ask Legal (Chat)** tab.
  2. Type: *"What is the fine for driving without helmet?"*
  3. The first request queries the knowledge base in ~200-400 ms.
  4. Ask the same question again (or similar wording):
  5. The answer appears **instantly in 0-5 ms** with the gold badge:
     `⚡ instant answer (cached: exact)` or `⚡ instant answer (cached: semantic)`.
  6. Open the **/admin** dashboard to show the live telemetry:
     - **Cache Hit Rate**: %
     - **Average Response Latency**: ms
     - **Live Audit Log**: showing instant cache hits vs RAG runs.

---

### Emergency Layer Showcase (Bonus 30 Seconds)
- In the chat, type:
  > *"I was beaten and illegally detained by police in lockup"*
- Observe the **🚨 Emergency Banner** prominently rendered at the very top of the answer with one-touch dial buttons for:
  - **112** (National Emergency)
  - **181** (Women Helpline)
  - **1098** (Childline)
  - **1930** (Cyber Crime)
  - **14454** (Tele-Law / Free Legal Aid)

---
*NyayaSathi — Bridging Indian Citizens with Justice Through Accessible, Transparent, Multilingual AI.*
