import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { useGetAdminDashboard } from '@/src/hooks/useDashboard';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useImportStudents } from '@/src/hooks/useEnrollment';
import * as DocumentPicker from 'expo-document-picker';
import { formatMoney } from '@/src/libs/money';
import { StatCard } from '@/components/profile-page/StatCard';
import { DAY_CHIP_COLOR } from '@/constants/dayTypeColor';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import {
  MetricCardSkeleton,
  SkeletonList,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const Metric = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-2">
    <Text className="text-xs font-semibold text-gray-400 tracking-wide">
      {label.toUpperCase()}
    </Text>
    <Text className="text-2xl font-bold text-gray-900 mt-1">{value}</Text>
    {sub ? <Text className="text-xs text-gray-400 mt-0.5">{sub}</Text> : null}
  </View>
);

const School = () => {
  const tabBarClearance = useTabBarClearance();
  const { user } = useAuth();
  const { data: dashboard, isLoading, isError, refetch } = useGetAdminDashboard();
  const { data: sections, isLoading: sectionsLoading } = useGetAllSections();
  const { mutate: importStudents, isPending: importing } = useImportStudents();
  const [pickedSectionId, setPickedSectionId] = useState('');

  // The import is scoped to one section, so a section has to be picked before a
  // file can be chosen. Derived rather than stored+synced with an effect.
  const pickedSection = useMemo(
    () => (sections ?? []).find((s) => s.id === pickedSectionId) ?? null,
    [sections, pickedSectionId],
  );

  const school = user?.school ?? null;
  // Derived once so the render below never needs a `!` assertion.
  const events = useMemo(() => dashboard?.upcomingEvents ?? [], [dashboard]);

  const byClass = useMemo(() => {
    const groups = new Map<string, number>();
    (sections ?? []).forEach((s) => {
      groups.set(s.className, (groups.get(s.className) ?? 0) + 1);
    });
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [sections]);

  const handlePickCsv = async () => {
    if (!pickedSection) return;

    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const asset = picked.assets?.[0];
    if (!asset) return;

    importStudents(
      {
        sectionId: pickedSection.id,
        // Derived from the selected section rather than asked for again: the
        // server checks it against the section's academic year, so passing
        // anything the admin typed could only ever disagree.
        year: pickedSection.academicYearStart,
        file: {
          uri: asset.uri,
          name: asset.name ?? 'students.csv',
          type: asset.mimeType ?? 'text/csv',
        },
      },
      {
        onSuccess: (result) => {
          setPickedSectionId('');
          const skippedNote =
            result.skipped.length > 0
              ? `\n\n${result.skipped.length} row(s) were skipped:\n${result.skipped
                  .slice(0, 5)
                  .map((s) => `line ${s.line} (${s.name}): ${s.reason}`)
                  .join('\n')}`
              : '';

          const mailNote =
            result.emailFailed > 0
              ? `\n\n${result.emailFailed} email(s) failed to send. Those accounts exist but the student has not been told their login ID — send it to them manually.`
              : '';

          Alert.alert(
            'Import complete',
            `${result.created.length} student(s) created and emailed.${skippedNote}${mailNote}`,
          );
        },
        onError: (err: any) => {
          Alert.alert('Import failed', err?.response?.data?.message ?? String(err));
        },
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-1">
          School
        </Text>
        <Text className="text-sm text-gray-500 px-4 mb-3">
          {school?.name ?? 'Your school'}
        </Text>

        <View className="flex-row mx-3 mb-3">
          <StatCard label="Students" value={school?.noOfStudents ?? 0} />
          <StatCard label="Teachers" value={school?.noOfTeacher ?? 0} />
        </View>
        {school?.noOfBoys != null || school?.noOfGirls != null ? (
          <View className="flex-row mx-3 mb-4">
            <StatCard label="Boys" value={school?.noOfBoys ?? 0} />
            <StatCard label="Girls" value={school?.noOfGirls ?? 0} />
          </View>
        ) : null}

        {isLoading ? (
          <>
            <View style={{ marginTop: 20 }}>
              <MetricCardSkeleton count={3} />
            </View>
            <View style={{ marginTop: 8 }}>
              <SkeletonList count={2} />
            </View>
          </>
        ) : isError ? (
          <ErrorState
            title="Couldn't load school data"
            subtitle="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <View className="px-4">
              <Metric
                label="Attendance today"
                value={`${dashboard?.attendanceToday.percentage ?? 0}%`}
                sub={`${dashboard?.attendanceToday.marked ?? 0} of ${
                  dashboard?.attendanceToday.totalStudents ?? 0
                } students marked`}
              />
              <Metric
                label="Outstanding fees"
                value={formatMoney(dashboard?.fees.amountPending ?? 0)}
                sub={`${dashboard?.fees.pendingInvoices ?? 0} unpaid invoice${
                  (dashboard?.fees.pendingInvoices ?? 0) === 1 ? '' : 's'
                }`}
              />
              <Metric
                label="Teachers"
                value={String(dashboard?.totalTeachers ?? 0)}
                sub="active teacher accounts"
              />
            </View>

            <View className="px-4 mt-5 mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">
                Sections
              </Text>
              <Text className="text-xs font-semibold text-gray-500">
                {sectionsLoading ? '--' : sections?.length ?? 0}
              </Text>
            </View>

            {sectionsLoading ? (
              <View className="mx-4">
                <SkeletonList count={3} lastWidth="40%" />
              </View>
            ) : !sections || sections.length === 0 ? (
              <View className="mx-4">
                <EmptyState
                  icon="grid"
                  title="No sections created yet"
                  subtitle="Sections appear once the school creates them."
                />
              </View>
            ) : (
              <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {byClass.map(([className, count]) => (
                  <View
                    key={className}
                    className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <Text className="text-[15px] font-medium text-gray-900">
                      Class {className}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {count} section{count > 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="px-4 mt-5 mb-2">
              <Text className="text-base font-semibold text-gray-900">
                Adding students
              </Text>
            </View>

            <View className="mx-4 bg-white rounded-2xl border border-gray-100 p-4">
              <Text className="text-sm text-gray-600">
                Students are added by uploading a CSV into one session. Create
                the session first, then pick it below.
              </Text>

              <View className="mt-3 rounded-xl border border-dashed border-gray-300 p-4">
                <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-1">
                  CSV COLUMNS
                </Text>
                <Text className="text-xs text-gray-600">
                  name,email,stream,combination,language
                </Text>
                <Text className="text-xs text-gray-400 leading-5 mt-2">
                  Every new student gets the password nnpu123 and an email with
                  their login ID, asking them to change it.
                </Text>
              </View>

              {sectionsLoading || !sections || sections.length === 0 ? null : (
                <View className="mt-4">
                  <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-2">
                    SESSION
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {sections.map((section) => {
                      const active = section.id === pickedSectionId;
                      return (
                        <Pressable
                          key={section.id}
                          onPress={() => setPickedSectionId(section.id)}
                          className="px-3 py-2 rounded-full border"
                          style={{
                            backgroundColor: active ? '#4F46E5' : '#FFFFFF',
                            borderColor: active ? '#4F46E5' : '#E5E7EB',
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: active ? '#FFFFFF' : '#374151' }}
                          >
                            {section.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {pickedSection ? (
                <Text className="text-xs text-gray-500 mt-4">
                  Uploading into{' '}
                  <Text className="font-semibold text-gray-900">
                    {pickedSection.name}
                  </Text>
                  .
                </Text>
              ) : null}

              <Pressable
                onPress={handlePickCsv}
                disabled={!pickedSection || importing}
                className={`mt-4 rounded-xl py-3 items-center ${
                  !pickedSection || importing ? 'opacity-40' : ''
                }`}
                style={{ backgroundColor: '#4F46E5' }}
              >
                {importing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {pickedSection
                      ? 'Choose CSV and upload'
                      : 'Pick a session first'}
                  </Text>
                )}
              </Pressable>
            </View>

            {events.length > 0 && (
              <>
                <View className="px-4 mt-5 mb-2">
                  <Text className="text-base font-semibold text-gray-900">
                    Upcoming Events
                  </Text>
                </View>
                <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {events.map((event, idx) => (
                    <View
                      key={`${event.date.toISOString()}-${idx}`}
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        idx !== events.length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <Text className="text-[15px] font-medium text-gray-900 flex-1 mr-2">
                        {event.label ?? event.type}
                      </Text>
                      <Text className="text-xs text-gray-400 mr-3">
                        {event.date.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: DAY_CHIP_COLOR[event.type] + '1A',
                        }}
                      >
                        <Text
                          className="text-[11px] font-semibold"
                          style={{ color: DAY_CHIP_COLOR[event.type] }}
                        >
                          {event.type}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default School;
