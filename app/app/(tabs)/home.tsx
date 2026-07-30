import React from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "$/hooks/useAuth";
import { useGreeting } from "$/libs/useGreeting";
import { styles } from "$/style/home";
import AnnouncementCard from "@/components/home/Announcements";
import TimeTable from "@/components/home/TimeTable";
import { useGetLatest } from "@/src/hooks/useAnnouncement";
import { useGetTodaysTimeTable } from "@/src/hooks/useTimeTable";

export default function HomeScreen() {
  const { user,isAuthenticated } = useAuth();
  const router = useRouter();
  const greeting = useGreeting();
  const {data:announcements} = useGetLatest()
  const {data:timeTable} = useGetTodaysTimeTable()

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const displayName = user?.details?.name ?? '';
  const profilePic = user?.details?.profilePic ?? ''
  const hasNotifications = announcements && announcements.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/notification")}
          hitSlop={12}
          style={styles.bellButton}
        >
          <Feather name="bell" size={22} color="#111827" />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 104 }}
      >
        <Text className="text-lg font-semibold text-gray-900 px-4 mt-4 mb-2">
          Announcements
        </Text>
        {announcements?.length === 0 ? (
          <Text className="text-gray-400 text-sm px-4">
            No announcements yet.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={240 + 12}
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {announcements?.map((item) => (
              <AnnouncementCard key={item.id} {...item} />
            ))}
          </ScrollView>
        )}

        <Text className="text-lg font-semibold text-gray-900 px-4 mt-5 mb-2">
          Today&apos;s Timetable
        </Text>
        {!timeTable?.slots || timeTable.slots.length === 0 ? (
          <Text className="text-gray-400 text-sm px-4">
            No timetable found for today.
          </Text>
        ) : (
          <View className="px-4 gap-2.5">
            {timeTable.slots.map((item) => (
              <TimeTable key={item.periodId} {...item} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
