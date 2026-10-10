import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useGetStudents } from '@/src/hooks/useStudents';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { SkeletonList } from '@/components/ui/skeletons';
import { Card, FieldLabel, Pill, SectionTitle } from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';
import ImportCard from './ImportCard';
import StudentActionsSheet from './StudentActionsSheet';

type Student = { id: string; name: string | null };

const StudentsTab = () => {
  const { data: sections, isLoading: sectionsLoading, isError, refetch } = useGetAllSections();
  const [sectionId, setSectionId] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Student | null>(null);
  // Account state learned from lifecycle calls, keyed by user id.
  const [statusById, setStatusById] = useState<Record<string, boolean>>({});

  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useGetStudents(sectionId);

  const section = (sections ?? []).find((s) => s.id === sectionId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students ?? [];
    return (students ?? []).filter((s) => (s.name ?? s.id).toLowerCase().includes(q));
  }, [students, query]);

  return (
    <>
      <SectionTitle title="Manage students" />

      {sectionsLoading ? (
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
        <EmptyState
          icon="users"
          title="No sections yet"
          subtitle="Create a section before adding students."
        />
      ) : (
        <Card className="p-4">
          <FieldLabel>Section</FieldLabel>
          <SectionChips
            sections={sections}
            selectedIds={sectionId ? [sectionId] : []}
            onToggle={(id) => {
              setSectionId(id === sectionId ? '' : id);
              setQuery('');
            }}
          />
        </Card>
      )}

      {section ? (
        <>
          <SectionTitle
            title="Students"
            right={
              <Text className="text-xs font-semibold text-gray-500">
                {students?.length ?? 0}
              </Text>
            }
          />

          <View className="mx-4 mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white px-3">
            <Feather name="search" size={16} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name"
              placeholderTextColor="#9CA3AF"
              className="flex-1 py-2.5 px-2 text-[15px] text-gray-900"
            />
          </View>

          {studentsLoading ? (
            <View>
              <SkeletonList count={6} lastWidth="55%" />
            </View>
          ) : studentsError ? (
            <ErrorState
              title="Couldn't load students"
              subtitle="Check your connection and try again."
              onRetry={() => refetchStudents()}
            />
          ) : filtered.length === 0 ? (
            <Card className="items-center py-8">
              <Feather name="user-x" size={22} color="#D1D5DB" />
              <Text className="text-sm text-gray-400 mt-2">
                {query ? 'No student matches that search.' : 'No students enrolled in this section.'}
              </Text>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {filtered.map((s, idx) => {
                const known = statusById[s.id];
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setActive(s)}
                    className={`flex-row items-center px-4 py-3 ${
                      idx !== filtered.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#F9FAFB' : 'transparent',
                    })}
                  >
                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                      <Text className="text-xs font-bold text-gray-600">
                        {(s.name ?? s.id).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      className="text-[15px] font-medium text-gray-900 ml-3 flex-1"
                      numberOfLines={1}
                    >
                      {s.name ?? s.id}
                    </Text>
                    {known === false ? <Pill label="Deactivated" color="#DC2626" /> : null}
                    <Feather
                      name="more-horizontal"
                      size={18}
                      color="#9CA3AF"
                      style={{ marginLeft: 8 }}
                    />
                  </Pressable>
                );
              })}
            </Card>
          )}
        </>
      ) : null}

      <SectionTitle title="Adding students" />
      <ImportCard />

      {active && section ? (
        <StudentActionsSheet
          key={active.id}
          student={active}
          currentSection={section}
          sections={sections ?? []}
          isActive={statusById[active.id]}
          onStatusChange={(userId, isActive) =>
            setStatusById((prev) => ({ ...prev, [userId]: isActive }))
          }
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
};

export default StudentsTab;
