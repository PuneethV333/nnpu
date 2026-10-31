import type { CurrentUser } from '@/types/auth';
import { cn } from '@/lib/cn';

type Props = {
  school: CurrentUser['school'];
};

/**
 * The school-wide totals, straight off `/auth/me`.
 *
 * These are live `count()`s on the server, not the `School.noOfStudents`
 * columns — those were only ever written by the seed script, so they froze at
 * the seeded values and stopped describing the school.
 *
 * The app centres label-over-number in a 4-across row. Here the cards are wide
 * (half the page), so the label and number sit on one line instead: centred
 * text in a 580px tile is a lot of white around two characters, and this keeps
 * the cards on the same two-column rhythm as the Overview block below.
 *
 * The gender tiles are conditional because the API always answers `null`:
 * `User` has no gender column, so the old seeded 50/50 split was invented.
 * "Boys 0 / Girls 0" would be worse than showing nothing.
 */
export const StatsRow = ({ school }: Props) => {
  const hasGenderStats = school?.noOfBoys != null || school?.noOfGirls != null;

  const stats = [
    { label: 'Students', value: school?.noOfStudents ?? 0 },
    { label: 'Teachers', value: school?.noOfTeacher ?? 0 },
    ...(hasGenderStats
      ? [
          { label: 'Boys', value: school?.noOfBoys ?? 0 },
          { label: 'Girls', value: school?.noOfGirls ?? 0 },
        ]
      : []),
  ];

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-3',
        hasGenderStats && 'sm:grid-cols-4',
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center justify-between gap-3 rounded-2xl border border-muted bg-card px-5 py-4"
        >
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="text-2xl font-bold text-primary tabular-nums">
            {stat.value.toLocaleString('en-IN')}
          </dd>
        </div>
      ))}
    </dl>
  );
};
