import { tabs } from "@/constants/data";
import { colors, components } from "@/constants/theme";
import { useAuth } from "@/src/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

const getIconName = (
  icon: keyof typeof Ionicons.glyphMap,
  focused: boolean,
): keyof typeof Ionicons.glyphMap => {
  if (!focused) return icon;

  const filled = icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap;
  return filled in Ionicons.glyphMap ? filled : icon;
};

interface TabIconProps {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}

const TabIcon = ({ focused, icon, title }: TabIconProps) => (
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
        color={focused ? colors.accent : "rgba(255,255,255,0.75)"}
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

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  const { role } = useAuth();

  if (!role) {
    return null;
  }

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
          backgroundColor: colors.accent,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Hide the tab (and its route from the tab bar) when the
            // current role isn't allowed to see it, without unmounting
            // the screen definition itself.
            href: tab.roles.includes(role) ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} title={tab.title} />
            ),
          }}
        />
      ))}

      {/*
        Screens reachable only by `router.push` (the bell, a quick action,
        the profile menu) — no tab of their own, but they MUST stay routable.

        Deliberately NOT `href: null` here: expo-router 58 turns that into
        `options.hidden`, which drops the route from the tab navigator's
        visible set. Pushing to it then renders nothing and
        `useVisibleTabsWithRedirect` replaces it with the first visible tab,
        so the screen "opens" and bounces straight back to Home. Hiding the
        tab bar item instead keeps the route visible to the navigator while
        taking it out of the bar's layout. `href: null` above is fine because
        a role-hidden tab is never navigated to.
      */}
      <Tabs.Screen
        name="change-pass"
        options={{
          tabBarItemStyle: { display: "none" },
          title: "Change Password",
        }}
      />

      <Tabs.Screen
        name="announcements"
        options={{
          tabBarItemStyle: { display: "none" },
          title: "Announcements",
        }}
      />

      <Tabs.Screen
        name="notification"
        options={{
          tabBarItemStyle: { display: "none" },
          title: "Notifications",
        }}
      />
    </Tabs>
  );
}
