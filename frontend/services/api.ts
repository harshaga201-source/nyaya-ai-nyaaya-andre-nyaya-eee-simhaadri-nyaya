import { Platform } from 'react-native';

// Resolve backend URL dynamically for Web, Android emulator, iOS simulator, or LAN
export function getBackendUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000`;
  }
  // For Expo mobile apps, fallback to standard localhost or customizable via environment
  return process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
}

const REQUEST_TIMEOUT_MS = 25000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection or verify the NyayaSathi backend server is running.');
    }
    throw new Error('Unable to reach NyayaSathi backend. Please verify your connection or start the backend service on port 8000.');
  }
}

export interface ChatPayload {
  message: string;
  language: string;
  session_id?: string;
  force_refresh?: boolean;
}

export interface CitationItem {
  act: string;
  section: string;
  title?: string;
  summary?: string;
}

export interface EmergencyPayload {
  is_emergency: boolean;
  category?: string;
  helplines: Array<{ service: string; number: string; description: string }>;
  advisory?: string;
}

export interface ChatResponseData {
  answer: string;
  language: string;
  citations: CitationItem[];
  is_cached: boolean;
  cache_type?: string;
  emergency?: EmergencyPayload;
  response_time_ms: number;
  disclaimer: string;
}

export async function sendChatMessage(payload: ChatPayload): Promise<ChatResponseData> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Server returned error (${res.status}): ${errText}`);
  }
  return await res.json();
}

export interface TranscribeResult {
  transcript: string;
  language: string;
  confidence: number;
  engine?: string;
  auto_detected?: boolean;
  method?: string;
}

export interface SpeechStatus {
  server_stt: boolean;
  engine: string;
  model?: string | null;
  gemini?: boolean;
  local_ready?: boolean;
  auto_detect: boolean;
  languages: string[];
}

export async function getSpeechStatus(): Promise<SpeechStatus> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/speech/status`, {}, 8000);
  if (!res.ok) throw new Error('Speech status unavailable.');
  return await res.json();
}

export async function transcribeAudio(
  audioBlobOrUri: any,
  language: string = 'auto',
  autoDetect: boolean = true
): Promise<TranscribeResult> {
  const baseUrl = getBackendUrl();
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const isWav =
      typeof audioBlobOrUri?.type === 'string' && audioBlobOrUri.type.includes('wav');
    formData.append('audio', audioBlobOrUri, isWav ? 'recording.wav' : 'recording.webm');
  } else {
    formData.append('audio', {
      uri: audioBlobOrUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);
  }
  formData.append('language', language);
  formData.append('auto_detect', autoDetect ? 'true' : 'false');

  // Local Whisper inference can take longer than a normal chat request on the
  // first call (model paging in), so allow extra headroom.
  const res = await fetchWithTimeout(
    `${baseUrl}/transcribe`,
    { method: 'POST', body: formData },
    90000
  );
  if (!res.ok) {
    throw new Error('Transcription service encountered an error.');
  }
  const data = await res.json();
  return {
    transcript: data.transcript || '',
    language: data.language || language || 'en',
    confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    engine: data.engine,
    auto_detected: !!data.auto_detected,
    method: data.method,
  };
}

export interface DocumentAnalysisData {
  document_type: string;
  parties: string[];
  key_dates_and_amounts: string[];
  sections_cited: string[];
  plain_meaning: string;
  action_items_and_deadlines: string[];
  language: string;
  disclaimer: string;
}

export async function analyzeDocumentFile(
  fileData: { uri: string; name: string; type: string; blob?: Blob },
  language: string
): Promise<DocumentAnalysisData> {
  const baseUrl = getBackendUrl();
  const formData = new FormData();

  if (Platform.OS === 'web' && fileData.blob) {
    formData.append('file', fileData.blob, fileData.name);
  } else {
    formData.append('file', {
      uri: fileData.uri,
      name: fileData.name,
      type: fileData.type || 'application/pdf',
    } as any);
  }
  formData.append('language', language);

  const res = await fetchWithTimeout(`${baseUrl}/document/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error('Document analysis failed. Please ensure the document is a valid PDF or image.');
  }
  return await res.json();
}

export interface TrafficDisputePayload {
  challan_number: string;
  date: string;
  place: string;
  vehicle_type: string;
  violation_charged: string;
  section_charged: string;
  fine_amount?: string;
  dispute_reason: string;
  custom_explanation?: string;
  language: string;
}

export interface TrafficDisputeData {
  section_matches: boolean;
  section_analysis: string;
  options: Array<{ name: string; description: string }>;
  draft_contest_letter_target_lang: string;
  draft_contest_letter_english: string;
  submission_steps: string[];
  official_portal_url: string;
  disclaimer: string;
}

export async function disputeTrafficFine(payload: TrafficDisputePayload): Promise<TrafficDisputeData> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/traffic/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to evaluate traffic fine dispute.');
  }
  return await res.json();
}

export interface ComplaintDraftPayload {
  complaint_type: string;
  complainant_name: string;
  complainant_contact: string;
  complainant_address: string;
  opposite_party: string;
  date_of_incident: string;
  place_of_incident: string;
  incident_details: string;
  relief_sought: string;
  language: string;
}

export interface ComplaintDraftData {
  complaint_type: string;
  title: string;
  formatted_draft: string;
  sections_cited: string[];
  target_authority: string;
  language: string;
  banner_warning: string;
  disclaimer: string;
}

export async function draftComplaint(payload: ComplaintDraftPayload): Promise<ComplaintDraftData> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/complaint/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to generate formal complaint draft.');
  }
  return await res.json();
}

export interface Lawyer {
  id: string;
  name: string;
  city: string;
  state: string;
  area: string;
  pincode: string;
  address: string;
  court: string;
  languages: string[];
  practice_area: string;
  years_experience: number;
  bar_council_no: string;
  phone?: string;
  email?: string;
  status: string;
  is_sample: boolean;
}

export interface LawyerLocationSuggestion {
  label: string;
  value: string;
  type: 'city' | 'area' | 'state' | string;
  city: string;
  state: string;
}

export async function fetchLawyers(filters: { location?: string; city?: string; language?: string; practice_area?: string }): Promise<Lawyer[]> {
  const baseUrl = getBackendUrl();
  const params = new URLSearchParams();
  const location = (filters.location || filters.city || '').trim();
  if (location) params.append('location', location);
  if (filters.language) params.append('language', filters.language);
  if (filters.practice_area) params.append('practice_area', filters.practice_area);

  const res = await fetchWithTimeout(`${baseUrl}/lawyers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load lawyers directory.');
  return await res.json();
}

export async function fetchLawyerLocations(query: string, limit = 8): Promise<LawyerLocationSuggestion[]> {
  const baseUrl = getBackendUrl();
  const params = new URLSearchParams();
  if (query.trim()) params.append('q', query.trim());
  params.append('limit', String(limit));

  const res = await fetchWithTimeout(`${baseUrl}/lawyers/locations?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load location suggestions.');
  return await res.json();
}

export async function registerLawyer(data: any): Promise<any> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/lawyers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit lawyer registration.');
  return await res.json();
}

export async function requestConsultation(data: any): Promise<any> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/lawyers/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit consultation request.');
  return await res.json();
}

export async function submitFeedback(data: any): Promise<any> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit feedback.');
  return await res.json();
}

export async function fetchAdminStats(): Promise<any> {
  const baseUrl = getBackendUrl();
  const res = await fetchWithTimeout(`${baseUrl}/admin/stats`);
  if (!res.ok) throw new Error('Failed to load admin telemetry stats.');
  return await res.json();
}
