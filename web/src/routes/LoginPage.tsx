import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ZodError } from 'zod';
import {
  ArrowBigUp,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  IdCard,
  LoaderCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errorMessage';
import { cn } from '@/lib/cn';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Wordmark } from '@/components/Wordmark';
import { BootScreen } from '@/components/BootScreen';
import backgroundImage from '@/assets/home-backGround.webp';

/**
 * Sign-in screen for the web app.
 *
 * The styling is the app's login screen (app/src/style/login.ts), measured out
 * rather than reinvented: a full-bleed school photo behind a #0F172A scrim, a
 * white card at 24px radius, #F9FAFB input rows at 12px radius with #E5E7EB
 * borders, and a #2563EB button at 50px with white text and a blue shadow.
 *
 * The only structural change is for a wide screen: the photo and the card sit
 * in two columns instead of stacked, and re-join into the app's single-column
 * shape below `lg`.
 */
export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  usePageTitle('Sign in');

  const idInputId = useId();
  const passwordInputId = useId();
  const helperId = useId();
  const errorId = useId();

  const [authId, setAuthId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Whether the message describes the fields themselves, so they can be
   * outlined red. Kept separate from `error`'s text on purpose: a 429 or a
   * network failure is not the fields' fault, and marking them red would say
   * that it is.
   */
  const [fieldError, setFieldError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const idInputRef = useRef<HTMLInputElement>(null);

  /**
   * Where to land after signing in.
   *
   * `RequireAuth` records the page that was asked for in router state, so a
   * link into a deep page comes back to it instead of dumping the user on the
   * home page. The value is checked to be a same-site path: `//host` and
   * `/\host` are both treated as protocol-relative by browsers, and honouring
   * either would turn this into an open redirect.
   */
  const location = useLocation();
  const requested = (location.state as { from?: string } | null)?.from;
  const destination =
    requested && /^\/(?![/\\])/.test(requested) ? requested : '/home';

  /**
   * Only autofocus where there is a real keyboard and a pointer. On a phone
   * this would throw the keyboard up over the layout before the page has even
   * painted.
   */
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (fine.matches) idInputRef.current?.focus();
  }, []);

  if (isLoading) return <BootScreen message="Checking your session…" />;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setFieldError(false);

    const trimmedId = authId.trim();

    if (!trimmedId || !password) {
      setError('Enter both your School ID and password.');
      setFieldError(true);
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedId, password);
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 401) {
          // The backend answers 401 for a wrong ID, a wrong password and a
          // deactivated account, and deliberately does not say which. Keep it
          // that way — naming which half was wrong turns this into a way to
          // enumerate valid School IDs.
          setError('Invalid ID or password.');
          setFieldError(true);
        } else if (status === 429) {
          // Prefer the server's wording: the two 429s mean different things
          // (per-ID lockout vs. per-IP rate limit) and it says which.
          setError(
            errorMessage(
              err,
              'Too many attempts. Wait a moment and try again.',
            ),
          );
        } else if (status === undefined) {
          setError("Couldn't reach the server. Check your connection.");
        } else {
          setError(errorMessage(err, "Couldn't sign in. Try again."));
        }
      } else if (err instanceof ZodError) {
        // The server answered with a shape this build does not understand, so
        // "try again" would be a lie.
        setError('Sign-in response was unexpected. Please try again.');
      } else {
        setError("Couldn't sign in. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Editing a field clears the previous verdict on it. */
  const clearError = () => {
    if (!error) return;
    setError(null);
    setFieldError(false);
  };

  const fieldClass = cn(
    'autofill-field h-12 w-full rounded-xl border border-border bg-field text-[15px] font-medium text-foreground transition',
    'placeholder:font-normal placeholder:text-muted-foreground',
    'focus:border-accent focus:ring-[3px] focus:ring-accent/20 focus:outline-none',
    'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/10 aria-invalid:focus:ring-destructive/15',
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-2">
      {/* ---------- Brand panel (wide screens) ---------- */}
      <aside className="relative hidden overflow-hidden bg-scrim lg:block">
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 size-full animate-settle object-cover object-center"
        />
        {/*
          The app's own overlay, in order: a mid scrim, then a gradient that
          deepens towards the bottom (rgba(15,23,42) at 0.25 → 0.15 → 0.75).
        */}
        <div className="absolute inset-0 bg-scrim/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/20 to-scrim/30" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3.5">
            <SchoolLogo tone="glass" className="size-16" />
            <Wordmark tone="inverse" />
          </div>

          <div>
            <div className="mt-8 h-px w-14 bg-accent" />
            <p className="mt-6 text-xs text-white/60">© 2026 NNPU Academy</p>
          </div>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="relative flex flex-1 flex-col px-5 pb-12 sm:px-10 lg:justify-center lg:px-16">
        {/* Photo band, phone only — the app's login, cropped to a header. */}
        <div className="relative -mx-5 h-48 overflow-hidden bg-scrim sm:-mx-10 lg:hidden">
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 size-full animate-settle object-cover object-center"
          />
          <div className="absolute inset-0 bg-scrim/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/20 to-scrim/30" />
          {/* Bottom padding leaves room for the card that overlaps this band —
              the wordmark must sit fully above the card's top edge. */}
          <div className="relative flex h-full items-end px-6 pt-6 pb-16">
            <div className="flex items-center gap-3">
              <SchoolLogo tone="glass" className="size-11" />
              <Wordmark tone="inverse" />
            </div>
          </div>
        </div>

        {/* `my-auto` on phones/tablets so the card centres in the space under
            the photo band instead of hugging it; on `lg` the column itself is
            centred and this is inert. */}
        <div className="my-auto w-full">
          <div className="relative z-10 mx-auto -mt-10 w-full max-w-[26rem] animate-rise lg:mt-0">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_8px_16px_rgba(0,0,0,0.15)] sm:p-7">
              <h1 className="text-[22px] font-bold tracking-[-0.01em] text-primary">
                Sign in
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Use the School ID and password you were given.
              </p>

              <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
                <div>
                  <label
                    htmlFor={idInputId}
                    className="mb-1.5 block text-[13px] font-semibold text-label"
                  >
                    School ID
                  </label>

                  <div className="relative">
                    <IdCard
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-subtle"
                    />
                    <input
                      ref={idInputRef}
                      id={idInputId}
                      name="authId"
                      type="text"
                      value={authId}
                      onChange={(e) => {
                        setAuthId(e.target.value);
                        clearError();
                      }}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-invalid={fieldError}
                      aria-describedby={`${helperId} ${error ? errorId : ''}`.trim()}
                      placeholder="Enter your ID"
                      className={cn(fieldClass, 'pr-4 pl-11')}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor={passwordInputId}
                      className="block text-[13px] font-semibold text-label"
                    >
                      Password
                    </label>
                    {capsLock && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                        <ArrowBigUp className="size-3.5" aria-hidden="true" />
                        Caps Lock is on
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-subtle"
                    />
                    <input
                      id={passwordInputId}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      onKeyDown={(e) =>
                        setCapsLock(e.getModifierState('CapsLock'))
                      }
                      onKeyUp={(e) =>
                        setCapsLock(e.getModifierState('CapsLock'))
                      }
                      onBlur={() => setCapsLock(false)}
                      autoComplete="current-password"
                      spellCheck={false}
                      aria-invalid={fieldError}
                      aria-describedby={error ? errorId : undefined}
                      placeholder="Enter password"
                      className={cn(fieldClass, 'pr-12 pl-11')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                      className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-subtle transition hover:bg-muted hover:text-muted-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-[18px]" />
                      ) : (
                        <Eye className="size-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-destructive-border bg-destructive-soft px-3 py-2.5 text-[13px] leading-snug font-medium text-destructive-strong"
                  >
                    <CircleAlert
                      className="mt-px size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'group mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-white transition duration-150',
                    'shadow-[0_4px_8px_rgba(37,99,235,0.3)] hover:bg-accent-strong',
                    'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
                  )}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Can’t get in? Ask your class teacher to reset your password.
                  Passwords can’t be recovered — only reset.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
              © 2026 NNPU Academy
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
