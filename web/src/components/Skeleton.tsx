import { cn } from '@/lib/cn';

/**
 * A grey block standing in for content while it loads.
 *
 * One shared primitive rather than per-screen placeholders: the shape has to
 * match the real block's height, otherwise the page jumps when data lands,
 * and that is only easy to keep true if there is a single place to change it.
 */
export const Skeleton = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={cn('animate-pulse rounded-lg bg-border', className)}
  />
);
