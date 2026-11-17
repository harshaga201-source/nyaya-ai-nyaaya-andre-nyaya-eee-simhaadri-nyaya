import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { LANGUAGES } from '../constants/Translations';

export function getSpeechLanguageCode(langCode: string): string {
  const found = LANGUAGES.find(l => l.code === langCode);
  return found ? found.speechCode : 'en-IN';
}

/**
 * Build a short, natural spoken summary from the full statutory answer:
 * the intro sentence plus the citizen-rights bullets. We mute the raw statute
 * excerpts (citations are on screen for reading), so the voice feels like a
 * legal assistant speaking, not a law book being recited.
 */
export function spokenSummary(answer: string): string {
  if (!answer) return '';
  const lines = answer.split('\n').map((l) => l.trim());

  const bullets = lines.filter((l) => l.startsWith('•'));
  const intro = lines.find((l) => l.length > 10 && !/^(1\.|2\.|3\.|•|\[|नोट|గమనిక|குறிப்பு|NOTE|DISCLAIMER)/i.test(l) && !l.startsWith('Note')) ?? '';

  // Keep it short: intro + up to 4 safeguard bullets, no citation digits.
  const spoken = [
    intro,
    ...bullets.slice(0, 4),
  ]
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();

  return spoken;
}

export function speakLegalText(text: string, langCode: string, onDone?: () => void) {
  const targetCode = getSpeechLanguageCode(langCode);

  const safeText = spokenSummary(typeof text === 'string' ? text : String(text ?? '')) || '';
  const cleanSpeechText = safeText
    .replace(/\[Source \d+\]:?/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .trim();

  if (!cleanSpeechText) {
    onDone?.();
    return;
  }

  if (Platform.OS === 'web') {
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      const Utterance = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : undefined;
      if (synth && typeof Utterance === 'function') {
        synth.cancel();
        const utterance = new Utterance(cleanSpeechText);
        utterance.lang = targetCode;
        utterance.rate = 0.95;

        // Prefer an installed voice that matches the selected Indic language.
        const voices = synth.getVoices?.() || [];
        const base = targetCode.split('-')[0].toLowerCase();
        const matchedVoice =
          voices.find((v) => v.lang?.toLowerCase() === targetCode.toLowerCase()) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith(base));
        if (matchedVoice) utterance.voice = matchedVoice;

        if (onDone) {
          utterance.onend = () => onDone();
          utterance.onerror = () => onDone();
        }
        synth.speak(utterance);
        return;
      }
    } catch (err) {
      console.warn('Browser speech synthesis unavailable:', err);
      onDone?.();
      return;
    }
  }

  // Mobile expo-speech
  try {
    Speech.stop();
    Speech.speak(cleanSpeechText, {
      language: targetCode,
      pitch: 1.0,
      rate: 0.95,
      onDone: onDone,
      onError: onDone,
    });
  } catch (err) {
    console.warn('Native speech synthesis unavailable:', err);
    onDone?.();
  }
}

export function stopLegalSpeech() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } else {
    Speech.stop();
  }
}
