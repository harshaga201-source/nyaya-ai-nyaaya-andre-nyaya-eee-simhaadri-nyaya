# ⚖️ NyayaSathi (न्यायसाथी)
### Multilingual Indian Legal Awareness AI Assistant
**One Codebase for Web, Android, and iOS**

NyayaSathi is a demo-ready, citizen-centric legal awareness platform designed to democratize access to statutory law in India. Built with **React Native / Expo** (supporting Web, Android, and iOS via Expo Go) and a **Python FastAPI** backend powered by Google Gemini, SQLite RAG, and an exact/semantic multi-tier cache.

---

## 🌟 Key Capabilities
- **Strictly Grounded RAG Knowledge Base**: Ingests statutory codes from `/data/laws/` (Motor Vehicles Act 1988/2019, Consumer Protection Act 2019, RTI Act 2005, BNSS/CrPC, BNS/IPC, BSA/Evidence Act). Cites `"Act, Section X"` for every claim, includes IPC->BNS and CrPC->BNSS cross-mappings, and never invents sections. Retrieval is act-family aware and relevance-gated: off-topic questions are refused with a Tele-Law (14454) pointer instead of being answered with unrelated provisions, and consumer/RTI/traffic/criminal intents never cite each other's statutes.
- **11 Languages Supported**: English, Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Marathi (मराठी), Bengali (বাংলা), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), and Urdu (اردو). Persistent language preference storage.
- **Voice-First Interaction**: Speak in any of the 11 supported languages — NyayaSathi auto-detects the spoken language (`en, hi, ta, te, kn, ml, mr, bn, gu, pa, ur`), switches the whole UI to it, and answers and speaks back in the same language. Audio recording via `expo-av` / browser `MediaRecorder` (16 kHz WAV), local whisper.cpp acoustic language ID, Gemini multimodal transcription when configured, editable review box before querying, and native text-to-speech with Indic voice codes (`hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, etc.).
- **Privacy-First Document Reader**: Analyze challans, court summons, and contracts using Gemini multimodal with structured extraction (Parties, Dates/Amounts, Sections Cited, Plain Words Meaning, Action Items & Deadlines). Files are processed strictly in-memory and **never stored on disk**.
- **Traffic Fine Dispute Wizard**: Validates alleged violations against Motor Vehicles Act sections, identifies discrepancies, outlines citizen legal options (Virtual Court, Lok Adalat, Magistrate Court), and produces ready-to-submit bilingual contest letters.
- **Complaint Generator**: Step-by-step drafting for Police Complaints / Zero FIR requests (Section 173 BNSS), Consumer Commission Complaints (Section 35 CPA 2019), Cyber Crime grievances, and RTI applications. Exportable/printable to PDF (`expo-print`, `expo-sharing`, `window.print`).
- **Emergency Safety Layer**: Real-time detection of violence, abuse, arrest, suicide, and threats with immediate 24/7 helplines (**112**, **181**, **1098**, **1930**, **Tele-Law 14454**).
- **Dual-Tier Cache with UI Badge**: Exact normalized cache + semantic embedding similarity cache (cosine similarity >= 0.92) delivering instant answers in <5ms with a `⚡ instant answer (cached)` badge.
- **Find a Lawyer Directory**: 66 verified demo advocate profiles across 22 Indian cities (3 per city), each with locality, 6-digit PIN, chamber address, primary court, languages, practice area, experience, Bar Council number, phone, and email. Location search matches city, locality, state, PIN code, court, common spellings/aliases (`Bangalore`, `Bombay`, `Gurgaon`, `Delhi NCR`), native-script names, and typo-tolerant input, with autocomplete suggestions. Combined language and practice-area filters, consultation requests with consent, and lawyer registration with strict validation; new registrations stay hidden as `pending_verification` until approved.
- **Admin Telemetry & Quality Control**: `/admin` dashboard tracking queries, cache hit rates, average response latency, and citizen feedback.

---

## 🏛️ Architecture & Tech Stack

```
nyayasathi/
├── data/
│   └── laws/                  # Knowledge Base (BNS, BNSS, BSA, MVA, CPA, RTI)
├── backend/                   # Python FastAPI MVC Backend
│   ├── config.py              # Centralized config isolating Gemini model names
│   ├── main.py                # App entrypoint & CORS middleware
│   ├── models/                # SQLite schema & Pydantic models
│   ├── routers/               # Controllers (chat, voice, doc, traffic, complaint, lawyers, admin)
│   ├── services/              # Business logic (RAG, Gemini, Cache, Emergency)
│   ├── scripts/ingest.py      # Automated section chunking & vector ingestion
│   └── tests/                 # 30-Question legal evaluation benchmark
├── frontend/                  # Unified Expo (React Native + TypeScript) App
│   ├── app/                   # Expo Router file-based routes
│   │   ├── (tabs)/            # Home, Chat, Voice, Doc, Traffic, Complaint, Lawyers, Rights, Feedback
│   │   ├── admin.tsx          # Web & mobile Admin telemetry view
│   │   └── _layout.tsx        # Root navigation & language context
│   ├── components/            # Header, CitationChip, EmergencyBanner, CacheBadge, VoiceSpeech
│   └── constants/             # Colors, Translations, SVG Illustrations
└── package.json               # Root scripts (demo, backend, web, mobile, ingest, eval)
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** and **npm / pnpm**

### 2. Backend Setup
1. Open a terminal in the project directory:
   ```bash
   cd nyayasathi
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Configure environment variables in `backend/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   BACKEND_URL=http://localhost:8000
   HOST=0.0.0.0
   PORT=8000
   ```
   *(Note: NyayaSathi is equipped with a high-fidelity local deterministic legal engine fallback that works out-of-the-box even if no API key is provided).*

5. Run statutory law ingestion:
   ```bash
   python -m backend.scripts.ingest
   ```
6. (Recommended) Install the offline speech engine for automatic spoken-language detection:
   ```bash
   python scripts/setup_speech.py
   ```
   Downloads the `whisper.cpp` Windows binary and the multilingual `small` model into `backend/tools/whisper` (git-ignored, ~620 MB). The small `base` model is used for a fast (~1 s) acoustic language-ID pass; the `small` model then transcribes in the detected language. Set `WHISPER_CPP_MODEL` to use a different model. Without this step voice still works through the browser recognizer, and `GET /speech/status` reports `engine: "none"`.

7. Start the FastAPI backend server:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Backend is live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

---

### 3. Frontend Setup (Web, Android, iOS)
1. Open a second terminal:
   ```bash
   cd nyayasathi/frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   pnpm install
   # OR
   npm install
   ```

#### A. Run as a Web Application:
```bash
npx expo start --web
```
*Opens automatically at `http://localhost:8081`.*

#### B. Run on Android or iOS (Expo Go):
```bash
npx expo start
```
- Install the **Expo Go** app on your physical Android or iPhone device from Google Play or the Apple App Store.
- Scan the QR code displayed in your terminal using the Expo Go camera (Android) or the native Camera app (iOS).

---

## 📱 Exposing Backend to Physical Phones (LAN / Tunnel)

When running on a physical phone via Expo Go, your phone cannot reach `http://localhost:8000`. Choose one of two methods:

### Method 1: Same Wi-Fi LAN IP (Recommended)
1. Ensure your PC and mobile phone are connected to the **same Wi-Fi network**.
2. Find your PC's local IP address:
   - On Windows: Run `ipconfig` (e.g. `192.168.1.15`).
   - On Mac/Linux: Run `ifconfig` or `ip a`.
3. In `frontend/.env` (or in `frontend/services/api.ts`):
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.15:8000
   ```
4. Start the backend with `--host 0.0.0.0` (already set as default).
5. Open the app in Expo Go — your phone will seamlessly communicate with the backend.

### Method 2: Free ngrok / Cloudflare Tunnel
1. Run ngrok in a separate terminal:
   ```bash
   ngrok http 8000
   ```
2. Copy the generated public HTTPS URL (e.g. `https://abc123.ngrok-free.app`).
3. Set in `frontend/.env`:
   ```env
   EXPO_PUBLIC_BACKEND_URL=https://abc123.ngrok-free.app
   ```

### Method 3: Serve the web app to any device on your Wi-Fi (this build)
The production web bundle in `frontend/dist` is served by the backend itself (no separate port). From any phone or laptop on the **same Wi-Fi**:
```
http://<your-PC-LAN-IP>:8000
```
- On Windows: `ipconfig` → look for "IPv4 Address" (e.g. `192.168.1.10`).
- Ensure the one-time inbound firewall rule exists (admin PowerShell):
  ```powershell
  New-NetFirewallRule -DisplayName "NyayaSathi Backend (TCP 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private,Public
  ```
- Keep the server running (`python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000` from the project root).

### Method 4: Public HTTPS link (Cloudflare quick tunnel + privacy proxy)
For access outside your Wi-Fi, without a Cloudflare account:
```bash
# 1. One-time: python + this file runs on 127.0.0.1:8001 and forwards to the backend
python backend/scripts/public_proxy.py
# 2. Download cloudflared (single binary), then:
cloudflared tunnel --url http://127.0.0.1:8001
```
The tunnel prints a public `https://<random>.trycloudflare.com` URL.
- **What the proxy blocks:** `/admin*` returns **403** publicly. The admin dashboard holds citizen feedback text and has no authentication, so it must not be world-readable. Your admin is still available locally at `http://localhost:8000/admin` or on the LAN address.
- Quick tunnels have no uptime guarantee; the URL dies when the PC or either process stops. For a fixed domain, create a named tunnel (free Cloudflare account) or use ngrok with an authtoken.

**GEMINI_API_KEY (optional)**: paste a free key from [Google AI Studio](https://aistudio.google.com/apikey) into `backend/.env` — the backend loads it automatically at startup. With a key, Gemini powers chat answers, document OCR and translations; empty keeps the offline RAG engine.

---

## ⚡ 1-Click Launch Scripts (Windows)
For convenience during demo presentations, run any of the included batch scripts from the root directory:
- `run_backend.bat`: Starts the FastAPI backend on port 8000.
- `run_web.bat`: Starts the Expo Web application on port 8081.
- `run_expo.bat`: Starts Expo development server for Android/iOS.
- `run_demo.bat`: Launches both backend and web in synchronized background windows.

---

## 🧪 Evaluation Benchmark (56 Legal Questions)
NyayaSathi includes a dual verification suite — retrieval is checked **and the answer text itself is checked** (the answer must cite the expected section and out-of-scope questions must produce an honest refusal with no citations):
- 10 Traffic Law questions (Motor Vehicles Act 1988/2019)
- 10 Consumer Protection questions (Consumer Protection Act 2019)
- 10 Criminal Procedure & Fundamental Rights questions (BNSS 2023, BNS 2023, BSA 2023)
- 12 Indic-language questions (traffic, consumer, criminal procedure)
- 6 Out-of-scope questions (must be refused, never answered with unrelated statutes)
- 8 Intent-routed questions (purchase/warranty, road-stop, assault, insurance)

To execute the benchmark:
```bash
python -m backend.tests.run_eval
```
**Evaluation Results:**
- **Overall Retrieval Accuracy**: **56/56 (100.0%)**
- **Overall Answer Accuracy**: **56/56 (100.0%)**

---

## ⚖️ Architectural Decisions & Rationale
1. **Isolated AI Models in Config**: Model identifiers (`gemini-2.5-flash`, `gemini-1.5-flash`, `text-embedding-004`) are isolated strictly within `backend/config.py` to allow instant switching between model versions without touching router code.
2. **Hybrid Retrieval with Grounding Guard**: Combines semantic cosine similarity with stopword-free lexical overlap, direct section boost, and act-family intent routing, gated by a minimum-overlap rule. Off-topic questions are refused with a Tele-Law pointer rather than answered with unrelated provisions.
3. **In-Memory Document Analysis**: Files uploaded to the Document Reader are decoded into memory and forwarded directly to Gemini multimodal. Files are **never written to disk**, strictly honoring citizen data privacy.
4. **Offline / Fallback Resilience**: If network timeouts or API quotas occur, NyayaSathi gracefully falls back to deterministic statutory extraction from the local SQLite database without crashing or exposing stack traces to the user.
5. **Mandatory Disclaimer**: Every response systematically enforces the statutory reminder: *"Legal information, not legal advice."*

---
*Built for the Indian Citizenry • NyayaSathi 2026*
