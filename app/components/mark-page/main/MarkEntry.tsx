import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetAllSections } from "@/src/hooks/useSections";
import { useGetStudents } from "@/src/hooks/useStudents";
import {
  useGetMySubjects,
  useGetAssessments,
  useEnterMarks,
} from "@/src/hooks/useMarks";
import { SectionPicker } from "@/components/attendance-page/SectionPicker";
import { AttendanceStatusModal } from "@/components/attendance-page/AttendanceStatusModal";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import {
  ChipRowSkeleton,
  MarkEntryRowsSkeleton,
  SectionTileSkeleton,
} from "@/components/ui/skeletons";
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const CATEGORY_LABEL: Record<string, string> = {
  UnitTest: "Unit Test",
  MidTerm: "Mid Term",
  FinalTheory: "Final Theory",
  FinalPractical: "Final Practical",
  Internal: "Internal",
};

/** Quick-tap marks shortcuts, filtered to what the assessment allows. */
const MARK_PRESETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

type Draft = Record<string, string>;

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text className="text-xs font-semibold text-gray-400 tracking-wide px-4 mt-5 mb-2">
    {children}
  </Text>
);

const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="px-3 py-2 rounded-full border"
    style={{
      backgroundColor: selected ? "#2563EB" : "#FFFFFF",
      borderColor: selected ? "#2563EB" : "#E5E7EB",
    }}
  >
    <Text
      className="text-sm font-medium"
      style={{ color: selected ? "#FFFFFF" : "#374151" }}
    >
      {label}
    </Text>
  </Pressable>
);

const MarkEntryRow = ({
  name,
  value,
  maxMarks,
  onChange,
}: {
  name: string;
  value: string;
  maxMarks: number;
  onChange: (next: string) => void;
}) => {
  const numeric = Number(value);
  const invalid = value !== "" && (Number.isNaN(numeric) || numeric < 0);
  const over = !invalid && numeric > maxMarks;

  return (
    <View className="px-4 py-3 border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[15px] font-medium text-gray-900 flex-1 mr-3"
          numberOfLines={1}
        >
          {name}
        </Text>

        <View className="flex-row items-center">
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="-"
            placeholderTextColor="#D1D5DB"
            keyboardType="numeric"
            className="w-16 text-center text-[15px] font-semibold rounded-lg border bg-white"
            style={{
              borderColor: invalid || over ? "#DC2626" : "#E5E7EB",
              paddingVertical: 6,
              paddingHorizontal: 8,
              color: invalid || over ? "#DC2626" : "#111827",
            }}
          />
          <Text className="text-sm text-gray-400 ml-2 w-8 text-right">
            /{maxMarks}
          </Text>
        </View>
      </View>

      {over && (
        <Text className="text-xs text-red-500 mt-1">
          Marks can&apos;t exceed {maxMarks}.
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingTop: 8, paddingRight: 8 }}
      >
        {MARK_PRESETS.filter((p) => p <= maxMarks).map((p) => (
          <Pressable
            key={p}
            onPress={() => onChange(String(p))}
            className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50"
          >
            <Text className="text-[11px] font-medium text-gray-600">{p}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Shared mark-entry screen. `GET /marks/my-subjects`, `/marks/assessment`
 * and `/auth/students-details` are all Teacher+Admin, and `POST /marks/enter`
 * is Teacher+Admin too, so Teacher and Admin get the same UI — the only
 * difference is the heading.
 */
const MarkEntry = ({ heading }: { heading: string }) => {
  const tabBarClearance = useTabBarClearance();
  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
    refetch: refetchSections,
  } = useGetAllSections();
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [modal, setModal] = useState({
    visible: false,
    type: "success" as "success" | "error",
    message: "",
  });

  const { data: subjects, isLoading: subjectsLoading } = useGetMySubjects(sectionId);
  const { data: assessments } = useGetAssessments(
    sectionId,
    subjectId || undefined,
  );
  const { data: students, isLoading: studentsLoading } =
    useGetStudents(sectionId);
  const { mutate: enterMarks, isPending: isSaving } = useEnterMarks();

  const assessment = useMemo(
    () => assessments?.find((a) => a.id === assessmentId) ?? null,
    [assessments, assessmentId],
  );

  // Cascading resets live in the handlers below rather than in effects:
  // picking a section drops subject/assessment/marks, picking a subject drops
  // assessment/marks, and picking an assessment starts a blank draft.
  const selectSection = (id: string) => {
    setSectionId(id);
    setSubjectId("");
    setAssessmentId("");
    setDraft({});
  };

  const selectSubject = (id: string) => {
    setSubjectId(id);
    setAssessmentId("");
    setDraft({});
  };

  const selectAssessment = (id: string) => {
    setAssessmentId(id);
    setDraft({});
  };

  // `draft` is intentionally sparse: a student with no key simply hasn't been
  // marked yet, so a roster that loads late never clobbers typed-in values.
  const entered = (students ?? []).filter((s) => draft[s.id] !== undefined).length;

  // Rows whose typed value isn't a valid mark within [0, maxMarks]. Sending
  // one of these makes the backend reject the entire batch (the DTO validates
  // every entry), so they're blocked before submit instead.
  const invalidRows = useMemo(() => {
    if (!assessment) return [];
    return (students ?? []).filter((s) => {
      const raw = draft[s.id];
      if (raw === undefined) return false;
      const n = Number(raw);
      return raw.trim() === '' || Number.isNaN(n) || n < 0 || n > assessment.maxMarks;
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
        onSuccess: () =>
          setModal({
            visible: true,
            type: "success",
            message: `Saved marks for ${entries.length} student${
              entries.length > 1 ? "s" : ""
            }.`,
          }),
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
            <EmptyState icon="grid" title="No sections yet" subtitle="Sections appear once the school creates them." />
          ) : (
            <>
              <Label>SECTION</Label>
              <SectionPicker
                sections={sections}
                selectedId={sectionId}
                onSelect={selectSection}
              />

              {!sectionId ? (
                <EmptyState icon="users" title="Pick a section" subtitle="Choose a section to continue." />
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                  >
                    {subjects.map((s) => (
                      <Pill
                        key={s.id}
                        label={s.name}
                        selected={subjectId === s.id}
                        onPress={() => selectSubject(s.id)}
                      />
                    ))}
                  </ScrollView>

                  {!subjectId ? (
                    <EmptyState icon="book" title="Pick a subject" subtitle="Choose a subject to continue." />
                  ) : !assessments || assessments.length === 0 ? (
                    <EmptyState
                      icon="clipboard"
                      title="No assessments yet"
                      subtitle="No assessments have been created for this subject."
                    />
                  ) : (
                    <>
                      <Label>ASSESSMENT</Label>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                      >
                        {assessments.map((a) => (
                          <Pill
                            key={a.id}
                            label={`${a.name} · ${
                              CATEGORY_LABEL[a.category] ?? a.category
                            } · max ${a.maxMarks}`}
                            selected={assessmentId === a.id}
                            onPress={() => selectAssessment(a.id)}
                          />
                        ))}
                      </ScrollView>

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
                                    if (next.trim() === '') {
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

                          <View className="px-4 mt-4">
                            <Pressable
                              onPress={handleSave}
                              disabled={
                                isSaving || entered === 0 || invalidRows.length > 0
                              }
                              className={`bg-blue-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2 ${
                                isSaving || entered === 0 || invalidRows.length > 0
                                  ? "opacity-40"
                                  : ""
                              }`}
                            >
                              {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <>
                                  <Feather name="save" size={16} color="#FFFFFF" />
                                  <Text className="text-white font-bold text-[15px]">
                                    Save Marks
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
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
