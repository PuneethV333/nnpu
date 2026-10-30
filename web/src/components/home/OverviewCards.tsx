import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { DayTypeChip } from '@/components/DayTypeChip';
import { Skeleton } from '@/components/Skeleton';
import { formatEventDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import type { AdminDashboard } from '@/types/dashboard';

/**
 * The Overview block: three figures and the calendar ahead.
 *
 * Card geometry is the app's `dashCard` (`app/src/style/Admin.ts`): 14px
 * radius, `#F3F4F6` border, 13px muted title, 20px bold value, 12px faint
 * subtext. The attendance card adds a progress bar, which the phone does not
 * need — "14/26" is legible at any width, "14/26 · 53.85% marked" is not.
 */

const MetricCard = ({
  title,
  value,
  sub,
  children,
}: {
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="rounded-[14px] border border-muted bg-card px-4 py-3.5">
    <p className="text-[13px] text-muted-foreground">{title}</p>
    <p className="mt-1 text-xl font-bold text-primary tabular-nums">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-subtle">{sub}</p>}
    {children}
  </div>
);

const LoadingRows = () => (
  <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-[14px] border border-muted bg-card px-4 py-3.5"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2.5 h-6 w-16" />
        </div>
      ))}
    </div>
    <div className="rounded-[14px] border border-muted bg-card px-4 py-3.5">
      <Skeleton className="h-3 w-28" />
      <div className="mt-3 space-y-2.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  </div>
);

const UpcomingEvents = ({
  events,
}: {
  events: AdminDashboard['upcomingEvents'];
}) => (
  <div className="rounded-[14px] border border-muted bg-card px-4 py-3.5">
    <p className="text-[13px] text-muted-foreground">Upcoming events</p>
    {events.length === 0 ? (
      <p className="mt-2 text-xs text-subtle">
        Nothing on the calendar — no holidays, exams or events ahead.
      </p>
    ) : (
      <ul className="mt-1">
        {events.map((event) => (
          <li
            key={`${event.date.toISOString()}-${event.type}`}
            className="flex items-center justify-between gap-4 border-b border-muted py-2.5 last:border-b-0 last:pb-0"
          >
            <p className="min-w-0 truncate text-sm text-primary">
              {event.label ?? event.type}
              <span className="text-subtle"> · </span>
              <span className="text-muted-foreground">
                {formatEventDate(event.date)}
              </span>
            </p>
            <DayTypeChip type={event.type} />
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const OverviewCards = ({
  dashboard,
  isLoading,
  isError,
  onRetry,
}: {
  dashboard: AdminDashboard | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) => {
  if (isLoading) return <LoadingRows />;

  if (isError || !dashboard) {
    return (
      <div className="rounded-[14px] border border-destructive-border bg-destructive-soft px-4 py-3.5">
        <p className="text-[13px] font-medium text-destructive-strong">
          Couldn’t load the dashboard figures.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-destructive-strong underline underline-offset-2 hover:no-underline"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const { attendanceToday, fees } = dashboard;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Attendance today"
          value={`${attendanceToday.marked}/${attendanceToday.totalStudents}`}
          sub={`${attendanceToday.percentage}% marked`}
        >
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, attendanceToday.percentage))}%`,
              }}
            />
          </div>
        </MetricCard>

        <MetricCard
          title="Teachers"
          value={dashboard.totalTeachers.toLocaleString('en-IN')}
          sub="Active staff"
        />

        <MetricCard
          title="Pending fees"
          value={formatMoney(fees.amountPending)}
          sub={`${fees.pendingInvoices} invoice${fees.pendingInvoices === 1 ? '' : 's'} pending`}
        />
      </div>

      <UpcomingEvents events={dashboard.upcomingEvents} />
    </div>
  );
};
