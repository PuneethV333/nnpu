import { cn } from '@/lib/cn';
import { DAY_TYPE_COLOR, dayTypeTint } from '@/lib/dayType';
import type { DayType } from '@/types/calendar';

/**
 * The day-type pill: "Working", "Holiday", "Exam"…
 *
 * Background is the type's own colour at 10% and the label is the full colour,
 * which is the app's chip recipe (`Admin.ts` `eventPill`, `dayChip`). Inline
 * styles rather than Tailwind classes because the colour is data — five
 * literals in a `Record` — not a fixed set of class names.
 */
export const DayTypeChip = ({
  type,
  className,
}: {
  type: DayType;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
      className,
    )}
    style={{ backgroundColor: dayTypeTint(type), color: DAY_TYPE_COLOR[type] }}
  >
    {type}
  </span>
);
