import React from 'react';
import { View, ScrollView, type ViewStyle } from 'react-native';
import { styles } from '@/src/style/Teacher';
import { styles as attendanceStyles } from '@/src/style/markAttendance';
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

/** Matches `components/home/HomeHeader.tsx` (avatar + greeting/name + bell). */
export const HomeHeaderSkeleton = () => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      <SkeletonCircle size={48} />
      <View style={{ marginLeft: 12, gap: 6 }}>
        <Skeleton width={72} height={11} radius="sm" />
        <Skeleton width={128} height={15} radius="sm" />
      </View>
    </View>
    <SkeletonCircle size={40} />
  </View>
);

/** Matches the "My Class" card in `components/home/main/Student.tsx`. */
export const MyClassCardSkeleton = () => (
  <SkeletonCard style={{ marginHorizontal: 20, marginTop: 16 }} gap={0}>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={64} height={11} radius="sm" />
        <Skeleton width={140} height={18} radius="sm" />
        <Skeleton width={168} height={10} radius="sm" />
      </View>
      <Skeleton width={20} height={20} radius="sm" />
    </View>
  </SkeletonCard>
);

/** Matches `components/home/QuickActions.tsx`. */
export const QuickActionsSkeleton = ({
  count = 2,
  wrap = false,
}: {
  count?: number;
  wrap?: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      gap: 12,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flex: 1,
          flexBasis: wrap ? '46%' : undefined,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#F3F4F6',
        }}
      >
        <Skeleton width={36} height={36} radius="md" phase={i} />
        <Skeleton
          width="70%"
          height={13}
          radius="sm"
          phase={i}
          style={{ marginTop: 10 }}
        />
      </View>
    ))}
  </View>
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
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        columnGap: 6,
        marginTop: 12,
      }}
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={{ width: 36, alignItems: 'center' }}>
          <Skeleton width={16} height={10} radius="sm" phase={i} />
        </View>
      ))}
    </View>
    {Array.from({ length: 4 }).map((_, row) => (
      <View
        key={row}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          columnGap: 6,
          marginTop: 6,
        }}
      >
        {Array.from({ length: 7 }).map((_, col) => (
          <Skeleton
            key={col}
            width={36}
            height={36}
            radius="full"
            phase={col}
          />
        ))}
      </View>
    ))}
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
export const RosterRowsSkeleton = ({
  count = 8,
  style,
}: {
  count?: number;
  /** Replaces the default card shell, so a caller can match its own container. */
  style?: ViewStyle;
}) => (
  <View
    style={
      style ?? {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
      }
    }
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

/**
 * Matches a student row in `components/school-page/StudentsTab.tsx`: the 32px
 * avatar circle, the name, and the three-dot affordance, in the same white
 * card shell the real list uses. The generic `SkeletonList` it replaces drew
 * text bars with no avatar, so the section-selected state reflowed when the
 * rows landed.
 */
export const StudentListSkeleton = ({ count = 6 }: { count?: number }) => (
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
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: i === 0 ? 0 : 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <Skeleton width={32} height={32} radius="full" phase={i} />
        <Skeleton
          width={140}
          height={13}
          radius="sm"
          phase={i}
          style={{ marginLeft: 12 }}
        />
        <View style={{ flex: 1 }} />
        <Skeleton width={18} height={18} radius="sm" phase={i} />
      </View>
    ))}
  </View>
);

/**
 * Matches `components/attendance-page/RosterEditor.tsx` in full: the status
 * banner, the "All P/A/L" row, the roster card and the save button.
 *
 * The pieces around the roster matter as much as the rows do. The teacher
 * attendance screen used to swap this entire block for one small spinner, so
 * every section and day change collapsed the page and then pushed it back down
 * when the data landed. Layout values come from the real stylesheet where they
 * are pure geometry, so the two cannot drift apart.
 */
export const RosterEditorSkeleton = ({ count = 8 }: { count?: number }) => (
  <>
    <Skeleton
      height={44}
      radius={12}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    />

    <View style={attendanceStyles.markAllRow}>
      <View style={{ flexDirection: 'row' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            width={74}
            height={29}
            radius="full"
            phase={i}
            style={{ marginRight: 8 }}
          />
        ))}
      </View>
      <Skeleton width={30} height={12} radius="sm" phase={1} />
    </View>

    <RosterRowsSkeleton count={count} style={attendanceStyles.rosterCard} />

    <View style={{ padding: 16 }}>
      <Skeleton height={47} radius={12} />
    </View>
  </>
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

/**
 * Matches `components/school-page/StaffingTab.tsx`: the class-teacher card, then
 * the subject-teacher list. The generic `SkeletonList` it replaces drew plain
 * text lines with no avatar or trailing chevron, so the card visibly reflowed as
 * the real rows landed.
 */
export const StaffingSkeleton = ({ count = 5 }: { count?: number }) => (
  <View style={{ paddingTop: 16 }}>
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Skeleton width={40} height={40} radius="full" />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <Skeleton width="55%" height={13} radius="sm" />
        <Skeleton width="35%" height={11} radius="sm" />
      </View>
      <Skeleton width={64} height={30} radius="full" />
    </View>

    <View
      style={{
        marginTop: 16,
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
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: '#F3F4F6',
          }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={120} height={13} radius="sm" phase={i} />
            <Skeleton width={90} height={11} radius="sm" phase={i} />
          </View>
          <Skeleton width={18} height={18} radius="sm" phase={i} />
        </View>
      ))}
    </View>
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

/**
 * Matches the shell shared by all three role profile pages
 * (`components/profile-page/main/Student|Teacher|Admin.tsx`): the centred header
 * block, one full-width info card, then the settings card.
 *
 * One shape covers all three because they read the same `/auth/me` payload and
 * render the same three things; only the bits between the header and the
 * settings card are role-specific (Teacher's class-teacher banner and subject
 * list, Admin's stat cards), and those are conditional, so standing in for them
 * would misrepresent two of the three pages.
 *
 * Geometry is transcribed from `ProfileHeader`, `Student`'s `InfoRow` and
 * `SettingsSection` rather than approximated, so the swap to real content does
 * not reflow.
 */
export const ProfileSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <View>
    {/* ProfileHeader: items-center pt-6 pb-8. */}
    <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 32 }}>
      <SkeletonCircle size={96} />
      <Skeleton width={140} height={20} radius="sm" style={{ marginTop: 12 }} />
      <Skeleton width={64} height={22} radius="full" style={{ marginTop: 4 }} />
      <Skeleton width={180} height={13} radius="sm" style={{ marginTop: 8 }} />
    </View>

    {/* The info card. Rows are px-4 py-3 with a divider between them; the label
        widths alternate only so the block does not read as a printed grid. */}
    <View style={profileCard}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: i === rows - 1 ? 0 : 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <SkeletonRow
            labelWidth={i % 2 === 0 ? 88 : 104}
            valueWidth={64}
            phase={i}
          />
        </View>
      ))}
    </View>

    {/* SettingsSection: mt-6 mx-4, two rows of px-4 py-4 — an icon and a label,
        the second row being the shorter "Logout". */}
    <View style={[profileCard, { marginTop: 24 }]}>
      {['change-password', 'logout'].map((key, i) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: i === 1 ? 0 : 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <Skeleton width={18} height={18} radius="sm" phase={i} />
          <Skeleton
            width={i === 0 ? 128 : 64}
            height={14}
            radius="sm"
            phase={i}
            style={{ marginLeft: 12 }}
          />
        </View>
      ))}
    </View>
  </View>
);

/** `mx-4 bg-white rounded-2xl border border-gray-100` — the profile cards. */
const profileCard: ViewStyle = {
  marginHorizontal: 16,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#F3F4F6',
  overflow: 'hidden',
};

// Re-exported so screens can pull every skeleton from one module.
export { SkeletonList, SkeletonStatRow, Skeleton, SkeletonCard, SkeletonCircle, SkeletonText, RADIUS };
