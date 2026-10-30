import { SchoolLogo } from '@/components/SchoolLogo';
import { cn } from '@/lib/cn';

/**
 * Shown while the stored session is being validated. Deliberately not a blank
 * page: the app learned this the hard way (see app/(auth)/_layout.tsx, which
 * used to return `null` and leave a white screen on every cold start).
 */
export const BootScreen = ({ message = 'Checking your session…' }) => (
  <div className="grid min-h-dvh place-items-center bg-background px-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <SchoolLogo className="size-14 animate-pulse" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  </div>
);

export const BootScreenInline = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'flex items-center gap-3 text-sm font-medium text-muted-foreground',
      className,
    )}
  >
    <SchoolLogo className="size-9 animate-pulse" />
    Checking your session…
  </div>
);
