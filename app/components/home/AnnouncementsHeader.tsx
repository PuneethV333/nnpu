import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

/** "Announcements  ·  See all" row shared by the Admin, Teacher and Student homes. */
const AnnouncementsHeader = ({
  titleClassName = "text-[15px] font-semibold text-gray-900",
}: {
  titleClassName?: string;
}) => (
  <View className="flex-row items-center justify-between mb-3">
    <Text className={titleClassName}>Announcements</Text>
    <Pressable
      onPress={() => router.push("/announcements")}
      hitSlop={10}
      accessibilityRole="button"
    >
      {({ pressed }) => (
        // The pressed flag reaches the glyphs through function children, not a
        // function `style`: a Pressable's style cannot recolour a Text child,
        // and this link has no shape of its own to fill.
        //
        // The colour is in `style` and deliberately not in the className. A
        // className colour beats an object style colour in NativeWind's merge,
        // so keeping `text-blue-600` here would pin the link blue at rest and
        // under the finger both, and the press would be invisible.
        <Text
          className="text-sm font-semibold"
          style={{ color: pressed ? "#1D4ED8" : "#2563EB" }}
        >
          See all
        </Text>
      )}
    </Pressable>
  </View>
);

export default AnnouncementsHeader;
