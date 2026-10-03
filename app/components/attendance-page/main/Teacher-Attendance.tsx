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
import { useGetAllSections } from "@/src/hooks/useSections";
import { StudentRow } from "../StudentRow";
import { SectionPicker } from "../SectionPicker";
import { AttendanceStatusModal } from "../AttendanceStatusModal";
import { shiftDate } from "@/src/libs/shiftDate";
import { formatDisplayDate } from "@/src/libs/formatDisplayDate";
import { styles } from "@/src/style/markAttendance";

import {
  MarkAttendanceType,
  MarkStatus,
  RosterArray,
  STATUS_OPTIONS,
} from "@/src/types/attendance";

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
  } = useCheckStatus(sectionId, isoDate);

  const {
    data: roster,
    isLoading: rosterLoading,
    isError: rosterError,
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
            <Text style={styles.errorBannerText}>
              Couldn&apos;t load this section&apos;s attendance. The day may not
              be a working day.
            </Text>
          </View>
        )}

        {sectionId && status && (
          <>
            {isLocked && (
              <View style={[styles.banner, styles.bannerAmber]}>
                <Feather name="lock" size={15} color="#92400E" />
                <Text style={[styles.bannerText, { color: "#92400E" }]}>
                  Locked — marked more than 24 hours ago. Changes can&apos;t be
                  saved.
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



type MarkFn = (
  body: MarkAttendanceType,
  opts: {
    onSuccess: () => void;
    onError: (err: unknown) => void;
  },
) => void;

/**
 * Owns the per-student draft. Seeded from the roster on mount; the parent
 * remounts this component (via `key`) whenever the saved roster changes, so
 * switching section/day re-seeds without a synchronising effect.
 */
const RosterEditor = ({
  roster,
  sectionId,
  isoDate,
  isLocked,
  isSaving,
  mark,
}: {
  roster: RosterArray;
  sectionId: string;
  isoDate: string;
  isLocked: boolean;
  isSaving: boolean;
  mark: MarkFn;
}) => {
  const [resultModal, setResultModal] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const [draft, setDraft] = useState<Record<string, MarkStatus>>(() =>
    Object.fromEntries(
      roster.map((r) => [r.studentId, r.status as MarkStatus]),
    ),
  );

  const markAll = (value: MarkStatus) => {
    setDraft(Object.fromEntries(roster.map((r) => [r.studentId, value])));
  };

  const handleSave = () => {
    const entries = roster.map((r) => ({
      studentId: r.studentId,
      status: draft[r.studentId] ?? "NotMarked",
    }));

    mark(
      { sectionId, date: isoDate, entries },
      {
        onSuccess: () =>
          setResultModal({
            visible: true,
            type: "success",
            message: "Attendance updated successfully.",
          }),
        onError: (err: unknown) =>
          setResultModal({
            visible: true,
            type: "error",
            message:
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ?? "Something went wrong. Try again.",
          }),
      },
    );
  };

  const markedCount = Object.values(draft).filter(
    (v) => v !== "NotMarked",
  ).length;

  return (
    <>
      <View style={styles.markAllRow}>
        <View style={{ flexDirection: "row" }}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => markAll(opt.value)}
              disabled={isLocked}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: opt.color + "55",
                  backgroundColor: opt.color + "18",
                  opacity: isLocked ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: opt.color }]} />
              <Text style={[styles.chipText, { color: opt.color }]}>
                All {opt.value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.countText}>
          {markedCount}/{roster.length}
        </Text>
      </View>

      <View style={styles.rosterCard}>
        {roster.map((item, idx) => (
          <View key={item.studentId}>
            <StudentRow
              item={item}
              status={draft[item.studentId] ?? "NotMarked"}
              disabled={isLocked}
              onChange={(value) =>
                setDraft((d) => ({ ...d, [item.studentId]: value }))
              }
            />
            {idx !== roster.length - 1 && <View style={styles.rowSeparator} />}
          </View>
        ))}
      </View>

      <View style={{ padding: 16 }}>
        <Pressable
          onPress={handleSave}
          disabled={isLocked || isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            (isLocked || isSaving) && { opacity: 0.5 },
            pressed &&
              !isLocked &&
              !isSaving && { backgroundColor: "#1D4ED8" },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="save" size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Attendance</Text>
            </>
          )}
        </Pressable>
      </View>

      <AttendanceStatusModal
        visible={resultModal.visible}
        type={resultModal.type}
        title={resultModal.type === "success" ? "Saved" : "Couldn't save"}
        message={resultModal.message}
        onClose={() => setResultModal((m) => ({ ...m, visible: false }))}
        onRetry={
          resultModal.type === "error"
            ? () => {
                setResultModal((m) => ({ ...m, visible: false }));
                handleSave();
              }
            : undefined
        }
      />
    </>
  );
};

export default MarkAttendancePage;
