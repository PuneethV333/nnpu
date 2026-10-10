import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetAdminDashboard } from '@/src/hooks/useDashboard';
import { useGetAllSections } from '@/src/hooks/useSections';
import { formatMoney } from '@/src/libs/money';
import { DAY_CHIP_COLOR } from '@/constants/dayTypeColor';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { MetricCardSkeleton, SkeletonList } from '@/components/ui/skeletons';
import { Card, SectionTitle } from '@/components/ui/Primitives';

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

const OverviewTab = () => {
  const router = useRouter();
  const { data: dashboard, isLoading, isError, refetch } = useGetAdminDashboard();
  const { data: sections, isLoading: sectionsLoading } = useGetAllSections();

  const events = useMemo(() => dashboard?.upcomingEvents ?? [], [dashboard]);

  const byClass = useMemo(() => {
    const groups = new Map<string, number>();
    (sections ?? []).forEach((s) => {
      groups.set(s.className, (groups.get(s.className) ?? 0) + 1);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sections]);

  if (isLoading) {
    return (
      <>
        <View style={{ marginTop: 20 }}>
          <MetricCardSkeleton count={3} />
        </View>
        <View style={{ marginTop: 8 }}>
          <SkeletonList count={2} />
        </View>
      </>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load school data"
        subtitle="Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const pending = dashboard?.fees.pendingInvoices ?? 0;

  return (
    <>
      <View className="px-4 mt-2">
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
          sub={`${pending} unpaid invoice${pending === 1 ? '' : 's'}`}
        />
        <Metric
          label="Teachers"
          value={String(dashboard?.totalTeachers ?? 0)}
          sub="active teacher accounts"
        />
      </View>

      <SectionTitle
        title="Sections"
        right={
          <Text className="text-xs font-semibold text-gray-500">
            {sectionsLoading ? '--' : sections?.length ?? 0}
          </Text>
        }
      />

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
        <Card className="overflow-hidden">
          {byClass.map(([className, count], idx) => (
            <View
              key={className}
              className={`flex-row items-center justify-between px-4 py-3 ${
                idx !== byClass.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <Text className="text-[15px] font-medium text-gray-900">Class {className}</Text>
              <Text className="text-sm text-gray-500">
                {count} section{count > 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle title="Shortcuts" />
      <Card className="overflow-hidden">
        <Pressable
          onPress={() => router.push('/announcements')}
          className="flex-row items-center px-4 py-4"
          style={({ pressed }) => ({ backgroundColor: pressed ? '#F9FAFB' : 'transparent' })}
        >
          <Feather name="volume-2" size={18} color="#374151" />
          <Text className="ml-3 text-[15px] font-medium text-gray-800 flex-1">
            Post or manage announcements
          </Text>
          <Feather name="chevron-right" size={18} color="#9CA3AF" />
        </Pressable>
      </Card>

      {events.length > 0 && (
        <>
          <SectionTitle title="Upcoming Events" />
          <Card className="overflow-hidden">
            {events.map((event, idx) => (
              <View
                key={`${event.date.toISOString()}-${idx}`}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  idx !== events.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <Text className="text-[15px] font-medium text-gray-900 flex-1 mr-2">
                  {event.label ?? event.type}
                </Text>
                <Text className="text-xs text-gray-400 mr-3">
                  {event.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: DAY_CHIP_COLOR[event.type] + '1A' }}
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
          </Card>
        </>
      )}
    </>
  );
};

export default OverviewTab;
