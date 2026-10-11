import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StudentRow } from "@/components/attendance-page/StudentRow";
import { AttendanceStatusModal } from "@/components/attendance-page/AttendanceStatusModal";
import {
  MarkStatus,
  RosterArray,
  STATUS_OPTIONS,
  type MarkAttendanceType,
} from "@/src/types/attendance";
import { styles } from "@/src/style/markAttendance";

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

export { RosterEditor };
