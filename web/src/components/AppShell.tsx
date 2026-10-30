import { Link, NavLink, Outlet } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/cn';

/**
 * The frame every signed-in screen sits in.
 *
 * Top bar, then content, then a quiet footer. The bar is where the crest and
 * wordmark live for the whole session, so individual screens do not each
 * re-draw a brand lockup and drift apart.
 *
 * Nav is Admin-shaped for now, because `/dashboard/admin` is the only home
 * that exists; a Teacher or Student gets the bar without links rather than
 * links to screens they cannot use. Role-specific nav arrives with the
 * role-specific homes, the same split as `app/(tabs)/_layout.tsx`.
 */
const ADMIN_NAV = [
  { to: '/home', label: 'Home' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/fees', label: 'Fees' },
  { to: '/school', label: 'School' },
];

export const AppShell = () => {
  const { user, role, logout } = useAuth();
  const notifications = useNotifications();

  const unread = (notifications.data ?? []).filter((n) => !n.isRead).length;
  const name = user?.details?.name ?? '';
  const profilePic = user?.details?.profilePic ?? null;
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            to="/home"
            className="flex shrink-0 items-center gap-2.5 rounded-lg"
          >
            <SchoolLogo className="size-9" />
            <Wordmark variant="inline" />
          </Link>

          {role === 'Admin' && (
            <nav
              aria-label="Main"
              className="ml-6 hidden items-center gap-1 lg:flex"
            >
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted-foreground hover:bg-muted hover:text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label={
                unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
              }
              className="relative grid size-10 place-items-center rounded-full bg-muted text-label transition-colors hover:bg-border"
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute top-[9px] right-[9px] size-2 rounded-full bg-destructive ring-2 ring-card" />
              )}
            </Link>

            <div className="hidden items-center gap-2.5 border-l border-border py-1 pl-3 sm:flex">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-[15px] font-semibold text-accent"
                >
                  {initial}
                </span>
              )}
              <div className="hidden leading-tight sm:block">
                <p className="max-w-[12rem] truncate text-[13px] font-semibold text-primary">
                  {name || 'Signed in'}
                </p>
                <p className="text-[11px] text-muted-foreground">{role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
        <p className="border-t border-border pt-4 text-xs text-subtle">
          © 2026 NNPU Academy
        </p>
      </footer>
    </div>
  );
};
