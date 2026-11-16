import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { LANGUAGES } from '../constants/Translations';

export function getSpeechLanguageCode(langCode: string): string {
  const found = LANGUAGES.find(l => l.code === langCode);
  return found ? found.speechCode : 'en-IN';
}

export function speakLegalText(text: string, langCode: string, onDone?: () => void) {
  const targetCode = getSpeechLanguageCode(langCode);

  // Clean text from bracketed citations and disclaimers for smoother audio reading
  const cleanSpeechText = text
    .replace(/\[Source \d+\]:?/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .trim();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
      utterance.lang = targetCode;
      utterance.rate = 0.95;
      if (onDone) {
        utterance.onend = () => onDone();
        utterance.onerror = () => onDone();
      }
      window.speechSynthesis.speak(utterance);
      return;
    }
  }

  // Mobile expo-speech
  Speech.stop();
  Speech.speak(cleanSpeechText, {
    language: targetCode,
    pitch: 1.0,
    rate: 0.95,
    onDone: onDone,
    onError: onDone,
  });
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
