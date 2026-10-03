import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Previously returned `null` here, which rendered a blank white screen for
  // as long as the token validation took.
  if (isLoading) {
    return <SplashScreen message="Signing you in…" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
