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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import { useGetAdminDashboard } from '@/src/hooks/useDashboard';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useListDrives, useListSubmissions, usePromoteAll } from '@/src/hooks/useEnrollment';
import { formatDate, formatMoney } from '@/src/libs/money';
import { StatCard } from '@/components/profile-page/StatCard';
import { DAY_CHIP_COLOR } from '@/constants/dayTypeColor';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import {
  MetricCardSkeleton,
  SkeletonList,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const DRIVE_TONE: Record<string, { bg: string; text: string }> = {
  Open: { bg: '#DCFCE7', text: '#16A34A' },
  Closed: { bg: '#FEF3C7', text: '#D97706' },
  Processed: { bg: '#F3F4F6', text: '#6B7280' },
};

const SUBMISSION_TONE: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#FEF3C7', text: '#D97706' },
  Promoted: { bg: '#DCFCE7', text: '#16A34A' },
  Rejected: { bg: '#FEE2E2', text: '#DC2626' },
};

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
  const { data: drives, isLoading: drivesLoading } = useListDrives();
  const { mutate: promoteAll, isPending: promoting } = usePromoteAll();
  const [pickedDriveId, setPickedDriveId] = useState('');

  // Submissions are per-drive, so a drive has to be chosen. Derived rather
  // than stored+synced with an effect: an explicit pick wins, otherwise fall
  // back to the first open drive, then the first drive of any status.
  const activeDrive = useMemo(() => {
    if (!drives || drives.length === 0) return null;
    return (
      drives.find((d) => d.id === pickedDriveId) ??
      drives.find((d) => d.status === 'Open') ??
      drives[0]
    );
  }, [drives, pickedDriveId]);

  const { data: submissions, isLoading: submissionsLoading } =
    useListSubmissions(activeDrive?.id ?? '');

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

  const pendingCount = useMemo(
    () => (submissions ?? []).filter((s) => s.status === 'Pending').length,
    [submissions],
  );

  const handlePromoteAll = () => {
    if (!activeDrive) return;
    Alert.alert(
      'Promote all submissions',
      `Every pending submission in the ${activeDrive.stream} drive will be promoted to real student accounts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote all',
          style: 'destructive',
          onPress: () => promoteAll(activeDrive.id),
        },
      ],
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
        <View className="flex-row mx-3 mb-4">
          <StatCard label="Boys" value={school?.noOfBoys ?? 0} />
          <StatCard label="Girls" value={school?.noOfGirls ?? 0} />
        </View>

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
                label="Pending enrollments"
                value={String(dashboard?.pendingEnrollments ?? 0)}
                sub={`${dashboard?.openDrives ?? 0} open drive${
                  (dashboard?.openDrives ?? 0) === 1 ? '' : 's'
                }`}
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
                Enrollment
              </Text>
            </View>

            {drivesLoading ? (
              <View className="mx-4 mt-2">
                <SkeletonList count={2} />
              </View>
            ) : !drives || drives.length === 0 ? (
              <View className="mx-4">
                <EmptyState
                  icon="clipboard"
                  title="No enrollment drives yet"
                  subtitle="Create a drive to start collecting applications."
                />
              </View>
            ) : (
              <>
                <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {drives.map((drive, idx) => {
                    const tone = DRIVE_TONE[drive.status] ?? DRIVE_TONE.Closed;
                    return (
                      <View
                        key={drive.id}
                        className={`px-4 py-3 ${
                          idx !== drives.length - 1
                            ? 'border-b border-gray-100'
                            : ''
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[15px] font-medium text-gray-900">
                            {drive.stream} drive
                          </Text>
                          <View
                            className="rounded-full px-2 py-0.5"
                            style={{ backgroundColor: tone.bg }}
                          >
                            <Text
                              className="text-[11px] font-bold"
                              style={{ color: tone.text }}
                            >
                              {drive.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-gray-400 mt-1">
                          Closes {formatDate(drive.closesAt)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
                >
                  {(drives ?? []).map((d) => {
                    const active = d.id === activeDrive?.id;
                    const tone = DRIVE_TONE[d.status] ?? DRIVE_TONE.Closed;
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => setPickedDriveId(d.id)}
                        className="px-3 py-2 rounded-full border"
                        style={{
                          backgroundColor: active ? tone.text : '#FFFFFF',
                          borderColor: active ? tone.text : '#E5E7EB',
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: active ? '#FFFFFF' : '#374151' }}
                        >
                          {d.stream} · {d.status}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {activeDrive ? (
                  <View className="mx-4 mt-1 bg-white rounded-2xl border border-gray-100 p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                        {activeDrive.stream.toUpperCase()} SUBMISSIONS
                      </Text>
                      <Text className="text-lg font-bold text-gray-900">
                        {submissionsLoading ? '--' : (submissions?.length ?? 0)}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 mt-1">
                      {pendingCount} pending promotion
                    </Text>

                    <Pressable
                      onPress={handlePromoteAll}
                      disabled={promoting}
                      className={`mt-3 bg-indigo-600 rounded-xl py-3 items-center flex-row justify-center gap-2 ${
                        promoting ? 'opacity-40' : ''
                      }`}
                    >
                      {promoting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="check-circle" size={16} color="#FFFFFF" />
                          <Text className="text-white font-bold text-sm">
                            Promote all pending
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <View className="mt-4 pt-3 border-t border-gray-100">
                      {submissionsLoading ? (
                        <SkeletonList count={3} lastWidth="60%" />
                      ) : !submissions || submissions.length === 0 ? (
                        <Text className="text-sm text-gray-400 text-center py-4">
                          No submissions in this drive yet.
                        </Text>
                      ) : (
                        submissions.map((sub) => (
                          <View
                            key={sub.id}
                            className="flex-row items-center justify-between py-2 border-b border-gray-50 last:border-b-0"
                          >
                            <View className="flex-1 mr-2">
                              <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                                {sub.name}
                              </Text>
                              <Text className="text-[11px] text-gray-400" numberOfLines={1}>
                                {sub.stream} · {sub.session}
                                {sub.language ? ` · ${sub.language}` : ''}
                              </Text>
                            </View>
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{ backgroundColor: SUBMISSION_TONE[sub.status].bg }}
                            >
                              <Text
                                className="text-[10px] font-bold"
                                style={{ color: SUBMISSION_TONE[sub.status].text }}
                              >
                                {sub.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                ) : null}
              </>
            )}

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
