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
import { SkeletonList } from '@/components/ui/skeletons';
import {
  Banner,
  Card,
  FieldLabel,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';
import type { Section } from '@/src/types/section';
import TeacherPickerSheet from './TeacherPickerSheet';

type PickerTarget =
  | { kind: 'class' }
  | { kind: 'subject'; subjectId: string; subjectName: string };

const SectionStaffing = ({ sectionId, sections }: { sectionId: string; sections: Section[] }) => {
  const { data, isLoading, isError, refetch } = useGetSectionAssignments(sectionId);
  const pool = useGetTeacherPool(sections.map((s) => s.id));
  const { mutate: setClassTeacher, isPending: savingClassTeacher } = useSetClassTeacher();
  const { mutate: assignSubjects, isPending: savingSubjects } = useAssignSubjects();

  // Only the subjects the admin has touched. Effective teacher = draft ?? server.
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const nameOf = (id: string | null) =>
    id ? pool.teachers.find((t) => t.id === id)?.name ?? 'Teacher' : null;

  if (isLoading) {
    return (
      <View className="mt-4">
        <SkeletonList count={4} lastWidth="50%" />
      </View>
    );
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

  const effective = (subjectId: string, serverId: string | null) =>
    Object.prototype.hasOwnProperty.call(draft, subjectId) ? draft[subjectId] : serverId;

  const changed = data.subjects.filter((s) => effective(s.subjectId, s.teacherId) !== s.teacherId);

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

  const pickSubjectTeacher = (subjectId: string, teacherId: string | null) => {
    setPicker(null);
    setDraft((prev) => ({ ...prev, [subjectId]: teacherId }));
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
            teacherId: effective(s.subjectId, s.teacherId),
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

  const unstaffed = data.subjects.filter(
    (s) => effective(s.subjectId, s.teacherId) === null,
  ).length;

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
            className="rounded-full border border-gray-200 px-3 py-1.5"
            style={{ opacity: savingClassTeacher ? 0.5 : 1 }}
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
            const teacherId = effective(s.subjectId, s.teacherId);
            const isDirty = teacherId !== s.teacherId;
            const label = isDirty
              ? nameOf(teacherId) ?? 'Nobody'
              : s.teacherName ?? 'Nobody';

            return (
              <Pressable
                key={s.subjectId}
                onPress={() =>
                  setPicker({ kind: 'subject', subjectId: s.subjectId, subjectName: s.subjectName })
                }
                className={`flex-row items-center px-4 py-3 ${
                  idx !== data.subjects.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                style={({ pressed }) => ({ backgroundColor: pressed ? '#F9FAFB' : 'transparent' })}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-[15px] font-medium text-gray-900" numberOfLines={1}>
                      {s.subjectName}
                    </Text>
                    {s.hasPractical ? <Feather name="award" size={12} color="#2563EB" /> : null}
                  </View>
                  <Text
                    className="text-xs mt-0.5"
                    style={{
                      color: teacherId ? (isDirty ? '#4F46E5' : '#6B7280') : '#D97706',
                      fontWeight: isDirty ? '600' : '400',
                    }}
                  >
                    {label}
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
          title={picker.kind === 'class' ? 'Class teacher' : picker.subjectName}
          subtitle={picker.kind === 'class' ? data.sectionName : `Teacher for ${data.sectionName}`}
          teachers={pool.teachers}
          isLoading={pool.isLoading}
          noneLabel={picker.kind === 'class' ? 'Unassign class teacher' : 'Leave unstaffed'}
          currentId={
            picker.kind === 'class'
              ? data.classTeacher?.id ?? null
              : effective(
                  picker.subjectId,
                  data.subjects.find((s) => s.subjectId === picker.subjectId)?.teacherId ?? null,
                )
          }
          onPick={(id) =>
            picker.kind === 'class'
              ? pickClassTeacher(id)
              : pickSubjectTeacher(picker.subjectId, id)
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
        <View className="mx-4">
          <SkeletonList count={2} lastWidth="40%" />
        </View>
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
