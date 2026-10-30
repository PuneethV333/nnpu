import type { CurrentUser } from '@/types/auth';
import { cn } from '@/lib/cn';

type Props = {
  school: CurrentUser['school'];
};

/**
 * The four headline counts, straight off `/auth/me`.
 *
 * These are live `count()`s on the server, not the `School.noOfStudents`
 * columns — those were only ever written by the seed script, so they froze at
 * the seeded values and no longer described the school.
 *
 * The gender tiles are conditional because the API always answers `null` for
 * them: `User` has no gender column, so the old seeded 50/50 split was
 * invented. Showing "Boys 0 / Girls 0" would be worse than showing nothing.
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
        // With only two tiles, four columns would leave half the row empty, so
        // the pair keeps its natural width instead of stretching to fill.
        hasGenderStats ? 'sm:grid-cols-4 sm:gap-4' : 'max-w-md',
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-muted bg-card px-4 py-4 text-center"
        >
          <dd className="text-2xl font-bold text-primary tabular-nums">
            {stat.value.toLocaleString('en-IN')}
          </dd>
          <dt className="mt-1 text-xs text-muted-foreground">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
};
