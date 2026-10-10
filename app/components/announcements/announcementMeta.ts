import type {
  AnnouncementAudience,
  AnnouncementType,
} from '@/src/types/announcement';

export const TYPE_COPY: Record<AnnouncementType, { label: string; color: string }> = {
  Holiday: { label: 'Holiday', color: '#D97706' },
  TimetableUpdate: { label: 'Timetable', color: '#2563EB' },
  ResultUpdate: { label: 'Results', color: '#16A34A' },
  Normal: { label: 'Announcement', color: '#6B7280' },
};

export const TYPE_ORDER: AnnouncementType[] = [
  'Normal',
  'Holiday',
  'TimetableUpdate',
  'ResultUpdate',
];

export const AUDIENCE_COPY: Record<AnnouncementAudience, { label: string; hint: string }> = {
  Global: { label: 'Everyone', hint: 'Visible to every school.' },
  School: { label: 'My school', hint: 'Visible to everyone in your school.' },
  Section: { label: 'One section', hint: 'Visible only to students and teachers of a single section.' },
};

export const AUDIENCE_ORDER: AnnouncementAudience[] = ['School', 'Section', 'Global'];
