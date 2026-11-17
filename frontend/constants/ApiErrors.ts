import { TRANSLATIONS, TranslationStrings } from './Translations';

// Default (English) messages thrown by services/api.ts. When one of these
// surfaces in a screen we swap it for the equivalent string in the language
// the citizen has selected, so error feedback follows the UI language.
const API_ERROR_KEYS: (keyof TranslationStrings)[] = [
  'apiTimeout',
  'apiUnreachable',
  'apiTranscriptionError',
  'apiDocAnalysisFail',
  'apiTrafficFail',
  'apiComplaintFail',
  'apiLawyersFail',
  'apiRegisterFail',
  'apiConsultFail',
  'apiFeedbackFail',
  'apiAdminFail',
];

export function localizeApiError(
  message: string | undefined | null,
  language: string
): string {
  if (!message) return '';
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const en = TRANSLATIONS.en;

  // Dynamic backend error envelope: "Server returned error (500): detail"
  const serverErr = /^Server returned error \((\d+)\):\s*([\s\S]*)$/.exec(message);
  if (serverErr) {
    return `${t.apiServerErrorPrefix} (${serverErr[1]}): ${serverErr[2]}`;
  }

  for (const key of API_ERROR_KEYS) {
    if (message === en[key]) return t[key];
  }

  return message;
}
