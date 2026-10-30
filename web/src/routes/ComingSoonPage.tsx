import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SchoolLogo } from '@/components/SchoolLogo';

/**
 * Stand-in for a screen that has not been built yet.
 *
 * Every link on the home page points somewhere real from day one, so a click
 * never dies silently or lands on a blank router outlet. Each of these gets
 * deleted as its screen replaces it.
 */
export default function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  usePageTitle(title);

  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center sm:px-12">
      <SchoolLogo className="mx-auto size-12 opacity-60" />
      <h1 className="mt-5 text-xl font-bold tracking-[-0.01em] text-primary">
        {title} is next
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        to="/home"
        className="mt-6 inline-flex h-10 items-center rounded-xl border border-border px-4 text-[13px] font-semibold text-label transition-colors hover:bg-muted"
      >
        Back to home
      </Link>
    </div>
  );
}
