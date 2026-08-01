import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetMySections } from "$/hooks/useSections";
import { useGetRange } from "$/hooks/useCalendar";
import { useGetLatest } from "$/hooks/useAnnouncement";
import { toISODate } from "$/libs/week";
import { styles } from "$/style/Teacher";
import type { SectionArray } from "$/types/section";
import type { Latest } from "$/types/announcement";
import type { DayType } from "$/types/calendar-day";
import HomeHeader from "../HomeHeader";
import SectionStatusCard from "../SectionStatusCard";
import QuickActions from "../QuickActions";
import AnnouncementCard from "../Announcements";

// Flip to false once useGetMySections / useGetRange / useGetLatest are
// confirmed working end-to-end. Dummy objects below are shaped to match the
// (assumed) Zod types exactly, so the swap is deleting this block and the
// USE_DUMMY branches.
const USE_DUMMY = true;

const DUMMY_SECTIONS: SectionArray = [
  { id: "sec-1", name: "A", session: "2025-26", className: "11", academicYearLabel: "2025-26", isClassTeacher: true },
  { id: "sec-2", name: "B", session: "2025-26", className: "12", academicYearLabel: "2025-26", isClassTeacher: false },
];

const DUMMY_ANNOUNCEMENTS: Latest[] = [
  {
    id: "ann-1",
    name: "Admin Office",
    title: "PTM rescheduled",
    body: "The parent-teacher meeting has been moved to next Friday.",
    type: "Normal",
    profilePic: "",
  },
  {
    id: "ann-2",
    name: "Admin Office",
    title: "PTM rescheduled",
    body: "The parent-teacher meeting has been moved to next Friday.",
    type: "Normal",
    profilePic: "",
  },
  {
    id: "ann-3",
    name: "Admin Office",
    title: "PTM rescheduled",
    body: "The parent-teacher meeting has been moved to next Friday.",
    type: "Normal",
    profilePic: "",
  },
];

const DAY_CHIP_COLOR: Record<DayType, string> = {
  Working: "#16A34A",
  Holiday: "#D97706",
  Weekend: "#6B7280",
  Event: "#2563EB",
  Exam: "#4F46E5",
};

const Teacher = () => {
  const today = new Date();
  const todayISO = toISODate(today);

  const sectionsQuery = useGetMySections();
  const rangeQuery = useGetRange(todayISO, todayISO);
  const announcementsQuery = useGetLatest();

  const sections = USE_DUMMY ? DUMMY_SECTIONS : sectionsQuery.data ?? [];
  const sectionsLoading = !USE_DUMMY && sectionsQuery.isLoading;

  const todayType: DayType | undefined = USE_DUMMY
    ? "Working"
    : rangeQuery.data?.[0]?.type;
  const isWorkingDay = todayType === "Working";

  const announcements = USE_DUMMY
    ? DUMMY_ANNOUNCEMENTS
    : announcementsQuery.data ?? [];
  const announcementsLoading = !USE_DUMMY && announcementsQuery.isLoading;

  const hasNotifications = announcements && announcements.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeHeader hasNotifications={hasNotifications} />

        {todayType ? (
          <View
            style={[
              styles.dayChip,
              { backgroundColor: DAY_CHIP_COLOR[todayType] + "1A" },
            ]}
          >
            <Text style={[styles.dayChipText, { color: DAY_CHIP_COLOR[todayType] }]}>
              Today: {todayType}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Sections</Text>

          {sectionsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No sections assigned yet.</Text>
            </View>
          ) : (
            sections.map((section) => (
              <SectionStatusCard
                key={section.id}
                section={section}
                date={todayISO}
                isWorkingDay={isWorkingDay}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <QuickActions />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements</Text>

          {announcementsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No announcements yet.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.announcementsRow}
            >
              {announcements.map((item) => (
                <View key={item.id} style={styles.announcementItem}>
                  <AnnouncementCard {...item} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Teacher;
