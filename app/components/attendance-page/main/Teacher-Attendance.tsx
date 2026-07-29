import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetRoster,
  useCheckStatus,
  useMarkAttendance,
} from "@/src/hooks/useAttendance";
import { toISODate } from "@/src/libs/week";
import { useGetAllSections } from "@/src/hooks/useSection";
import { StudentRow } from "../StudentRow";
import { SectionPicker } from "../SectionPicker";
import { shiftDate } from "@/src/libs/shiftDate";
import { formatDisplayDate } from "@/src/libs/formatDisplayDate";

export type MarkStatus = "Present" | "Absent" | "Late" | "NotMarked";

export const STATUS_OPTIONS: {
  value: MarkStatus;
  label: string;
  color: string;
}[] = [
  { value: "Present", label: "P", color: "#10B981" },
  { value: "Absent", label: "A", color: "#EF4444" },
  { value: "Late", label: "L", color: "#F59E0B" },
];

const MarkAttendancePage = () => {
  const { data: sections, isLoading: sectionsLoading } = useGetAllSections();
  const [sectionId, setSectionId] = useState<string>("");
  const [dayOffset, setDayOffset] = useState(0);

  const date = useMemo(() => shiftDate(new Date(), dayOffset), [dayOffset]);
  const isoDate = toISODate(date);

  // Step 1: always check status first once a section is picked
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
  } = useCheckStatus(sectionId, isoDate);

  // Step 2: roster is fetched regardless — page always shows the markable list,
  // banners on top communicate locked/marked state
  const {
    data: roster,
    isLoading: rosterLoading,
    isError: rosterError,
  } = useGetRoster(sectionId, isoDate);

  const [draft, setDraft] = useState<Record<string, MarkStatus>>({});

  const rosterKey = roster?.map((r) => `${r.studentId}:${r.status}`).join(",");
  React.useEffect(() => {
    if (roster) {
      const seeded: Record<string, MarkStatus> = {};
      roster.forEach((r) => {
        seeded[r.studentId] = r.status as MarkStatus;
      });
      setDraft(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  const { mutate: mark, isPending: isSaving } = useMarkAttendance();

  const isLocked = status?.isLocked ?? false;
  const isMarked = status?.isMarked ?? false;
  const disableNextDay = dayOffset >= 0;

  const markAll = (value: MarkStatus) => {
    if (!roster) return;
    const next: Record<string, MarkStatus> = {};
    roster.forEach((r) => {
      next[r.studentId] = value;
    });
    setDraft(next);
  };

  const handleSave = () => {
    if (!roster || !sectionId) return;

    const entries = roster.map((r) => ({
      studentId: r.studentId,
      status: draft[r.studentId] ?? "NotMarked",
    }));

    mark(
      { sectionId, date: isoDate, entries },
      {
        onSuccess: () =>
          Alert.alert("Saved", "Attendance updated successfully."),
        onError: (err: any) =>
          Alert.alert(
            "Couldn't save",
            err?.response?.data?.message ?? "Something went wrong. Try again.",
          ),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Text className="text-2xl inter_bold text-gray-900 px-4 pt-4 pb-3">
        Mark Attendance
      </Text>

      {sectionsLoading && (
        <ActivityIndicator className="mb-3" color="#2563EB" />
      )}

      {sections && sections.length > 0 && (
        <View className="mb-3">
          <SectionPicker
            sections={sections}
            selectedId={sectionId}
            onSelect={setSectionId}
          />
        </View>
      )}

      {sections && sections.length === 0 && (
        <Text className="text-gray-500 text-sm px-4 mb-3">
          No sections found.
        </Text>
      )}

      <View className="flex-row items-center justify-between px-4 pb-3">
        <Pressable
          onPress={() => setDayOffset((d) => d - 1)}
          className="px-3 py-2 rounded-lg bg-white border border-gray-200"
        >
          <Text className="inter_medium text-gray-700">‹ Prev</Text>
        </Pressable>

        <Text className="inter_bold text-gray-900">
          {formatDisplayDate(date)}
        </Text>

        <Pressable
          onPress={() => !disableNextDay && setDayOffset((d) => d + 1)}
          disabled={disableNextDay}
          className="px-3 py-2 rounded-lg bg-white border border-gray-200"
          style={{ opacity: disableNextDay ? 0.4 : 1 }}
        >
          <Text className="inter_medium text-gray-700">Next ›</Text>
        </Pressable>
      </View>

      {!sectionId && (
        <Text className="text-gray-500 text-sm px-4">
          Select a section to load the roster.
        </Text>
      )}

      {sectionId && (statusLoading || rosterLoading) && (
        <ActivityIndicator className="mt-8" color="#2563EB" />
      )}

      {sectionId && (statusError || rosterError) && (
        <Text className="text-red-500 text-sm px-4">
          Couldn&apos;t load this section&apos;s attendance. The day may not be
          a working day.
        </Text>
      )}

      {sectionId && status && (
        <>
          {isLocked && (
            <View className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Text className="text-amber-800 text-sm inter_medium">
                Locked — marked more than 24 hours ago. Changes can&apos;t be
                saved.
              </Text>
            </View>
          )}

          {!isLocked && isMarked && (
            <View className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Text className="text-blue-800 text-sm inter_medium">
                Already marked for this day. You can still make changes.
              </Text>
            </View>
          )}

          {!isMarked && !isLocked && (
            <View className="mx-4 mb-3 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
              <Text className="text-gray-600 text-sm inter_medium">
                Not marked yet.
              </Text>
            </View>
          )}
        </>
      )}

      {sectionId && roster && roster.length > 0 && (
        <>
          <View className="flex-row px-4 pb-2">
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => markAll(opt.value)}
                disabled={isLocked}
                className="mr-2 px-3 py-1.5 rounded-full border border-gray-200"
                style={{ opacity: isLocked ? 0.5 : 1 }}
              >
                <Text className="text-xs inter_medium text-gray-600">
                  Mark all {opt.value}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={roster}
            keyExtractor={(item) => item.studentId}
            className="bg-white mx-4 rounded-2xl border border-gray-100"
            renderItem={({ item }) => (
              <StudentRow
                item={item}
                status={draft[item.studentId] ?? "NotMarked"}
                disabled={isLocked}
                onChange={(value) =>
                  setDraft((d) => ({ ...d, [item.studentId]: value }))
                }
              />
            )}
          />

          <View className="p-4">
            <Pressable
              onPress={handleSave}
              disabled={isLocked || isSaving}
              className="bg-blue-600 rounded-xl py-3.5 items-center"
              style={{ opacity: isLocked || isSaving ? 0.5 : 1 }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white inter_bold text-base">
                  Save Attendance
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default MarkAttendancePage;
