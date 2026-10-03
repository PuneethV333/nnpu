import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetMyMarks, useGetPendingAssessments } from '@/src/hooks/useMarks';
import { AssessmentCategory } from '@/src/types/marks';
import PerformanceChart from '@/components/mark-page/PerformanceChart';
import AssessmentGroup from '@/components/mark-page/AssessmentGroup';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import {
  SkeletonCard,
  Skeleton,
  SkeletonCircle,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const VISIBLE_CATEGORIES: AssessmentCategory[] = [
  'UnitTest',
  'MidTerm',
  'FinalTheory',
  'FinalPractical',
];

const MarksPage = () => {
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const { data: marks, isLoading, isError, refetch, isRefetching } = useGetMyMarks();
  const { data: pending } = useGetPendingAssessments();

  const { overall, gradedCount } = useMemo(() => {
    const list = marks ?? [];
    const obtained = list.reduce((sum, m) => sum + m.marksObtained, 0);
    const max = list.reduce((sum, m) => sum + m.assessment.maxMarks, 0);
    return {
      overall: max > 0 ? Math.round((obtained / max) * 100) : 0,
      gradedCount: list.length,
    };
  }, [marks]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Marks</Text>
        <Pressable
          onPress={() => router.push('/notification')}
          hitSlop={10}
          accessibilityLabel="Notifications"
        >
          <Feather name="bell" size={22} color="#111827" />
        </Pressable>
      </View>

      {isLoading ? (
        <MarksSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your marks"
          subtitle="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563EB"
            />
          }
          contentContainerStyle={{ paddingBottom: tabBarClearance }}
        >
          {gradedCount > 0 && (
            <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 p-4 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                  OVERALL
                </Text>
                <Text className="text-2xl font-bold text-gray-900 mt-1">
                  {overall}%
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  Across {gradedCount} assessment
                  {gradedCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Feather name="trending-up" size={30} color="#2563EB" />
            </View>
          )}

          <PerformanceChart marks={marks ?? []} />

          {gradedCount === 0 && (
            <EmptyState
              icon="bar-chart-2"
              title="No marks published yet"
              subtitle="Results appear here once your teachers publish them."
            />
          )}

          {VISIBLE_CATEGORIES.map((category) => (
            <AssessmentGroup
              key={category}
              category={category}
              marks={(marks ?? []).filter(
                (m) => m.assessment.category === category,
              )}
              pendingSubjects={(pending ?? [])
                .filter((p) => p.category === category)
                .map((p) => p.subjectName)}
            />
          ))}
        </ScrollView>
      )}

    </SafeAreaView>
  );
};

/** Mirrors the overall card + chart + category groups on this screen. */
const MarksSkeleton = () => (
  <View style={{ paddingTop: 4 }}>
    <SkeletonCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 8, flex: 1 }}>
          <Skeleton width={70} height={10} radius="sm" />
          <Skeleton width={110} height={26} radius="sm" />
          <Skeleton width={130} height={9} radius="sm" />
        </View>
        <SkeletonCircle size={30} />
      </View>
    </SkeletonCard>

    <SkeletonCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <Skeleton width="55%" height={14} radius="sm" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: 100,
          marginTop: 16,
        }}
      >
        {[70, 45, 90, 60, 80].map((h, i) => (
          <Skeleton
            key={i}
            width={14}
            height={h}
            radius={4}
            phase={i}
            style={{ marginHorizontal: 6 }}
          />
        ))}
      </View>
    </SkeletonCard>

    {[0, 1, 2].map((i) => (
      <SkeletonCard
        key={i}
        style={{ marginHorizontal: 16, marginBottom: 16 }}
        gap={0}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 12,
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <Skeleton width={120} height={13} radius="sm" phase={i} />
          <Skeleton width={90} height={20} radius="full" phase={i} />
        </View>
        {[0, 1].map((k) => (
          <View key={k} style={{ paddingVertical: 12, gap: 8 }}>
            <Skeleton width="55%" height={13} radius="sm" phase={i + k} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Skeleton width={70} height={16} radius="sm" phase={i + k} />
            </View>
          </View>
        ))}
      </SkeletonCard>
    ))}
  </View>
);

export default MarksPage;
