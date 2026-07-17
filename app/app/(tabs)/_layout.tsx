import { tabs } from "@/constants/data";
import { components } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

type TabIconProps = {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

// Swaps "-outline" for the filled variant when active, e.g.
// "home-outline" -> "home". Falls back to the outline icon
// if a filled version doesn't exist in the glyph map.
const getIconName = (
  icon: keyof typeof Ionicons.glyphMap,
  focused: boolean,
): keyof typeof Ionicons.glyphMap => {
  if (!focused) return icon;
  const filled = icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap;
  return filled in Ionicons.glyphMap ? filled : icon;
};

const TabIcon = ({ focused, icon, title }: TabIconProps) => {
  return (
    <View className="items-center justify-center" style={{ width: 64 }}>
      <View
        className={clsx(
          "items-center justify-center rounded-full",
          focused && "bg-white",
        )}
        style={{
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: focused ? 0.15 : 0,
          shadowRadius: 4,
          elevation: focused ? 3 : 0,
        }}
      >
        <Ionicons
          name={getIconName(icon, focused)}
          size={20}
          color={focused ? "#2563EB" : "rgba(255,255,255,0.75)"}
        />
      </View>
      <Text
        numberOfLines={1}
        className={clsx(
          "mt-1 text-[10px] font-medium",
          focused ? "text-white" : "text-white/60",
        )}
      >
        {title}
      </Text>
    </View>
  );
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, tabBar.horizontalInset),
          height: tabBar.height,
          marginHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: "#2563EB",
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#2563EB",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6,
        },
        tabBarIconStyle: {
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          alignItems: "center",
        },
      }}
    >
      {tabs.map((x) => (
        <Tabs.Screen
          key={x.name}
          name={x.name}
          options={{
            title: x.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={x.icon} title={x.title} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}