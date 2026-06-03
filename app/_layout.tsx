import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@/hooks/useLanguage';
import { seedRoutesIfEmpty } from '@/services/firebase';

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) seedRoutesIfEmpty().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
