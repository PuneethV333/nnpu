import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "$/hooks/useAuth";
import { useGetRange } from "$/hooks/useCalendar";
import { useGetLatest } from "$/hooks/useAnnouncement";
import { useGetAdminDashboard } from "$/hooks/useDashboard";
import { toISODate } from "$/libs/week";
import { styles } from "$/style/Admin";
import type { DayType } from "$/types/calendar-day";
import HomeHeader from "../HomeHeader";
import SchoolStatsGrid from "../SchoolStatsGrid";
import QuickActions, { type QuickAction } from "../QuickActions";
import AnnouncementCard from "../Announcements";
import { DAY_CHIP_COLOR } from "@/constants/dayTypeColor";

// ASSUMED — the doc says "use the existing formatter" for amountPending but
// it wasn't provided. Replace this with the app's real currency formatter
// (likely somewhere under $/libs or $/utils) once you point me to it.
const formatRupees = (amount: number) => `\u20b9${amount.toLocaleString("en-IN")}`;

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Mark Attendance", icon: "checkmark-done-outline", color: "#2563EB", route: "/(tabs)/attendance" },
  { label: "Enter Marks", icon: "create-outline", color: "#16A34A", route: "/(tabs)/marks" },
  { label: "Manage Fees", icon: "cash-outline", color: "#D97706", route: "/(tabs)/fees" },
];

const Admin = () => {
  const { user } = useAuth();
  const today = new Date();
  const todayISO = toISODate(today);

  const rangeQuery = useGetRange(todayISO, todayISO);
  const announcementsQuery = useGetLatest();
  const dashboardQuery = useGetAdminDashboard();

  const todayType: DayType | undefined = rangeQuery.data?.[0]?.type;

  const announcements = announcementsQuery.data ?? [];
  const announcementsLoading = announcementsQuery.isLoading;
  const hasNotifications = announcements.length > 0;

  const dashboard = dashboardQuery.data;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeHeader hasNotifications={hasNotifications} />

        <SchoolStatsGrid school={user?.school ?? null} />

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

        <View className="px-4 mt-5">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Overview
          </Text>

          {dashboardQuery.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          ) : dashboardQuery.isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Couldn&apos;t load dashboard data. Pull to refresh or try again shortly.
              </Text>
            </View>
          ) : dashboard ? (
            <>
              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Attendance Today</Text>
                <Text style={styles.dashCardValue}>
                  {dashboard.attendanceToday.marked}/{dashboard.attendanceToday.totalStudents}
                </Text>
                <Text style={styles.dashCardSubtext}>
                  {dashboard.attendanceToday.percentage}% marked
                </Text>
              </View>

              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Pending Enrollments</Text>
                <Text style={styles.dashCardValue}>{dashboard.pendingEnrollments}</Text>
              </View>

              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Open Enrollment Drives</Text>
                <Text style={styles.dashCardValue}>{dashboard.openDrives}</Text>
              </View>

              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Pending Fees</Text>
                <Text style={styles.dashCardValue}>
                  {formatRupees(dashboard.fees.amountPending)}
                </Text>
                <Text style={styles.dashCardSubtext}>
                  {dashboard.fees.pendingInvoices} invoice
                  {dashboard.fees.pendingInvoices === 1 ? "" : "s"} pending
                </Text>
              </View>

              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Upcoming Events</Text>
                {dashboard.upcomingEvents.length === 0 ? (
                  <Text style={styles.dashCardSubtext}>No upcoming events.</Text>
                ) : (
                  dashboard.upcomingEvents.map((event, idx) => (
                    <View
                      key={`${event.date.toISOString()}-${idx}`}
                      style={[
                        styles.eventRow,
                        idx === dashboard.upcomingEvents.length - 1
                          ? { borderBottomWidth: 0 }
                          : null,
                      ]}
                    >
                      <Text style={styles.eventLabel} numberOfLines={1}>
                        {event.label ?? event.type} &middot;{" "}
                        {event.date.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                      <View
                        style={[
                          styles.eventPill,
                          { backgroundColor: DAY_CHIP_COLOR[event.type] + "1A" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.eventPillText,
                            { color: DAY_CHIP_COLOR[event.type] },
                          ]}
                        >
                          {event.type}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}
        </View>

        <View className="px-4 mt-5">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Quick Actions
          </Text>
          <QuickActions actions={QUICK_ACTIONS} />
        </View>

        <View className="px-4 mt-5">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Announcements
          </Text>

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

export default Admin;