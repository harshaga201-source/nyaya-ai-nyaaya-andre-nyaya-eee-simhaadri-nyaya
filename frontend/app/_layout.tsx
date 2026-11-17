import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSavedLanguage } from '../services/storage';

const LANGUAGE_KEY = 'nyayasathi_language';

// Read the persisted language synchronously on web so the very first paint is
// already in the citizen's chosen language (avoids an English flash).
function initialLanguage(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem(LANGUAGE_KEY) || 'en';
    } catch (e) {
      return 'en';
    }
  }
  return 'en';
}

export const LanguageContext = React.createContext<{
  language: string;
  setLanguage: (lang: string) => void;
}>({
  language: 'en',
  setLanguage: () => {},
});

export default function RootLayout() {
  // On web, start with the persisted language synchronously; on native, load it
  // from AsyncStorage in the effect below.
  const [language, setLanguage] = useState<string>(initialLanguage);

  useEffect(() => {
    getSavedLanguage().then((saved) => {
      if (saved) setLanguage(saved);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </LanguageContext.Provider>
    </SafeAreaProvider>
  );
}
