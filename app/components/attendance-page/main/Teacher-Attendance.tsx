import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useGetRoster,
  useCheckStatus,
  useMarkAttendance,
} from "@/src/hooks/useAttendance";
import { useTabBarClearance } from "@/src/hooks/useTabBarClearance";
import { toISODate } from "@/src/libs/week";
import { errorMessage } from "@/src/libs/errorMessage";
import { useGetAllSections } from "@/src/hooks/useSections";
import { SectionPicker } from "../SectionPicker";
import { RosterEditor } from "../RosterEditor";
import { shiftDate } from "@/src/libs/shiftDate";
import { formatDisplayDate } from "@/src/libs/formatDisplayDate";
import { styles } from "@/src/style/markAttendance";


/**
 * Why the roster/status could not be loaded.
 *
 * This banner used to claim "The day may not be a working day" for every
 * failure. The backend distinguishes the causes — a Holiday genuinely returns
 * "Cannot mark attendance on a Holiday day", but an unstaffed section returns
 * 403 and a server outage returns a network error — and the server's own
 * wording was discarded because the query only exposed `isError`, not `error`.
 *
 * A wrong guess is worse than none here: "unknown issue" sent whoever reported
 * this looking at the calendar for a problem that was a permissions fault, and
 * the roster is the same for a non-working day and an offline server.
 */
const attendanceErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      return "You aren't assigned to this section, so you can't mark its attendance.";
    }
    if (status === 400) {
      return "Attendance can only be marked on a working day. Pick another date.";
    }
    if (status === 401) {
      return "Your session expired. Sign in again to continue.";
    }
  }
  return errorMessage(err, "Couldn't load this section. Check your connection.");
};

const MarkAttendancePage = () => {
  const tabBarClearance = useTabBarClearance();
  const { data: sections, isLoading: sectionsLoading } = useGetAllSections();

  // `app/(tabs)/classes.tsx` deep-links here with ?sectionId=... so its
  // "Mark Attendance" button lands on the right class instead of showing an
  // empty picker.
  const { sectionId: routeSectionId } = useLocalSearchParams<{
    sectionId?: string | string[];
  }>();
  const preselected =
    typeof routeSectionId === 'string' ? routeSectionId : undefined;

  const [pickedSectionId, setPickedSectionId] = useState<string>("");
  const sectionId = pickedSectionId || preselected || "";
  const [dayOffset, setDayOffset] = useState(0);

  const date = useMemo(() => shiftDate(new Date(), dayOffset), [dayOffset]);
  const isoDate = toISODate(date);

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErr,
    refetch: refetchStatus,
  } = useCheckStatus(sectionId, isoDate);

  const {
    data: roster,
    isLoading: rosterLoading,
    isError: rosterError,
    error: rosterErr,
    refetch: refetchRoster,
  } = useGetRoster(sectionId, isoDate);

  const { mutate: mark, isPending: isSaving } = useMarkAttendance();

  // Remounts <RosterEditor> whenever the server-side roster changes, which is
  // how the draft gets re-seeded from the saved statuses — no effect needed.
  const rosterKey =
    roster?.map((r) => `${r.studentId}:${r.status}`).join(",") ?? "";

  const isLocked = status?.isLocked ?? false;
  const isMarked = status?.isMarked ?? false;
  const disableNextDay = dayOffset >= 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <Text style={styles.pageTitle}>Mark Attendance</Text>

        {sectionsLoading && (
          <ActivityIndicator style={{ marginBottom: 12 }} color="#2563EB" />
        )}

        {sections && sections.length > 0 && (
          <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
            <SectionPicker
              sections={sections}
              selectedId={sectionId}
              onSelect={setPickedSectionId}
            />
          </View>
        )}

        {sections && sections.length === 0 && (
          <Text style={styles.mutedText}>No sections found.</Text>
        )}

        {/* Date navigator */}
        <View style={styles.dateNav}>
          <Pressable
            onPress={() => setDayOffset((d) => d - 1)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navButton,
              pressed && { backgroundColor: "#F3F4F6" },
            ]}
          >
            <Feather name="chevron-left" size={20} color="#374151" />
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            {dayOffset === 0 && <Text style={styles.todayBadge}>Today</Text>}
          </View>

          <Pressable
            onPress={() => !disableNextDay && setDayOffset((d) => d + 1)}
            disabled={disableNextDay}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navButton,
              pressed && !disableNextDay && { backgroundColor: "#F3F4F6" },
              disableNextDay && { opacity: 0.3 },
            ]}
          >
            <Feather name="chevron-right" size={20} color="#374151" />
          </Pressable>
        </View>

        {!sectionId && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="users" size={22} color="#2563EB" />
            </View>
            <Text style={styles.emptyText}>
              Select a section to load the roster.
            </Text>
          </View>
        )}

        {sectionId && (statusLoading || rosterLoading) && (
          <ActivityIndicator style={{ marginTop: 32 }} color="#2563EB" />
        )}

        {sectionId && (statusError || rosterError) && (
          <View style={styles.errorBanner}>
            <Feather
              name="alert-circle"
              size={16}
              color="#DC2626"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerText}>
                {attendanceErrorMessage(rosterErr ?? statusErr)}
              </Text>
              <Pressable
                onPress={() => {
                  void refetchRoster();
                  void refetchStatus();
                }}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Feather name="refresh-cw" size={13} color="#DC2626" />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        )}

        {sectionId && status && (
          <>
{isLocked && (
              <View style={[styles.banner, styles.bannerAmber]}>
                <Feather name="lock" size={15} color="#92400E" />
                <Text style={[styles.bannerText, { color: '#92400E' }]}>
                  Locked — attendance can only be edited for today and the
                  previous day. Changes can&apos;t be saved.
                </Text>
              </View>
            )}

            {!isLocked && isMarked && (
              <View style={[styles.banner, styles.bannerBlue]}>
                <Feather name="check-circle" size={15} color="#1D4ED8" />
                <Text style={[styles.bannerText, { color: "#1D4ED8" }]}>
                  Already marked for this day. You can still make changes.
                </Text>
              </View>
            )}

            {!isMarked && !isLocked && (
              <View style={[styles.banner, styles.bannerGray]}>
                <Feather name="circle" size={15} color="#6B7280" />
                <Text style={[styles.bannerText, { color: "#6B7280" }]}>
                  Not marked yet.
                </Text>
              </View>
            )}
          </>
        )}

        {sectionId && roster && roster.length > 0 && (
          <RosterEditor
            key={`${sectionId}:${isoDate}:${rosterKey}`}
            roster={roster}
            sectionId={sectionId}
            isoDate={isoDate}
            isLocked={isLocked}
            isSaving={isSaving}
            mark={mark}
          />
        )}

        {sectionId && roster && roster.length === 0 && !rosterLoading && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={28} color="#D1D5DB" />
            <Text style={[styles.emptyText, { marginTop: 8 }]}>
              No students found for this section.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkAttendancePage;
