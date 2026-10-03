import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "$/hooks/useAuth";
import { useGetRange } from "$/hooks/useCalendar";
import { useGetLatest } from "$/hooks/useAnnouncement";
import { useGetNotifications } from "$/hooks/useNotifications";
import { useGetMySummary } from "$/hooks/useAttendance";
import { useGetTodaysTimeTable } from "$/hooks/useTimeTable";
import { toISODate } from "$/libs/week";
import { getMonthRange } from "$/libs/getMonthRange";
import { styles } from "$/style/Teacher";
import type { DayType } from "$/types/calendar";
import HomeHeader from "../HomeHeader";
import QuickActions from "../QuickActions";
import AnnouncementCard from "../Announcements";
import TimeTable from "../TimeTable";
import ProgressCard from "@/components/attendance-page/ProgressCard";
import { MONTH_LABELS } from "@/constants/months";
import { DAY_CHIP_COLOR } from "@/constants/dayTypeColor";
import {
  DayChipSkeleton,
  TimetableSkeleton,
  AnnouncementsRowSkeleton,
  ProgressCardSkeleton,
} from "@/components/ui/skeletons";

const Student = () => {
  const router = useRouter();
  const { user } = useAuth();

  const today = new Date();
  const todayISO = toISODate(today);
  const { from: monthFrom, to: monthTo } = getMonthRange(
    today.getFullYear(),
    today.getMonth(),
  );

  const rangeQuery = useGetRange(todayISO, todayISO);
  const announcementsQuery = useGetLatest();
  const notificationsQuery = useGetNotifications();
  const timetableQuery = useGetTodaysTimeTable();
  const { data: summary, isLoading: summaryLoading } = useGetMySummary(
    monthFrom,
    monthTo,
  );

  const todayType: DayType | undefined = rangeQuery.data?.[0]?.type;
  const isWorkingDay = todayType === "Working";

  const announcements = announcementsQuery.data ?? [];
  const todaySlots = timetableQuery.data?.slots ?? [];

  const hasUnreadNotifications =
    (notificationsQuery.data ?? []).some((n) => !n.isRead) || false;

  const section = user?.section;
  const classLabel = section?.class?.name ?? null;
  const sectionLabel = section
    ? [classLabel, section.name].filter(Boolean).join(" - ")
    : null;

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

        {sectionLabel ? (
          <Pressable
            onPress={() => router.push("/profile")}
            style={[styles.emptyBox, styles.myClassCard]}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={styles.emptyText}>My Class</Text>
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  {sectionLabel}
                </Text>
                {section?.classTeacher?.details?.name ? (
                  <Text className="text-xs text-gray-400 mt-1">
                    Class Teacher: {section.classTeacher.details.name}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        ) : null}

        {summaryLoading ? (
          <ProgressCardSkeleton />
        ) : (
          <ProgressCard
            title="Attendance This Month"
            percentage={summary?.percentage ?? 0}
            subtitle={`${MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`}
            color="#2563EB"
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Class</Text>

          {timetableQuery.isLoading ? (
            <TimetableSkeleton />
          ) : todaySlots.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {isWorkingDay === false
                  ? "Not a working day — no classes scheduled."
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

export default Student;
