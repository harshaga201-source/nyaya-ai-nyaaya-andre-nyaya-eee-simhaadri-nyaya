import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'nyayasathi_language';

export async function getSavedLanguage(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return saved || 'en';
  } catch (e) {
    return 'en';
  }
}

export async function saveLanguage(langCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
  } catch (e) {
    console.warn('Failed to save language preference:', e);
  }
}
