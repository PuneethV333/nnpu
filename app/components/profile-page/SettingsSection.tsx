import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "$/hooks/useAuth";

const SettingsSection = () => {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const items: {
    icon: "lock" | "bell" | "log-out";
    label: string;
    onPress: () => void;
    danger?: boolean;
    showChevron?: boolean;
  }[] = [
    {
      icon: "lock",
      label: "Change Password",
      onPress: () => router.push("/change-pass"),
      showChevron: true,
    },
    {
      icon: "log-out",
      label: "Logout",
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <View className="mt-6 mx-4 bg-white rounded-2xl border border-gray-100">
      {items.map((item, idx) => {
        const isLogout = item.label === "Logout";
        const disabled = isLogout && loggingOut;

        return (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            disabled={disabled}
            className={`flex-row items-center px-4 py-4 ${
              idx !== items.length - 1 ? "border-b border-gray-100" : ""
            }`}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#F9FAFB" : "transparent",
              opacity: disabled ? 0.5 : 1,
            })}
          >
            <Feather
              name={item.icon}
              size={18}
              color={item.danger ? "#DC2626" : "#374151"}
            />
            <Text
              className={`ml-3 text-[15px] font-medium flex-1 ${
                item.danger ? "text-red-600" : "text-gray-800"
              }`}
            >
              {item.label}
            </Text>

            {isLogout && loggingOut ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              item.showChevron && (
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              )
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

export default SettingsSection;
