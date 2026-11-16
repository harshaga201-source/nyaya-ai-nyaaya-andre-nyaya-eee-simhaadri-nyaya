import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSavedLanguage } from '../services/storage';

export const LanguageContext = React.createContext<{
  language: string;
  setLanguage: (lang: string) => void;
}>({
  language: 'en',
  setLanguage: () => {},
});

export default function RootLayout() {
  const [language, setLanguage] = useState<string>('en');

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
