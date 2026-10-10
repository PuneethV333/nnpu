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
    <Pressable onPress={() => router.push("/announcements")} hitSlop={10}>
      <Text className="text-sm font-semibold text-blue-600">See all</Text>
    </Pressable>
  </View>
);

export default AnnouncementsHeader;
