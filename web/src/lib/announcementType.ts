import type { AnnouncementType } from '@/types/announcement';

/**
 * Display copy for the announcement enum, from
 * `app/components/announcements/announcementMeta.ts`.
 *
 * The enum values are storage names (`TimetableUpdate`), and the app shows
 * short words instead. The colours are categorical badges, drawn from the same
 * set as the day-type chips so a "Holiday" announcement is the same amber as a
 * holiday on the calendar.
 */
export const ANNOUNCEMENT_TYPE_COPY: Record<
  AnnouncementType,
  { label: string; color: string }
> = {
  Holiday: { label: 'Holiday', color: '#D97706' },
  TimetableUpdate: { label: 'Timetable', color: '#2563EB' },
  ResultUpdate: { label: 'Results', color: '#16A34A' },
  Normal: { label: 'Announcement', color: '#6B7280' },
};
