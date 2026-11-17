import { LANGUAGES } from '../constants/Translations';

export interface LanguageDetection {
  language: string;
  confidence: number;
  method: string;
}

export const SUPPORTED_LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

const RANGES: Array<[number, number, string]> = [
  [0x0900, 0x097f, 'devanagari'],
  [0x0980, 0x09ff, 'bengali'],
  [0x0a00, 0x0a7f, 'gurmukhi'],
  [0x0a80, 0x0aff, 'gujarati'],
  [0x0b80, 0x0bff, 'tamil'],
  [0x0c00, 0x0c7f, 'telugu'],
  [0x0c80, 0x0cff, 'kannada'],
  [0x0d00, 0x0d7f, 'malayalam'],
  [0x0600, 0x06ff, 'arabic'],
  [0x0750, 0x077f, 'arabic'],
  [0xfb50, 0xfdff, 'arabic'],
  [0xfe70, 0xfeff, 'arabic'],
];

const SCRIPT_LANGUAGE: Record<string, string> = {
  bengali: 'bn',
  gurmukhi: 'pa',
  gujarati: 'gu',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml',
  arabic: 'ur',
};

// Grammar words and distinctive vocabulary only. Shared legal words such as
// "police", "FIR" or "helmet" are excluded because every language uses them.
const ROMAN: Record<string, Record<string, number>> = {
  hi: {
    kya: 3, kyun: 3, kyu: 3, kaise: 3, kaun: 2, kahan: 3, mujhe: 3,
    mera: 2, meri: 2, hum: 2, hamara: 2, nahi: 3, nahin: 3, hai: 2,
    karna: 3, karni: 3, karwana: 3, chahiye: 3, sakta: 2, sakti: 2,
    batao: 3, bataiye: 3, adhikar: 3, kanoon: 3, hirasat: 3, shikayat: 2,
  },
  mr: {
    kay: 3, kase: 3, kashi: 3, kon: 2, kuthe: 3, mala: 3, majha: 3,
    majhi: 3, majhe: 3, amhi: 2, amcha: 2, aahe: 4, ahe: 3, pahije: 3,
    shakta: 2, shakti: 2, sanga: 2, kayda: 3, atak: 2, chaushisi: 3, takrar: 3,
  },
  bn: {
    kemon: 3, keno: 3, kothay: 3, ami: 3, amar: 3, amake: 3, amader: 3,
    apni: 2, nei: 3, ache: 3, korbo: 3, korte: 2, chai: 2, bolun: 3,
    adhikar: 3, ain: 3,
  },
  gu: {
    shu: 3, kem: 3, kevi: 3, kyare: 3, kone: 2, hu: 3, maru: 3, mari: 2,
    ame: 2, amaru: 2, nathi: 3, che: 3, karvo: 3, karwu: 3, joie: 3,
    adhikar: 3, kaydo: 3, dharpakad: 3,
  },
  pa: {
    kive: 3, kyon: 2, kidhar: 3, kihda: 3, main: 2, mera: 2, meri: 2,
    menu: 3, asi: 2, sada: 2, nahi: 3, hai: 2, karna: 2, karni: 2,
    chahida: 3, daso: 3, adhikar: 3, kanoon: 3, giraftari: 2,
  },
  ur: {
    kya: 2, kyun: 2, mujhe: 2, mera: 2, meri: 2, hum: 2, hamara: 2,
    nahi: 2, hai: 1, karna: 2, chahiye: 2, sakta: 2, haq: 3, qanoon: 3,
    adalat: 2, muqadma: 3, zamanat: 3, shikayat: 2,
  },
  ta: {
    enna: 3, epdi: 3, eppadi: 3, ethu: 3, ethuku: 3, yaar: 2, naan: 3,
    enakku: 3, enaku: 3, ennoda: 3, illa: 3, illai: 3, irukku: 3,
    iruku: 3, venum: 3, vendum: 3, sollu: 3, sollunga: 3, sattam: 3,
    urimai: 3, kaithu: 2,
  },
  te: {
    enti: 3, ela: 3, elaa: 3, enduku: 3, evaru: 3, ekkada: 3, nenu: 3,
    naaku: 3, naadi: 2, manam: 2, maaku: 2, ledu: 3, ledhu: 3, undi: 3,
    vundhi: 3, kavali: 3, cheppandi: 3, cheppu: 3, chattam: 3, hakku: 3,
  },
  kn: {
    enu: 3, yenu: 3, hege: 3, yake: 3, yaaru: 3, elli: 3, nanu: 3,
    naanu: 3, nanage: 3, nanna: 2, illa: 3, ide: 3, beku: 3, helu: 3,
    helri: 3, kanoonu: 3, hakku: 3, bandhana: 2,
  },
  ml: {
    enthu: 3, entha: 2, engine: 3, engane: 3, evide: 3, njan: 3,
    enikku: 3, eniku: 3, ente: 3, illa: 3, undu: 3, venam: 3, parayu: 3,
    niyamam: 3, avakasham: 3,
  },
  en: {
    the: 2, is: 2, are: 2, what: 3, how: 3, why: 3, can: 2, my: 2,
    refuse: 2, warrant: 2, penalty: 2, section: 2, under: 2,
  },
};

const MARATHI_MARKERS = [
  'आहे', 'काय', 'मला', 'माझ्या', 'माझा', 'माझी', 'माझे', 'आम्ही',
  'आमच्या', 'पाहिजे', 'कसा', 'कशी', 'कसे', 'कुठे', 'नाही', 'तक्रार',
  'कायदा', 'अटक', 'चौकशी', 'हक्क', 'पोलीस', 'जामीन',
];
const HINDI_MARKERS = [
  'है', 'क्या', 'क्यों', 'कैसे', 'कौन', 'कहाँ', 'कहां', 'मुझे', 'मेरा',
  'मेरी', 'हमारा', 'नहीं', 'करना', 'करनी', 'चाहिए', 'सकता', 'सकती',
  'बताओ', 'बताइए', 'अधिकार', 'कानून', 'गिरफ्तार', 'हिरासत', 'जमानत',
  'शिकायत', 'पुलिस',
];

function scriptOf(codePoint: number): string | null {
  for (const [lo, hi, name] of RANGES) {
    if (codePoint >= lo && codePoint <= hi) return name;
  }
  return null;
}

function hits(text: string, words: string[]): number {
  let score = 0;
  for (const word of words) {
    if (word.length <= 2) {
      const re = new RegExp(`(^|[^\\w\\u0900-\\u097F])${word}([^\\w\\u0900-\\u097F]|$)`);
      if (re.test(text)) score += 2;
    } else if (text.includes(word)) {
      score += 1;
    }
  }
  return score;
}

function detectDevanagari(text: string): LanguageDetection {
  let marathi = hits(text, MARATHI_MARKERS);
  let hindi = hits(text, HINDI_MARKERS);
  if (text.includes('ळ')) marathi += 3;
  if (text.includes('क़') || text.includes('ख़') || text.includes('ज़')) hindi += 1;

  if (marathi > hindi) {
    return {
      language: 'mr',
      confidence: Math.min(0.99, 0.6 + 0.08 * (marathi - hindi)),
      method: 'script:devanagari+marathi-markers',
    };
  }
  if (hindi > marathi) {
    return {
      language: 'hi',
      confidence: Math.min(0.99, 0.6 + 0.08 * (hindi - marathi)),
      method: 'script:devanagari+hindi-markers',
    };
  }
  return { language: 'hi', confidence: 0.55, method: 'script:devanagari' };
}

function fallback(hint?: string): string {
  const code = (hint || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGE_CODES.includes(code) ? code : 'en';
}

export function detectLanguageFromText(text: string, hint?: string): LanguageDetection {
  const value = (text || '').trim();
  if (!value) {
    return { language: fallback(hint), confidence: 0, method: 'empty' };
  }

  const counts: Record<string, number> = {};
  let letters = 0;
  for (const char of value) {
    if (/\p{L}/u.test(char)) letters += 1;
    const script = scriptOf(char.codePointAt(0) || 0);
    if (script) counts[script] = (counts[script] || 0) + 1;
  }

  const scriptEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (scriptEntries.length > 0) {
    const [script, count] = scriptEntries[0];
    const share = count / Math.max(letters, 1);
    if (count >= 2 && (share >= 0.2 || count >= 4)) {
      if (script === 'devanagari') return detectDevanagari(value);
      return {
        language: SCRIPT_LANGUAGE[script],
        confidence: Math.min(0.99, 0.65 + 0.3 * share),
        method: `script:${script}`,
      };
    }
  }

  const lowered = ` ${value.toLowerCase().replace(/[^a-z\s']/g, ' ')} `;
  const scores: Record<string, number> = {};
  for (const [lang, keywords] of Object.entries(ROMAN)) {
    let score = 0;
    for (const [word, weight] of Object.entries(keywords)) {
      if (new RegExp(`(?<![a-z])${word}(?![a-z])`).test(lowered)) score += weight;
    }
    if (score > 0) scores[lang] = score;
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { language: fallback(hint), confidence: 0.4, method: 'fallback:hint' };
  }

  const [best, bestScore] = entries[0];
  const runnerUp = entries[1]?.[1] || 0;
  const hintCode = fallback(hint);
  if (bestScore < 4 && runnerUp === 0 && hintCode !== 'en') {
    return { language: hintCode, confidence: 0.45, method: 'fallback:hint' };
  }
  if (bestScore < 3) {
    return { language: hintCode, confidence: 0.4, method: 'fallback:weak' };
  }

  return {
    language: best,
    confidence: Math.min(0.98, 0.5 + 0.04 * bestScore + 0.03 * (bestScore - runnerUp)),
    method: 'romanised:keywords',
  };
}

export function speechCodeFor(language: string): string {
  const found = LANGUAGES.find((l) => l.code === language);
  return found ? found.speechCode : 'en-IN';
}

/**
 * Choose the most promising recognition language. The browser recognizer can
 * only listen to one language at a time, so prefer the device languages the
 * citizen already uses (an Indian phone/browser is usually set to their own
 * language). Script detection afterwards corrects any mismatch.
 */
export function pickRecognitionLanguage(uiLanguage: string): string {
  if (typeof navigator !== 'undefined') {
    const candidates: string[] = [];
    if (Array.isArray((navigator as any).languages)) {
      candidates.push(...(navigator as any).languages);
    }
    if ((navigator as any).language) candidates.push((navigator as any).language);

    for (const candidate of candidates) {
      const code = String(candidate || '').toLowerCase().split('-')[0];
      if (SUPPORTED_LANGUAGE_CODES.includes(code) && code !== 'en') {
        return speechCodeFor(code);
      }
    }
  }
  if (uiLanguage && uiLanguage !== 'en') return speechCodeFor(uiLanguage);
  return 'en-IN';
}

export function languageNativeName(code: string): string {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.native : 'English';
}
