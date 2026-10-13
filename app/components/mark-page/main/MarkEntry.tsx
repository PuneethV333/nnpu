import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetMySections } from "@/src/hooks/useSections";
import { useGetStudents } from "@/src/hooks/useStudents";
import {
  useGetMySubjects,
  useGetAssessments,
  useGetAssessmentMarks,
  useEnterMarks,
} from "@/src/hooks/useMarks";
import { SectionPicker } from "@/components/attendance-page/SectionPicker";
import { MarkEntryRow } from "@/components/mark-page/MarkEntryRow";
import { PillTabs } from "@/components/ui/Primitives";
import { AttendanceStatusModal } from "@/components/attendance-page/AttendanceStatusModal";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import {
  ChipRowSkeleton,
  MarkEntryRowsSkeleton,
  SectionTileSkeleton,
} from "@/components/ui/skeletons";
import { useTabBarClearance } from "@/src/hooks/useTabBarClearance";

/** Selection accent, matching the rest of the app's blue. */
const ACCENT = "#2563EB";

const CATEGORY_LABEL: Record<string, string> = {
  UnitTest: "Unit Test",
  MidTerm: "Mid Term",
  FinalTheory: "Final Theory",
  FinalPractical: "Final Practical",
  Internal: "Internal",
};

/** Quick-tap marks shortcuts, filtered to what the assessment allows. */
type Draft = Record<string, string>;

/**
 * "enter" writes marks; "view" shows what is already saved.
 *
 * Both render the same row component so the two modes cannot drift.
 */
type Mode = "enter" | "view";

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text className="text-xs font-semibold text-gray-400 tracking-wide px-4 mt-5 mb-2">
    {children}
  </Text>
);

/**
 * Shared mark-entry screen. `GET /marks/my-subjects`, `/marks/assessment`
 * and `/auth/students-details` are all Teacher+Admin, and `POST /marks/enter`
 * is Teacher+Admin too, so Teacher and Admin get the same UI — the only
 * difference is the heading.
 */
const MarkEntry = ({ heading }: { heading: string }) => {
  const tabBarClearance = useTabBarClearance();
  // A teacher must pick from the sections they are actually staffed in.
  // `useGetAllSections` returns every section in the school, and the backend
  // then answers 403 for any section the teacher has no `sectionSubject` row in
  // — so picking from the full list offers sections that are guaranteed to
  // fail, which is what made this screen look dead. `/sections/mine` is the
  // teacher-scoped list (class teacher OR subject teacher).
  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
    refetch: refetchSections,
  } = useGetMySections();
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  /**
   * "enter" overwrites the roster with what the teacher types; "view" shows
   * what is already saved.
   *
   * Defaulting to enter meant a teacher opening an assessment they had already
   * marked saw an empty sheet and no indication the marks existed — the
   * strongest reading of "the page is empty" was "nothing has been entered",
   * when in fact 40 students were already marked. Viewing first makes the
   * existing state the default and puts editing one deliberate step away.
   */
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<Draft>({});
  const [modal, setModal] = useState({
    visible: false,
    type: "success" as "success" | "error",
    message: "",
  });

  const { data: subjects, isLoading: subjectsLoading } =
    useGetMySubjects(sectionId);
  // `useGetAssessments` is enabled as soon as sectionId is set, so passing an
  // empty sectionId until a subject is chosen avoids fetching every assessment
  // in the section just to discard them.
  //
  // `isLoading` matters here: while the fetch is in flight `assessments` is
  // undefined, which is indistinguishable from "this subject has none". The
  // screen used to render the empty state for that whole window, so tapping a
  // subject briefly claimed the teacher had created no assessments.
  const { data: assessments, isLoading: assessmentsLoading } =
    useGetAssessments(subjectId ? sectionId : "", subjectId || undefined);
  const { data: students, isLoading: studentsLoading } =
    useGetStudents(sectionId);
  const { mutate: enterMarks, isPending: isSaving } = useEnterMarks();

  // Saved marks for the chosen assessment, keyed by studentId. Empty until an
  // assessment is picked, which is what lets the sheet open on "view" without
  // showing a false "nothing recorded" for the assessment not yet selected.
  const { data: savedMarkRows } = useGetAssessmentMarks(assessmentId);
  const savedMarks = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of savedMarkRows ?? []) map[m.studentId] = m.marksObtained;
    return map;
  }, [savedMarkRows]);

  const assessment = useMemo(
    () => assessments?.find((a) => a.id === assessmentId) ?? null,
    [assessments, assessmentId],
  );

  // `draft` is intentionally sparse: a student with no key simply hasn't been
  // marked yet, so a roster that loads late never clobbers typed-in values.
  const entered = (students ?? []).filter(
    (s) => draft[s.id] !== undefined,
  ).length;

  /**
   * Runs `apply` unless it would silently destroy typed marks.
   *
   * Switching section, subject or assessment all reset the draft, because the
   * entries belong to the previous assessment — but resetting without asking
   * means a teacher who has entered 40 marks, taps the wrong subject pill and
   * loses all of them with no undo and no prompt. That is the worst failure
   * mode in a data-entry screen, and it looks like the app losing work rather
   * than the teacher mis-tapping.
   *
   * Only the marks are at risk; changing a selection always applies. "Keep
   * editing" is the safe default so dismissing the dialog does the safe thing.
   */
  /**
   * Switching to "view" fills the draft from the saved marks, so the same row
   * markup renders either mode. `savedMarks` comes from the assessment's marks,
   * which the backend returns alongside it — no second request, and no
   * "empty because not loaded" flash.
   */
  const changeMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "view") {
      setDraft(Object.fromEntries(
        Object.entries(savedMarks).map(([id, v]) => [id, String(v)]),
      ));
      return;
    }
    // Entering starts from the saved values so an edit is a correction rather
    // than a full retype; the teacher clears a box to blank it.
    setDraft(Object.fromEntries(
      Object.entries(savedMarks).map(([id, v]) => [id, String(v)]),
    ));
    setMode("enter");
  };

  const withDraftGuard = (label: string, apply: () => void) => {
    if (entered === 0) {
      apply();
      return;
    }

    Alert.alert(
      "Discard entered marks?",
      `You have entered marks for ${entered} student${
        entered > 1 ? "s" : ""
      }. Choosing a different ${label} will clear them. This cannot be undone.`,
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: apply },
      ],
    );
  };

  // Cascading resets live in the handlers below rather than in effects:
  // picking a section drops subject/assessment/marks, picking a subject drops
  // assessment/marks, and picking an assessment starts a blank draft.
  const selectSection = (id: string) =>
    withDraftGuard("section", () => {
      setSectionId(id);
      setSubjectId("");
      setAssessmentId("");
      setDraft({});
    });

  const selectSubject = (id: string) =>
    withDraftGuard("subject", () => {
      setSubjectId(id);
      setAssessmentId("");
      setDraft({});
    });

  const selectAssessment = (id: string) =>
    withDraftGuard("assessment", () => {
      setAssessmentId(id);
      setDraft({});
    });

  // Rows whose typed value isn't a valid mark within [0, maxMarks]. Sending
  // one of these makes the backend reject the entire batch (the DTO validates
  // every entry), so they're blocked before submit instead.
  const invalidRows = useMemo(() => {
    if (!assessment) return [];
    return (students ?? []).filter((s) => {
      const raw = draft[s.id];
      if (raw === undefined) return false;
      const n = Number(raw);
      return (
        raw.trim() === "" || Number.isNaN(n) || n < 0 || n > assessment.maxMarks
      );
    });
  }, [assessment, students, draft]);

  const handleSave = () => {
    if (!assessment || !students) return;

    if (invalidRows.length > 0) {
      Alert.alert(
        "Check the marks entered",
        `${invalidRows.length} student${
          invalidRows.length > 1 ? "s have" : " has"
        } a blank or out-of-range value. Marks must be between 0 and ${
          assessment.maxMarks
        }.`,
      );
      return;
    }

    const entries = students
      .filter((s) => draft[s.id] !== undefined)
      .map((s) => ({
        studentId: s.id,
        marksObtained: Number(draft[s.id]),
      }));

    if (entries.length === 0) {
      Alert.alert("Nothing to save", "Enter marks for at least one student.");
      return;
    }

    enterMarks(
      { assessmentId: assessment.id, entries },
      {
        onSuccess: () => {
          // Clear the draft: the marks are persisted, so leaving the boxes
          // filled would keep Save enabled and let a second identical batch be
          // submitted by mistake.
          setDraft({});
          setModal({
            visible: true,
            type: "success",
            message: `Saved marks for ${entries.length} student${
              entries.length > 1 ? "s" : ""
            }.`,
          });
        },
        onError: (err: unknown) =>
          setModal({
            visible: true,
            type: "error",
            message:
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ?? "Couldn't save marks. Try again.",
          }),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarClearance }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">
            {heading}
          </Text>

          {sectionsLoading ? (
            <View style={{ marginTop: 20 }}>
              <SectionTileSkeleton />
            </View>
          ) : sectionsError ? (
            <ErrorState
              title="Couldn't load sections"
              subtitle="Check your connection and try again."
              onRetry={() => refetchSections()}
            />
          ) : !sections || sections.length === 0 ? (
            <EmptyState
              icon="grid"
              title="No sections assigned"
              subtitle="You will see sections here once you are assigned to teach one, or made class teacher."
            />
          ) : (
            <>
              <Label>SECTION</Label>
              <SectionPicker
                sections={sections}
                selectedId={sectionId}
                onSelect={selectSection}
              />

              {!sectionId ? (
                <EmptyState
                  icon="users"
                  title="Pick a section"
                  subtitle="Choose a section to continue."
                />
              ) : subjectsLoading ? (
                <View style={{ marginTop: 20 }}>
                  <ChipRowSkeleton />
                </View>
              ) : !subjects || subjects.length === 0 ? (
                <EmptyState
                  icon="book"
                  title="No subjects here"
                  subtitle="No subjects are assigned to you for this section."
                />
              ) : (
                <>
                  <Label>SUBJECT</Label>
                  <PillTabs
                    options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                    value={subjectId}
                    onChange={selectSubject}
                    activeColor={ACCENT}
                  />

                  {!subjectId ? (
                    <EmptyState
                      icon="book"
                      title="Pick a subject"
                      subtitle="Choose a subject to continue."
                    />
                  ) : assessmentsLoading ? (
                    <View style={{ marginTop: 20 }}>
                      <ChipRowSkeleton />
                    </View>
                  ) : !assessments || assessments.length === 0 ? (
                    <EmptyState
                      icon="clipboard"
                      title="No assessments yet"
                      subtitle="No assessments have been created for this subject."
                    />
                  ) : (
                    <>
                      <Label>ASSESSMENT</Label>
                      <PillTabs
                        options={assessments.map((a) => ({
                          value: a.id,
                          label: `${a.name} · ${
                            CATEGORY_LABEL[a.category] ?? a.category
                          } · max ${a.maxMarks}`,
                        }))}
                        value={assessmentId}
                        onChange={selectAssessment}
                        activeColor={ACCENT}
                      />

                      {!assessment ? (
                        <EmptyState
                          icon="clipboard"
                          title="Pick an assessment"
                          subtitle="Choose an assessment to enter marks."
                        />
                      ) : studentsLoading ? (
                        <View style={{ marginTop: 20 }}>
                          <MarkEntryRowsSkeleton />
                        </View>
                      ) : !students || students.length === 0 ? (
                        <EmptyState
                          icon="user-x"
                          title="No students yet"
                          subtitle="This section has no students."
                        />
                      ) : (
                        <>
                          {(() => {
                            const recorded = Object.keys(savedMarks).length;
                            return (
                              <View className="px-4 mt-5 mb-1">
                                <View className="flex-row bg-gray-100 rounded-xl p-1">
                                  {(["view", "enter"] as const).map((m) => {
                                    const active = mode === m;
                                    return (
                                      <Pressable
                                        key={m}
                                        onPress={() => changeMode(m)}
                                        className="flex-1 py-2 rounded-lg items-center"
                                        style={{
                                          backgroundColor: active
                                            ? "#FFFFFF"
                                            : "transparent",
                                        }}
                                      >
                                        <Text
                                          className="text-[13px] font-semibold"
                                          style={{
                                            color: active
                                              ? "#111827"
                                              : "#6B7280",
                                          }}
                                        >
                                          {m === "view" ? "View marks" : "Enter marks"}
                                        </Text>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                                <Text className="text-[11px] text-gray-400 mt-2">
                                  {recorded === 0
                                    ? "Nothing recorded for this assessment yet."
                                    : `Showing ${recorded} recorded mark${
                                        recorded === 1 ? "" : "s"
                                      }.`}
                                </Text>
                              </View>
                            );
                          })()}

                          <View className="flex-row items-center justify-between px-4 mt-5">
                            <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                              OUT OF {assessment.maxMarks}
                            </Text>
                            <Text
                              className={`text-xs font-semibold ${
                                invalidRows.length > 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {entered}/{students.length} entered
                            </Text>
                          </View>

                          <View className="mt-2 mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            {students.map((s) => (
                              <MarkEntryRow
                                key={s.id}
                                name={s.name ?? s.id}
                                value={draft[s.id] ?? ""}
                                maxMarks={assessment.maxMarks}
                                onChange={(next) =>
                                  setDraft((d) => {
                                    const updated = { ...d };
                                    if (next.trim() === "") {
                                      // Treat a cleared box as "not entered"
                                      // rather than a recorded zero.
                                      delete updated[s.id];
                                    } else {
                                      updated[s.id] = next;
                                    }
                                    return updated;
                                  })
                                }
                              />
                            ))}
                          </View>

                          {mode === "enter" ? (
                          <View className="px-4 mt-4">
                            <Pressable
                              onPress={handleSave}
                              disabled={
                                isSaving ||
                                entered === 0 ||
                                invalidRows.length > 0
                              }
                              className={`bg-blue-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2 ${
                                isSaving ||
                                entered === 0 ||
                                invalidRows.length > 0
                                  ? "opacity-40"
                                  : ""
                              }`}
                            >
                              {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <>
                                  <Feather
                                    name="save"
                                    size={16}
                                    color="#FFFFFF"
                                  />
                                  <Text className="text-white font-bold text-[15px]">
                                    Save Marks
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                          ) : null}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AttendanceStatusModal
        visible={modal.visible}
        type={modal.type}
        title={modal.type === "success" ? "Saved" : "Couldn't save"}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, visible: false }))}
        onRetry={
          modal.type === "error"
            ? () => {
                setModal((m) => ({ ...m, visible: false }));
                handleSave();
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
};


export default MarkEntry;