import type { DayType } from '@/types/calendar';

/**
 * One colour per calendar day type, from `app/constants/dayTypeColor.ts`.
 *
 * These are not theme colours: they are a categorical scale, and the app picks
 * them per day type so a Holiday is amber on the chip and on every event pill
 * that names one. Keep them identical to the app or the same day reads as two
 * different things on the two clients.
 *
 * They are used as `text` colour and, at 10% opacity (`<color>1A`), as the pill
 * background — which is why they are hex literals rather than Tailwind tokens.
 */
export const DAY_TYPE_COLOR: Record<DayType, string> = {
  Working: '#16A34A',
  Holiday: '#D97706',
  Weekend: '#6B7280',
  Event: '#2563EB',
  Exam: '#4F46E5',
};

export const dayTypeTint = (type: DayType): string =>
  `${DAY_TYPE_COLOR[type]}1A`;
