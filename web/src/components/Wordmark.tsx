import { cn } from '@/lib/cn';

type Props = {
  /** `default` on light surfaces, `inverse` on top of the photo. */
  tone?: 'default' | 'inverse';
  /**
   * `stacked` is the login's lockup — the 26px title with the uppercase
   * descriptor under it. `inline` is the one-line version for the top bar,
   * where a 26px poster next to nav links would shout louder than the page.
   */
  variant?: 'stacked' | 'inline';
  className?: string;
};

/**
 * "NNPU academy", matching the app's login title (`fontSize: 26,
 * fontWeight: '700'`, app/src/style/login.ts) with "academy" carrying the
 * accent.
 *
 * "NNPU" is plain `primary` rather than the accent: the app's own title is
 * white on the photo, and the accent is reserved for one element per view, so
 * in the top bar it belongs to the bell and the active nav link.
 */
export const Wordmark = ({
  tone = 'default',
  variant = 'stacked',
  className,
}: Props) => {
  const accentClass = tone === 'default' ? 'text-accent' : 'text-white/85';

  if (variant === 'inline') {
    return (
      <p
        className={cn(
          'text-[16px] leading-none font-bold tracking-[-0.02em]',
          tone === 'default' ? 'text-primary' : 'text-white',
          className,
        )}
      >
        NNPU <span className={accentClass}>academy</span>
      </p>
    );
  }

  return (
    <div className={cn('leading-none', className)}>
      <p
        className={cn(
          'text-[26px] font-bold tracking-[-0.02em]',
          tone === 'default' ? 'text-primary' : 'text-white',
        )}
      >
        NNPU <span className={accentClass}>academy</span>
      </p>
      <p
        className={cn(
          'mt-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase',
          tone === 'default' ? 'text-muted-foreground' : 'text-white/70',
        )}
      >
        School management system
      </p>
    </div>
  );
};
