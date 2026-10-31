import { Link } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type Action = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** The app's per-action colour (`components/home/QuickActions.tsx`). */
  color: string;
};

/**
 * Same four actions, labels and colours as the app's admin home.
 *
 * "Enter marks" is absent there on purpose — the marks tab is hidden for
 * admins — and it is absent here for the same reason.
 */
const ACTIONS: Action[] = [
  {
    to: '/attendance',
    label: 'Mark attendance',
    icon: ClipboardCheck,
    color: '#2563EB',
  },
  {
    to: '/announcements',
    label: 'Announcements',
    icon: Megaphone,
    color: '#4F46E5',
  },
  { to: '/fees', label: 'Manage fees', icon: Wallet, color: '#D97706' },
  { to: '/school', label: 'Manage school', icon: Building2, color: '#16A34A' },
];

export const QuickActions = () => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {ACTIONS.map(({ to, label, icon: Icon, color }) => (
      <Link
        key={to}
        to={to}
        className="group flex items-center gap-3 rounded-[14px] border border-muted bg-card p-4 transition-colors hover:border-border hover:bg-surface"
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-[10px]"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="text-[13px] font-semibold text-primary">{label}</span>
        <ChevronRight
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    ))}
  </div>
);
