import { Link } from 'react-router-dom';
import { AnnouncementCard } from '@/components/home/AnnouncementCard';
import { Skeleton } from '@/components/Skeleton';
import type { LatestAnnouncement } from '@/types/announcement';

/**
 * The five newest announcements the signed-in user may see, as a grid.
 *
 * The app scrolls these horizontally because a phone has one column; at this
 * width the same five fit in a row of three and a row of two, so nothing is
 * hidden behind a gesture that a mouse does not make.
 */
export const AnnouncementsSection = ({
  announcements,
  isLoading,
  isError,
}: {
  announcements: LatestAnnouncement[];
  isLoading: boolean;
  isError: boolean;
}) => (
  <section aria-labelledby="announcements-heading">
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2
        id="announcements-heading"
        className="text-base font-semibold text-primary"
      >
        Announcements
      </h2>
      <Link
        to="/announcements"
        className="text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
      >
        See all
      </Link>
    </div>

    {isLoading ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-muted bg-card p-4">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-5/6" />
            <div className="mt-4 flex items-center gap-2">
              <Skeleton className="size-[22px] rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    ) : isError ? (
      <div className="rounded-2xl border border-muted bg-card px-4 py-6 text-center">
        <p className="text-[13px] text-muted-foreground">
          Couldn’t load announcements.
        </p>
      </div>
    ) : announcements.length === 0 ? (
      <div className="rounded-2xl border border-muted bg-card px-4 py-6 text-center">
        <p className="text-[13px] text-muted-foreground">
          No announcements yet.
        </p>
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {announcements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>
    )}
  </section>
);
