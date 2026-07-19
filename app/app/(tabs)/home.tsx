import React from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "$/hooks/useAuth";
import { useGreeting } from "$/libs/useGreeting";
import { styles } from "$/style/home";
// import { useGetLatest } from "$/hooks/useAnnouncement";
import { latest } from "$/types/announcement";
import AnnouncementCard from "@/components/home/Announcements";
import { TimetableDayType, TimetableType } from "$/types/timeTable";
import TimeTable from "@/components/home/TimeTable";

export default function HomeScreen() {
  // const { user,isAuthenticated } = useAuth();
  const router = useRouter();
  const greeting = useGreeting();

  // if (!isAuthenticated) {
  //   return <Redirect href="/(auth)/login" />;
  // }
  // const {data:announcements} = useGetLatest()

  //! replace with real data for prod.
  const announcements: latest[] = [
    {
      name: "Mrs. Priya Sharma",
      profilePic:
        "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Independence Day Holiday",
      body: "The school will remain closed on 15th August on account of Independence Day.",
      type: "Holiday",
      id: "1",
    },
    {
      name: "Mr. Rahul Kumar",
      profilePic:
        "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Updated Class Timetable",
      body: "The timetable for Class 10A has been updated. Please check the latest schedule from Monday.",
      type: "TimetableUpdate",
      id: "2",
    },
    {
      name: "Mrs. Anita Rao",
      profilePic:
        "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Unit Test 1 Results Published",
      body: "Unit Test 1 results are now available. Students can view their marks in the Marks section.",
      type: "ResultUpdate",
      id: "3",
    },
  ];

  const timeTable: TimetableDayType = {
    day: "MONDAY",
    slots: [
      {
        periodId: "1",
        order: 1,
        startTime: "08:30",
        endTime: "09:20",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Mathematics",
            teacher: "Mr. Ravi",
            language: null,
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "2",
        order: 2,
        startTime: "09:20",
        endTime: "10:10",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Physics",
            teacher: "Mrs. Priya",
            language: null,
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "break-1",
        order: 3,
        startTime: "10:10",
        endTime: "10:25",
        isBreak: true,
        label: "SHORT BREAK",
        options: [],
      },
      {
        periodId: "3",
        order: 4,
        startTime: "10:25",
        endTime: "11:15",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Chemistry",
            teacher: "Mr. Kumar",
            language: null,
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "4",
        order: 5,
        startTime: "11:15",
        endTime: "12:05",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "English",
            teacher: "Mrs. Anita",
            language: "English",
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "lunch",
        order: 6,
        startTime: "12:05",
        endTime: "12:45",
        isBreak: true,
        label: "LUNCH BREAK",
        options: [],
      },
      {
        periodId: "5",
        order: 7,
        startTime: "12:45",
        endTime: "13:35",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Biology",
            teacher: "Mrs. Meena",
            language: null,
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "6",
        order: 8,
        startTime: "13:35",
        endTime: "14:25",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Kannada",
            teacher: "Mrs. Kavya",
            language: "Kannada",
            combination: "PCMB",
          },
        ],
      },
      {
        periodId: "break-2",
        order: 9,
        startTime: "14:25",
        endTime: "14:40",
        isBreak: true,
        label: "SHORT BREAK",
        options: [],
      },
      {
        periodId: "7",
        order: 10,
        startTime: "14:40",
        endTime: "15:30",
        isBreak: false,
        label: null,
        options: [
          {
            subject: "Computer Science",
            teacher: "Mr. Arun",
            language: null,
            combination: "PCMB",
          },
        ],
      },
    ],
  };

  const displayName = "Student";
  const profilePic =
    "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250";
  const hasNotifications = true; // TODO: wire to real notifications count/state

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
          onPress={() => router.push("/")}
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
        {announcements.length === 0 ? (
          <Text className="text-gray-400 text-sm px-4">
            No announcements yet.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={240 + 12} // card width + marginRight
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {announcements.map((item) => (
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
