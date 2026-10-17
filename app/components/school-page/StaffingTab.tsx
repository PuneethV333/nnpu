import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useAssignSubjects,
  useGetAllSections,
  useGetSectionAssignments,
  useGetTeacherPool,
  useSetClassTeacher,
} from '@/src/hooks/useSections';
import { errorMessage } from '@/src/libs/errorMessage';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { ChipRowSkeleton, StaffingSkeleton } from '@/components/ui/skeletons';
import {
  Banner,
  Card,
  FieldLabel,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';
import type { Section, SectionSubjectAssignment } from '@/src/types/section';
import TeacherPickerSheet from './TeacherPickerSheet';

type PickerTarget =
  | { kind: 'class' }
  | { kind: 'subject'; assignment: SectionSubjectAssignment };

/** Set equality — the order a set is toggled in is not a change. */
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

const SectionStaffing = ({ sectionId, sections }: { sectionId: string; sections: Section[] }) => {
  const { data, isLoading, isError, refetch } = useGetSectionAssignments(sectionId);
  const pool = useGetTeacherPool(sections.map((s) => s.id));
  const { mutate: setClassTeacher, isPending: savingClassTeacher } = useSetClassTeacher();
  const { mutate: assignSubjects, isPending: savingSubjects } = useAssignSubjects();

  // Only the subjects the admin has touched. Effective set = draft ?? server.
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  if (isLoading) {
    // Shaped like the real content (class-teacher card, then subject rows) so
    // nothing reflows when the data lands.
    return <StaffingSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't load staffing"
        subtitle="Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const serverIds = (s: SectionSubjectAssignment) => s.teachers.map((t) => t.id);

  const effectiveIds = (s: SectionSubjectAssignment) =>
    Object.prototype.hasOwnProperty.call(draft, s.subjectId)
      ? draft[s.subjectId]
      : serverIds(s);

  const nameOf = (id: string) =>
    pool.teachers.find((t) => t.id === id)?.name ??
    data.subjects
      .flatMap((s) => s.teachers)
      .find((t) => t.id === id)?.name ??
    'Teacher';

  const labelFor = (s: SectionSubjectAssignment, ids: string[]) => {
    const names =
      ids.length === 0
        ? []
        : Object.prototype.hasOwnProperty.call(draft, s.subjectId)
          ? ids.map(nameOf)
          : s.teachers.map((t) => t.name ?? 'Teacher');
    return names.length > 0 ? names.join(', ') : 'Nobody';
  };

  const changed = data.subjects.filter((s) => !sameSet(effectiveIds(s), serverIds(s)));

  const pickClassTeacher = (teacherId: string | null) => {
    setPicker(null);
    setClassTeacher(
      { sectionId, body: { teacherId } },
      {
        onError: (err) =>
          Alert.alert(
            'Could not change class teacher',
            // 409: Section.classTeacherId is unique, so one teacher can lead only one section.
            errorMessage(err),
          ),
      },
    );
  };

  /**
   * Toggle one teacher on a subject. Multi-select, so the sheet stays open —
   * the pending set is held in `draft` and committed by Save.
   */
  const toggleSubjectTeacher = (s: SectionSubjectAssignment, teacherId: string | null) => {
    setDraft((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, s.subjectId)
        ? prev[s.subjectId]
        : serverIds(s);
      const next =
        teacherId === null
          ? []
          : current.includes(teacherId)
            ? current.filter((id) => id !== teacherId)
            : [...current, teacherId];
      return { ...prev, [s.subjectId]: next };
    });
  };

  const save = () => {
    assignSubjects(
      {
        sectionId,
        // The endpoint upserts what it is sent and never clears the rest, so
        // send the complete set the section should end up with.
        body: {
          assignments: data.subjects.map((s) => ({
            subjectId: s.subjectId,
            teacherIds: effectiveIds(s),
          })),
        },
      },
      {
        onSuccess: () => {
          setDraft({});
          Alert.alert('Saved', 'Subject teachers updated.');
        },
        onError: (err) => Alert.alert('Could not save', errorMessage(err)),
      },
    );
  };

  const unstaffed = data.subjects.filter((s) => effectiveIds(s).length === 0).length;

  return (
    <>
      <SectionTitle title="Class teacher" />
      <Card className="p-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center">
            <Feather name="star" size={18} color="#D97706" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-[15px] font-semibold text-gray-900">
              {data.classTeacher?.name ?? (data.classTeacher ? 'Teacher' : 'Not assigned')}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {data.sectionName} · {data.session}
            </Text>
          </View>
          <Pressable
            onPress={() => setPicker({ kind: 'class' })}
            disabled={savingClassTeacher}
            accessibilityRole="button"
            // No `className`: NativeWind drops a function-valued `style` on a
            // className'd Pressable, so the press fill would never show.
            style={({ pressed }) => ({
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: pressed ? '#EEF2FF' : 'transparent',
              opacity: savingClassTeacher ? 0.5 : 1,
            })}
          >
            <Text className="text-sm font-semibold text-indigo-600">
              {savingClassTeacher ? 'Saving…' : data.classTeacher ? 'Change' : 'Assign'}
            </Text>
          </Pressable>
        </View>
      </Card>

      <SectionTitle
        title="Subject teachers"
        right={
          unstaffed > 0 ? (
            <Pill label={`${unstaffed} unstaffed`} color="#D97706" />
          ) : null
        }
      />

      {data.subjects.length === 0 ? (
        <Card className="items-center py-6">
          <Text className="text-sm text-gray-400">No subjects in this section yet.</Text>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {data.subjects.map((s, idx) => {
            const ids = effectiveIds(s);
            const isDirty = !sameSet(ids, serverIds(s));

            return (
              <Pressable
                key={s.subjectId}
                onPress={() => setPicker({ kind: 'subject', assignment: s })}
                accessibilityRole="button"
                accessibilityLabel={`Teachers for ${s.subjectName}`}
                // No `className` for the same reason as the button above.
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: idx !== data.subjects.length - 1 ? 1 : 0,
                  borderBottomColor: '#F3F4F6',
                  backgroundColor: pressed ? '#EEF2FF' : 'transparent',
                })}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-[15px] font-medium text-gray-900" numberOfLines={1}>
                      {s.subjectName}
                    </Text>
                    {s.hasPractical ? <Feather name="award" size={12} color="#2563EB" /> : null}
                    {ids.length > 1 ? (
                      <Pill label={`${ids.length} teachers`} color="#4F46E5" />
                    ) : null}
                  </View>
                  <Text
                    className="text-xs mt-0.5"
                    numberOfLines={1}
                    style={{
                      color: ids.length > 0 ? (isDirty ? '#4F46E5' : '#6B7280') : '#D97706',
                      fontWeight: isDirty ? '600' : '400',
                    }}
                  >
                    {labelFor(s, ids)}
                    {isDirty ? ' · unsaved' : ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              </Pressable>
            );
          })}
        </Card>
      )}

      {changed.length > 0 ? (
        <View className="mx-4 mt-4" style={{ gap: 10 }}>
          <PrimaryButton
            label={`Save ${changed.length} change${changed.length > 1 ? 's' : ''}`}
            icon="check"
            onPress={save}
            loading={savingSubjects}
          />
          <PrimaryButton
            label="Discard"
            tone="neutral"
            onPress={() => setDraft({})}
            disabled={savingSubjects}
          />
        </View>
      ) : null}

      {picker ? (
        <TeacherPickerSheet
          title={picker.kind === 'class' ? 'Class teacher' : picker.assignment.subjectName}
          subtitle={
            picker.kind === 'class'
              ? data.sectionName
              : `${data.sectionName} · ${
                  effectiveIds(picker.assignment).length
                } selected`
          }
          teachers={pool.teachers}
          isLoading={pool.isLoading}
          noneLabel={picker.kind === 'class' ? 'Unassign class teacher' : 'Nobody'}
          multiple={picker.kind === 'subject'}
          selectedIds={
            picker.kind === 'class'
              ? data.classTeacher
                ? [data.classTeacher.id]
                : []
              : effectiveIds(picker.assignment)
          }
          onToggle={(id) =>
            picker.kind === 'class'
              ? pickClassTeacher(id)
              : toggleSubjectTeacher(picker.assignment, id)
          }
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
};

const StaffingTab = () => {
  const { data: sections, isLoading, isError, refetch } = useGetAllSections();
  const [sectionId, setSectionId] = useState('');

  return (
    <>
      <SectionTitle title="Staffing" />

      {isLoading ? (
        <ChipRowSkeleton count={3} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load sections"
          subtitle="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : !sections || sections.length === 0 ? (
        <EmptyState icon="grid" title="No sections yet" subtitle="Create a section to staff it." />
      ) : (
        <>
          <Card className="p-4">
            <FieldLabel>Section</FieldLabel>
            <SectionChips
              sections={sections}
              selectedIds={sectionId ? [sectionId] : []}
              onToggle={(id) => setSectionId(id === sectionId ? '' : id)}
            />
          </Card>

          {sectionId ? (
            // Keyed so unsaved subject edits never leak into another section.
            <SectionStaffing key={sectionId} sectionId={sectionId} sections={sections} />
          ) : (
            <View className="mx-4 mt-4">
              <Banner tone="info">
                Pick a section to see its class teacher and who teaches each subject.
              </Banner>
            </View>
          )}
        </>
      )}
    </>
  );
};

export default StaffingTab;
