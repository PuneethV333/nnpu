import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminDashboard } from '@/hooks/useDashboard';
import { useLatestAnnouncements } from '@/hooks/useAnnouncements';
import { DayTypeChip } from '@/components/DayTypeChip';
import { StatsRow } from '@/components/home/StatsRow';
import { OverviewCards } from '@/components/home/OverviewCards';
import { QuickActions } from '@/components/home/QuickActions';
import { AnnouncementsSection } from '@/components/home/AnnouncementsSection';
import { formatLongDay, greetingFor, parseDayKey } from '@/lib/date';

/**
 * The admin home — the web counterpart of
 * `app/components/home/main/Admin.tsx`, in the same order: greeting, school
 * counts, today's day type, Overview, Quick actions, Announcements.
 *
 * Two deliberate differences from the phone:
 *
 *  - The "Today: Working" chip and the hero date both come from
 *    `/dashboard/admin`'s `today`, which is resolved in the SCHOOL's timezone
 *    (`zonedToday()`), instead of from a second `/calendar` call for today
 *    only. Same source of truth, one fewer request, and it cannot disagree
 *    with the attendance figures below it.
 *  - "Overview" and "Upcoming events" use the width available instead of
 *    stacking, because a 1200px column of four full-width cards is a lot of
 *    scrolling for four numbers.
 */
export default function HomePage() {
  usePageTitle('Home');

  const { user, role } = useAuth();
  const isAdmin = role === 'Admin';

  const dashboardQuery = useAdminDashboard();
  const announcementsQuery = useLatestAnnouncements();

  const dashboard = dashboardQuery.data;
  const today = dashboard?.today;

  // The server's day when we have it, this browser's day until then. Parsed
  // from the `YYYY-MM-DD` key by parts — `new Date('2026-10-30')` is UTC
  // midnight, which renders as the 29th west of Greenwich.
  const todayDate = today ? parseDayKey(today.date) : new Date();

  const name = user?.details?.name ?? '';

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">
            {greetingFor(todayDate)}
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-[-0.02em] text-primary sm:text-[28px]">
            {name || 'Welcome back'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[13px] text-muted-foreground">
            {formatLongDay(todayDate)}
          </p>
          {today?.type && <DayTypeChip type={today.type} />}
        </div>
      </header>

      {isAdmin ? (
        <>
          <StatsRow school={user?.school ?? null} />

          <section aria-labelledby="overview-heading">
            <h2
              id="overview-heading"
              className="mb-3 text-base font-semibold text-primary"
            >
              Overview
            </h2>
            <OverviewCards
              dashboard={dashboard}
              isLoading={dashboardQuery.isLoading}
              isError={dashboardQuery.isError}
              onRetry={() => void dashboardQuery.refetch()}
            />
          </section>

          <section aria-labelledby="quick-actions-heading">
            <h2
              id="quick-actions-heading"
              className="mb-3 text-base font-semibold text-primary"
            >
              Quick actions
            </h2>
            <QuickActions />
          </section>

          <AnnouncementsSection
            announcements={announcementsQuery.data ?? []}
            isLoading={announcementsQuery.isLoading}
            isError={announcementsQuery.isError}
          />
        </>
      ) : (
        <div className="rounded-3xl border border-border bg-card px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid size-11 place-items-center rounded-full bg-accent-soft text-accent"
          >
            <Clock className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-primary">
            Your home is on the way
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The {role?.toLowerCase()} home is not built yet — the admin
            dashboard came first. Your attendance, marks and timetable will
            appear here once it is.
          </p>
          <Link
            to="/notifications"
            className="mt-5 inline-flex h-10 items-center rounded-xl border border-border px-4 text-[13px] font-semibold text-label transition-colors hover:bg-muted"
          >
            See notifications
          </Link>
        </div>
      )}
    </div>
  );
}
