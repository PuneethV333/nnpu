import React from "react";
import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { useGreeting } from "@/src/libs/useGreeting";
import { styles } from "@/src/style/home";
// import { useGetLatest } from "@/src/hooks/useAnnouncement";
import { latest } from "$/types/announcement";
import AnnouncementCard from "@/components/home/Announcements";

export default function HomeScreen() {
  // const { user,isAuthenticated } = useAuth();
  const router = useRouter();
  const greeting = useGreeting();
  
  // if (!isAuthenticated) {
  //   return <Redirect href="/(auth)/login" />;
  // }
  // const {data:announcements} = useGetLatest()
  

  const announcements: latest[] = [
    {
      name: "Mrs. Priya Sharma",
      profilePic: "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Independence Day Holiday",
      body: "The school will remain closed on 15th August on account of Independence Day.",
      type: "Holiday",
      id: "1",
    },
    {
      name: "Mr. Rahul Kumar",
      profilePic: "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Updated Class Timetable",
      body: "The timetable for Class 10A has been updated. Please check the latest schedule from Monday.",
      type: "TimetableUpdate",
      id: "2",
    },
    {
      name: "Mrs. Anita Rao",
      profilePic: "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      title: "Unit Test 1 Results Published",
      body: "Unit Test 1 results are now available. Students can view their marks in the Marks section.",
      type: "ResultUpdate",
      id: "3",
    },
  ];
  
  // const announcements = []
  

  const displayName = "Student";
  const profilePic = 'user?.details?.profilePic';
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

      <FlatList
        data={announcements}
        renderItem={({ item }) => <AnnouncementCard {...item} />}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="items-center justify-center text-red-600 text-3xl font-bold p-3">No announcements found.</Text>
        }
      />
      
      
    </SafeAreaView>
  );
}
