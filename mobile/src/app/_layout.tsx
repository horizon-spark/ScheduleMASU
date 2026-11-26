import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { OpenSans_400Regular } from "@expo-google-fonts/open-sans/400Regular";
import { OpenSans_600SemiBold } from "@expo-google-fonts/open-sans/600SemiBold";
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
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    OpenSans_400Regular,
    OpenSans_600SemiBold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn("[fonts] failed to load brand fonts", fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    // Native splash остаётся видимым до загрузки шрифтов и сессии.
    return null;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
