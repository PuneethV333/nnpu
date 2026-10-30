import { ANNOUNCEMENT_TYPE_COPY } from '@/lib/announcementType';
import type { LatestAnnouncement } from '@/types/announcement';

/**
 * One announcement, at the app's card size and radii
 * (`app/src/style/AnnouncementCard.ts`: 16px radius, 14px bold title, 12px body,
 * 22px author avatar), but in a grid cell instead of a fixed 240×180 tile.
 *
 * The fill is white rather than the app's `#F9FAFB`, because the web page
 * background is that same gray — a gray card on a gray page is only its 1px
 * border away from invisible.
 *
 * The author avatar fallback uses the accent, not the indigo (`#E0E7FF` /
 * `#4338CA`) the phone uses here. That pair breaks the app's own stated rule
 * — "one accent for the whole app" (`constants/theme.ts`) — and the same
 * component already uses the accent on the home header.
 */
export const AnnouncementCard = ({
  announcement,
}: {
  announcement: LatestAnnouncement;
}) => {
  const { label, color } = ANNOUNCEMENT_TYPE_COPY[announcement.type];
  const initial = announcement.name
    ? announcement.name.charAt(0).toUpperCase()
    : '?';

  return (
    <article className="flex h-full flex-col rounded-2xl border border-muted bg-card p-4">
      <span
        className="self-start rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {label}
      </span>

      <h3 className="mt-2.5 line-clamp-2 text-sm leading-snug font-bold text-primary">
        {announcement.title}
      </h3>
      <p className="mt-1 mb-3 line-clamp-3 text-xs leading-[17px] text-muted-foreground">
        {announcement.body}
      </p>

      <div className="mt-auto flex items-center gap-2">
        {announcement.profilePic ? (
          <img
            src={announcement.profilePic}
            alt=""
            className="size-[22px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[22px] shrink-0 place-items-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent"
          >
            {initial}
          </span>
        )}
        <span className="truncate text-xs font-medium text-label">
          {announcement.name}
        </span>
      </div>
    </article>
  );
};
