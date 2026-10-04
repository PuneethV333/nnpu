import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetMySections } from "$/hooks/useSections";
import { useGetRange } from "$/hooks/useCalendar";
import { useGetLatest } from "$/hooks/useAnnouncement";
import { useGetNotifications } from "$/hooks/useNotifications";
import { useGetTodaysTimeTable } from "$/hooks/useTimeTable";
import { toISODate } from "$/libs/week";
import { styles } from "$/style/Teacher";
import type { DayType } from "$/types/calendar";
import HomeHeader from "../HomeHeader";
import SectionStatusCard from "../SectionStatusCard";
import QuickActions from "../QuickActions";
import AnnouncementCard from "../Announcements";
import TimeTable from "../TimeTable";
import { DAY_CHIP_COLOR } from "@/constants/dayTypeColor";
import { EmptyState } from "@/components/ui/Feedback";
import {
  DayChipSkeleton,
  SectionStatusSkeleton,
  TimetableSkeleton,
  AnnouncementsRowSkeleton,
} from "@/components/ui/skeletons";

const Teacher = () => {
  const todayISO = toISODate(new Date());

  const sectionsQuery = useGetMySections();
  const rangeQuery = useGetRange(todayISO, todayISO);
  const announcementsQuery = useGetLatest();
  const notificationsQuery = useGetNotifications();
  const timetableQuery = useGetTodaysTimeTable();

  const sections = sectionsQuery.data ?? [];
  const todayType: DayType | undefined = rangeQuery.data?.[0]?.type;
  const isWorkingDay = todayType === "Working";

  const announcements = announcementsQuery.data ?? [];

  const hasUnreadNotifications =
    (notificationsQuery.data ?? []).some((n) => !n.isRead) || false;

  const todaySlots = timetableQuery.data?.slots ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeHeader hasNotifications={hasUnreadNotifications} />

        {rangeQuery.isLoading ? (
          <DayChipSkeleton />
        ) : todayType ? (
          <View
            style={[
              styles.dayChip,
              { backgroundColor: DAY_CHIP_COLOR[todayType] + "1A" },
            ]}
          >
            <Text style={[styles.dayChipText, { color: DAY_CHIP_COLOR[todayType] }]}>
              Today: {todayType}
              {todayType === "Holiday" && rangeQuery.data?.[0]?.label
                ? ` — ${rangeQuery.data[0].label}`
                : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Class</Text>

          {timetableQuery.isLoading ? (
            <TimetableSkeleton />
          ) : todaySlots.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {todayType && !isWorkingDay
                  ? `Not a working day${
                      rangeQuery.data?.[0]?.label
                        ? ` — ${rangeQuery.data[0].label}`
                        : ""
                    }.`
                  : "No classes scheduled for today."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {todaySlots.map((slot) => (
                <TimeTable
                  key={slot.periodId}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  isBreak={slot.isBreak}
                  label={slot.label}
                  options={slot.options}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Sections</Text>

          {sectionsQuery.isLoading ? (
            <SectionStatusSkeleton />
          ) : sectionsQuery.isError ? (
            <EmptyState
              icon="alert-circle"
              title="Couldn't load your sections"
              subtitle="Pull to refresh or check your connection."
            />
          ) : sections.length === 0 ? (
            <EmptyState
              icon="grid"
              title="No sections assigned yet"
              subtitle="Sections you're teaching will show up here."
            />
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

          {announcementsQuery.isLoading ? (
            <AnnouncementsRowSkeleton />
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
