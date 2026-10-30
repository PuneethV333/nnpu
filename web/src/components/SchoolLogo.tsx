import { cn } from '@/lib/cn';
import logo from '@/assets/logo.png';

type Props = {
  className?: string;
  /** `default` on light surfaces, `glass` on top of the photo. */
  tone?: 'default' | 'glass';
};

/**
 * The college crest, from `app/assets/images/icon.png`.
 *
 * The source PNG has a grey checkerboard baked into its pixels (it is opaque —
 * a fake-transparency export, not real alpha), so serving it directly would
 * print a grey grid behind the crest. `web/src/assets/logo.png` is that image
 * with the background removed: the crest's own outline was traced and used as
 * an alpha mask, which also drops the soft drop shadow it was exported with.
 *
 * The crest carries its own rounded corners, so no CSS radius is applied —
 * clipping again would shave its border.
 *
 * `alt` is empty on purpose: every place this appears it sits next to the
 * "NNPU academy" wordmark, which already names the product.
 */
export const SchoolLogo = ({ className, tone = 'default' }: Props) => (
  <img
    src={logo}
    alt=""
    aria-hidden="true"
    draggable={false}
    className={cn(
      'shrink-0 select-none',
      tone === 'glass' && 'ring-1 ring-white/35 ring-offset-0',
      className,
    )}
  />
);
