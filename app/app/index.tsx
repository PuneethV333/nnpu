import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import '@/global.css';
import { SplashScreen } from '@/components/ui/SplashScreen';

const Index = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <SplashScreen message="Signing you in…" />;
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/login'} />;
};

export default Index;
