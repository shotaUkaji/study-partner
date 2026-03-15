import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useSessionStore } from '@/store/sessionStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSessions = useSessionStore(s => s.loadSessions);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSessions()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  return (
    <ShareIntentProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f5f0e8' },
          headerTintColor: '#1a1612',
          contentStyle: { backgroundColor: '#f5f0e8' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/new" options={{ title: '新しい調べごと', presentation: 'modal' }} />
        <Stack.Screen name="session/[id]" options={{ title: '' }} />
        <Stack.Screen name="session/[id]/memo" options={{ title: 'セッションメモ' }} />
      </Stack>
    </ShareIntentProvider>
  );
}
