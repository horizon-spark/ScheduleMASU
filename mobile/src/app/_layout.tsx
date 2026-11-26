import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { AuthProvider, useAuth } from "../context/AuthContext";

// Держим native splash, пока восстанавливаем сохранённую сессию.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

function RootNavigator() {
  const { accessToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Скрываем splash после восстановления сессии, чтобы не показывать
    // экран входа на долю секунды перед редиректом.
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    // segments[0] — имя группы: "(auth)" или "(app)"
    const inAuthGroup = segments[0] === "(auth)";

    if (!accessToken && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (accessToken && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [accessToken, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
