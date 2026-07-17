import { View, ActivityIndicator } from "react-native";
import React from "react";
import { useAuth } from "$/hooks/useAuth";
import { Redirect } from "expo-router";

const Index = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-content-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)/home" : "/(auth)/login"} />;
};

export default Index;
