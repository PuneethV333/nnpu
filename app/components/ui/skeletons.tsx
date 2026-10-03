import React from 'react';
import { View, ScrollView } from 'react-native';
import { styles } from '@/src/style/Teacher';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonCircle,
  SkeletonList,
  SkeletonStatRow,
  RADIUS,
} from './Skeleton';

/**
 * Page-shaped skeletons.
 *
 * Each of these mirrors the real layout of the screen it stands in for, so the
 * swap from skeleton -> content causes no visible reflow.
 */

export const DayChipSkeleton = () => (
  <View style={styles.dayChip}>
    <Skeleton width={92} height={12} radius="full" />
  </View>
);

/** Matches `components/home/TimeTable.tsx`'s non-break card. */
export const TimetableSkeleton = ({ count = 4 }: { count?: number }) => (
  <View style={{ gap: 8 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          padding: 16,
        }}
      >
        <View style={{ width: 64 }}>
          <Skeleton width={44} height={10} radius="sm" phase={i} />
          <Skeleton width={44} height={10} radius="sm" phase={i} />
        </View>
        <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
          <Skeleton width="60%" height={13} radius="sm" phase={i} />
          <Skeleton width="35%" height={10} radius="sm" phase={i} />
        </View>
      </View>
    ))}
  </View>
);

/** Matches `components/home/SectionStatusCard.tsx`. */
export const SectionStatusSkeleton = ({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 10 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <Skeleton width={110} height={14} radius="sm" phase={i} />
        <Skeleton width={72} height={22} radius="full" phase={i} />
      </View>
    ))}
  </View>
);

/** Matches `components/home/Announcements.tsx` (fixed-width horizontal card). */
export const AnnouncementSkeleton = ({ width = 260 }: { width?: number }) => (
  <View
    style={{
      width,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      padding: 14,
      gap: 10,
    }}
  >
    <Skeleton width={72} height={18} radius="full" />
    <SkeletonText lines={2} height={13} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SkeletonCircle size={20} />
      <Skeleton width={70} height={10} radius="sm" />
    </View>
  </View>
);

export const AnnouncementsRowSkeleton = ({ count = 2 }: { count?: number }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.announcementsRow}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.announcementItem}>
        <AnnouncementSkeleton />
      </View>
    ))}
  </ScrollView>
);

/** Matches `components/attendance-page/ProgressCard.tsx`. */
export const ProgressCardSkeleton = ({ count = 1 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <Skeleton width="45%" height={10} radius="sm" />
        <Skeleton width="35%" height={32} radius="sm" />
        <Skeleton height={8} radius="full" />
      </SkeletonCard>
    ))}
  </>
);

/** Matches `components/attendance-page/MonthlyAttendanceGrid.tsx`. */
export const CalendarGridSkeleton = () => (
  <SkeletonCard style={{ marginHorizontal: 16 }}>
    <Skeleton width="55%" height={14} radius="sm" />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} width={16} height={10} radius="sm" phase={i} />
      ))}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
      {Array.from({ length: 28 }).map((_, i) => (
        <Skeleton
          key={i}
          width={36}
          height={36}
          radius="full"
          phase={i % 7}
          style={{ margin: 2 }}
        />
      ))}
    </View>
  </SkeletonCard>
);

/** Matches `components/fees-page/InvoiceCard.tsx`. */
export const InvoiceCardSkeleton = ({ count = 2 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard
        key={i}
        style={{ marginHorizontal: 16, marginBottom: 16 }}
        gap={0}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ flex: 1, marginRight: 12, gap: 6 }}>
            <Skeleton width="60%" height={14} radius="sm" phase={i} />
            <Skeleton width="40%" height={10} radius="sm" phase={i} />
          </View>
          <Skeleton width={70} height={22} radius="full" phase={i} />
        </View>
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 }}>
          <SkeletonRow labelWidth={90} valueWidth={70} phase={i} />
          <SkeletonRow labelWidth={80} valueWidth={70} phase={i} />
        </View>
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 }}>
          <SkeletonRow labelWidth={60} valueWidth={80} phase={i} />
          <SkeletonRow labelWidth={60} valueWidth={80} phase={i} />
        </View>
        <Skeleton
          height={44}
          radius={RADIUS.lg}
          phase={i}
          style={{ marginTop: 16, backgroundColor: '#DBEAFE' }}
        />
      </SkeletonCard>
    ))}
  </>
);

const SkeletonRow = ({
  labelWidth,
  valueWidth,
  phase = 0,
}: {
  labelWidth: number;
  valueWidth: number;
  phase?: number;
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Skeleton width={labelWidth} height={11} radius="sm" phase={phase} />
    <Skeleton width={valueWidth} height={11} radius="sm" phase={phase} />
  </View>
);

/** Matches the notification rows in `app/(tabs)/notification.tsx`. */
export const NotificationListSkeleton = ({ count = 8 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <SkeletonCircle size={36} phase={i} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="55%" height={13} radius="sm" phase={i} />
          <Skeleton width="85%" height={11} radius="sm" phase={i} />
          <Skeleton width="25%" height={9} radius="sm" phase={i} />
        </View>
      </View>
    ))}
  </View>
);

/** Matches `components/attendance-page/StudentRow.tsx` (P/A/L picker). */
export const RosterRowsSkeleton = ({ count = 8 }: { count?: number }) => (
  <View
    style={{
      marginHorizontal: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      overflow: 'hidden',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: i === 0 ? 0 : 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <Skeleton width={130} height={13} radius="sm" phase={i} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={36} height={36} radius="full" phase={i} />
          <Skeleton width={36} height={36} radius="full" phase={i} />
          <Skeleton width={36} height={36} radius="full" phase={i} />
        </View>
      </View>
    ))}
  </View>
);

/** Matches the mark-entry rows in `components/mark-page/main/MarkEntry.tsx`. */
export const MarkEntryRowsSkeleton = ({ count = 6 }: { count?: number }) => (
  <View
    style={{
      marginHorizontal: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      overflow: 'hidden',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: i === 0 ? 0 : 1,
          borderTopColor: '#F3F4F6',
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton width={120} height={13} radius="sm" phase={i} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Skeleton width={64} height={32} radius="md" phase={i} />
            <Skeleton width={28} height={11} radius="sm" phase={i} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, k) => (
            <Skeleton
              key={k}
              width={34}
              height={20}
              radius="full"
              phase={k}
            />
          ))}
        </View>
      </View>
    ))}
  </View>
);

/** The horizontally-scrollable section/subject chips. */
export const ChipRowSkeleton = ({ count = 4 }: { count?: number }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: RADIUS.full,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Skeleton width={64} height={12} radius="sm" phase={i} />
      </View>
    ))}
  </ScrollView>
);

/** The larger section tiles in `app/(tabs)/classes.tsx`. */
export const SectionTileSkeleton = ({ count = 4 }: { count?: number }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          minWidth: 124,
          gap: 8,
        }}
      >
        <Skeleton width={64} height={16} radius="sm" phase={i} />
        <Skeleton width={48} height={10} radius="sm" phase={i} />
      </View>
    ))}
  </ScrollView>
);

/** Matches the metric cards on the Admin home / school / fees screens. */
export const MetricCardSkeleton = ({ count = 1 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 8 }} gap={0}>
        <Skeleton width="45%" height={10} radius="sm" phase={i} />
        <Skeleton width="55%" height={26} radius="sm" phase={i} />
        <Skeleton width="70%" height={10} radius="sm" phase={i} />
      </SkeletonCard>
    ))}
  </>
);

/** A section-title placeholder, matching `styles.sectionTitle`. */
export const SectionTitleSkeleton = ({
  width = '35%',
}: {
  width?: `${number}%`;
}) => (
  <Skeleton width={width} height={13} radius="sm" style={{ marginBottom: 12 }} />
);

// Re-exported so screens can pull every skeleton from one module.
export { SkeletonList, SkeletonStatRow, Skeleton, SkeletonCard, SkeletonCircle, SkeletonText, RADIUS };
