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
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            // No `className`, and that is the whole fix: NativeWind wraps a
            // className'd Pressable and drops a function-valued `style`, so the
            // press fill below had never been applied once — `pressed` was
            // computed on every press and then discarded. The geometry from the
            // old class list (flex-row / items-center / px-4 / py-4, and the
            // divider between rows) lives in the style object instead.
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: idx !== items.length - 1 ? 1 : 0,
              borderBottomColor: "#F3F4F6",
              // `#F9FAFB` was the old value and it is the page background, so
              // even once it started applying it would have been one step off
              // the card's white and invisible. `disabled` suppresses `pressed`,
              // so the fill and the 50% opacity can never both be in play.
              backgroundColor: pressed ? "#E5E7EB" : "transparent",
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
