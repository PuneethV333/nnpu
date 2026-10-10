import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetAllSections, useGetSectionAssignments } from '@/src/hooks/useSections';
import { useGetStudents } from '@/src/hooks/useStudents';
import { useGetMySubjects } from '@/src/hooks/useMarks';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import {
  SectionTileSkeleton,
  SkeletonList,
  ChipRowSkeleton,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const Classes = () => {
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const { data: sections, isLoading, isError, refetch } = useGetAllSections();
  const [sectionId, setSectionId] = useState('');

  const { data: students, isLoading: studentsLoading } = useGetStudents(sectionId);
  const { data: subjects, isLoading: subjectsLoading } = useGetMySubjects(sectionId);
  const { data: staffing } = useGetSectionAssignments(sectionId);

  const selected = sections?.find((s) => s.id === sectionId) ?? null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">
          Classes
        </Text>

        {isLoading ? (
          <View style={{ marginTop: 8 }}>
            <SectionTileSkeleton count={5} />
          </View>
        ) : isError ? (
          <ErrorState
            title="Couldn't load sections"
            subtitle="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : !sections || sections.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No sections yet"
            subtitle="Sections appear once the school creates them."
          />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {sections.map((section) => {
                const active = section.id === sectionId;
                return (
                  <Pressable
                    key={section.id}
                    onPress={() =>
                      setSectionId(active ? '' : section.id)
                    }
                    className="rounded-2xl border px-4 py-3 min-w-[124px]"
                    style={{
                      backgroundColor: active ? '#2563EB' : '#FFFFFF',
                      borderColor: active ? '#2563EB' : '#E5E7EB',
                    }}
                  >
                    <Text
                      className="text-base font-bold"
                      style={{ color: active ? '#FFFFFF' : '#111827' }}
                    >
                      {section.className}-{section.name}
                      {section.isClassTeacher ? ' ★' : ''}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: active ? '#DBEAFE' : '#6B7280' }}
                    >
                      {section.session}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!selected ? (
              <EmptyState
                icon="grid"
                title="Pick a class"
                subtitle="Choose a class to see its students and subjects."
              />
            ) : (
              <>
                <View className="mx-4 mt-5 bg-white rounded-2xl border border-gray-100 p-4">
                  <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                    ACADEMIC YEAR
                  </Text>
                  <Text className="text-base font-bold text-gray-900 mt-1">
                    {selected.academicYearLabel}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <Feather
                      name={selected.isClassTeacher ? 'star' : 'user'}
                      size={13}
                      color={selected.isClassTeacher ? '#D97706' : '#6B7280'}
                    />
                    <Text className="text-xs text-gray-500">
                      {selected.isClassTeacher
                        ? 'You are the class teacher'
                        : 'Teaching section'}
                    </Text>
                  </View>
                </View>

                {staffing ? (
                  <View className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4">
                    <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                      CLASS TEACHER
                    </Text>
                    <Text className="text-base font-bold text-gray-900 mt-1">
                      {staffing.classTeacher?.name ?? 'Not assigned'}
                    </Text>
                    {staffing.subjects.length > 0 ? (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-2">
                          WHO TEACHES WHAT
                        </Text>
                        {staffing.subjects.map((s) => (
                          <View
                            key={s.subjectId}
                            className="flex-row items-center justify-between py-1"
                          >
                            <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>
                              {s.subjectName}
                            </Text>
                            <Text
                              className="text-sm"
                              style={{ color: s.teacherName ? '#6B7280' : '#D97706' }}
                            >
                              {s.teacherName ?? 'Unstaffed'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View className="px-4 mt-5 mb-2 flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-gray-900">
                    My Subjects
                  </Text>
                </View>

                {subjectsLoading ? (
                  <View style={{ marginTop: 8 }}>
                    <ChipRowSkeleton count={3} />
                  </View>
                ) : !subjects || subjects.length === 0 ? (
                  <View className="mx-4 bg-white rounded-2xl border border-gray-100 items-center py-6">
                    <Text className="text-sm text-gray-400">
                      No subjects assigned here yet.
                    </Text>
                  </View>
                ) : (
                  <View className="mx-4 flex-row flex-wrap" style={{ gap: 8 }}>
                    {subjects.map((s) => (
                      <View
                        key={s.id}
                        className="bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
                      >
                        <Text className="text-sm font-medium text-blue-700">
                          {s.name}
                        </Text>
                        {s.hasPractical ? (
                          <Feather name="award" size={12} color="#2563EB" />
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                <View className="px-4 mt-5 mb-2 flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-gray-900">
                    Students
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500">
                    {students?.length ?? 0}
                  </Text>
                </View>

                {studentsLoading ? (
                  <View className="mt-2">
                    <SkeletonList count={6} lastWidth="55%" />
                  </View>
                ) : !students || students.length === 0 ? (
                  <View className="mx-4 bg-white rounded-2xl border border-gray-100 items-center py-8">
                    <Feather name="user-x" size={22} color="#D1D5DB" />
                    <Text className="text-sm text-gray-400 mt-2">
                      No students enrolled in this section.
                    </Text>
                  </View>
                ) : (
                  <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {students.map((s, idx) => (
                      <View
                        key={s.id}
                        className={`flex-row items-center px-4 py-3 ${
                          idx !== students.length - 1
                            ? 'border-b border-gray-100'
                            : ''
                        }`}
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
                      </View>
                    ))}
                  </View>
                )}

                <View className="px-4 mt-4 flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/attendance',
                        params: { sectionId: selected.id },
                      })
                    }
                    className="flex-1 bg-blue-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
                  >
                    <Feather name="check-square" size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-sm">
                      Mark Attendance
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/marks')}
                    className="flex-1 bg-green-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
                  >
                    <Feather name="edit-3" size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-sm">
                      Enter Marks
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Classes;
