import React, { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "$/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { usePushRegistration } from "@/src/hooks/usePushRegistration";
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppShell() {
  // Must live inside AuthProvider so the token is only registered for a
  // signed-in user (the backend ties the token to that user).
  usePushRegistration();

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  const [fontsLoaded] = useFonts({
    inter_regular: Inter_400Regular,
    inter_medium: Inter_500Medium,
    inter_semi: Inter_600SemiBold,
    inter_bold: Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}